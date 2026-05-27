// ============================================================
// backend/src/routes/migrate.js
// POST /api/admin/migrate-csv
// Bulk-imports historical student data from CSV files
// Requires ADMIN_SECRET header for authorization
// ============================================================
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { parse } = require('csv-parse');
const pool     = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { extractFieldsFromPayload } = require('../services/jotformMapper');

// Use memory storage (file is not saved to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted.'));
    }
  },
});

// ── POST /api/admin/migrate-csv ───────────────────────────────
router.post('/migrate-csv', authenticateToken, upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded. Use field name "csv".' });
  }

  const results = { inserted: 0, skipped: 0, errors: [] };

  try {
    const records = await new Promise((resolve, reject) => {
      const rows = [];
      const parser = parse(req.file.buffer, {
        columns:          false, // Parse as arrays of values
        skip_empty_lines: true,
        trim:             true,
        bom:              true,
      });
      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) rows.push(record);
      });
      parser.on('error', reject);
      parser.on('end', () => resolve(rows));
    });

    if (records.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or missing data rows.' });
    }

    const headers = records[0];
    const dataRows = records.slice(1);

    console.log(`📂 CSV migration: ${dataRows.length} rows to process`);

    for (const row of dataRows) {
      try {
        // Build payload object using headers
        const rawPayload = {};
        headers.forEach((h, i) => {
          if (h && row[i] !== undefined && row[i] !== null) {
            rawPayload[h] = row[i];
          }
        });

        const s = extractFieldsFromPayload(rawPayload);

        if (!s.first_name && !s.last_name) {
          results.skipped++;
          continue;
        }

        // We clean emails to avoid conflicts
        const cleanEmail = s.email && s.email.trim() ? s.email.trim() : null;

        await pool.query(`
          INSERT INTO students (
            first_name, last_name, middle_name, email, cell_phone, home_phone, date_of_birth, gender, ssn_last4,
            address_street, address_city, address_state, address_zip, program, status, enrollment_date,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
            highest_education, high_school_name, high_school_grad_year, ged_certificate,
            currently_employed, employer_name, employer_phone,
            funding_source, financial_aid_status, scholarship, scholarship_name,
            admin_notes, drive_link, photo_url, intake_source, raw_jotform_payload
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19,
            $20, $21, $22, $23,
            $24, $25, $26,
            $27, $28, $29, $30,
            $31, $32, $33, 'csv_import', $34
          )
          ON CONFLICT (email) DO UPDATE SET
            first_name                  = COALESCE(EXCLUDED.first_name, students.first_name),
            last_name                   = COALESCE(EXCLUDED.last_name, students.last_name),
            middle_name                 = COALESCE(EXCLUDED.middle_name, students.middle_name),
            cell_phone                  = COALESCE(EXCLUDED.cell_phone, students.cell_phone),
            home_phone                  = COALESCE(EXCLUDED.home_phone, students.home_phone),
            date_of_birth               = COALESCE(EXCLUDED.date_of_birth, students.date_of_birth),
            gender                      = COALESCE(EXCLUDED.gender, students.gender),
            ssn_last4                   = COALESCE(EXCLUDED.ssn_last4, students.ssn_last4),
            address_street              = COALESCE(EXCLUDED.address_street, students.address_street),
            address_city                = COALESCE(EXCLUDED.address_city, students.address_city),
            address_state               = COALESCE(EXCLUDED.address_state, students.address_state),
            address_zip                 = COALESCE(EXCLUDED.address_zip, students.address_zip),
            program                     = CASE 
                                            WHEN students.program = EXCLUDED.program THEN students.program
                                            WHEN students.program LIKE '%' || EXCLUDED.program || '%' THEN students.program
                                            ELSE students.program || ' & ' || EXCLUDED.program
                                          END,
            status                      = EXCLUDED.status,
            enrollment_date             = COALESCE(EXCLUDED.enrollment_date, students.enrollment_date),
            emergency_contact_name      = COALESCE(EXCLUDED.emergency_contact_name, students.emergency_contact_name),
            emergency_contact_phone     = COALESCE(EXCLUDED.emergency_contact_phone, students.emergency_contact_phone),
            emergency_contact_relation  = COALESCE(EXCLUDED.emergency_contact_relation, students.emergency_contact_relation),
            highest_education           = COALESCE(EXCLUDED.highest_education, students.highest_education),
            high_school_name            = COALESCE(EXCLUDED.high_school_name, students.high_school_name),
            high_school_grad_year       = COALESCE(EXCLUDED.high_school_grad_year, students.high_school_grad_year),
            ged_certificate             = COALESCE(EXCLUDED.ged_certificate, students.ged_certificate),
            currently_employed          = COALESCE(EXCLUDED.currently_employed, students.currently_employed),
            employer_name               = COALESCE(EXCLUDED.employer_name, students.employer_name),
            employer_phone              = COALESCE(EXCLUDED.employer_phone, students.employer_phone),
            funding_source              = COALESCE(EXCLUDED.funding_source, students.funding_source),
            financial_aid_status        = COALESCE(EXCLUDED.financial_aid_status, students.financial_aid_status),
            scholarship                 = COALESCE(EXCLUDED.scholarship, students.scholarship),
            scholarship_name            = COALESCE(EXCLUDED.scholarship_name, students.scholarship_name),
            admin_notes                 = CASE
                                            WHEN students.program = EXCLUDED.program THEN COALESCE(students.admin_notes, EXCLUDED.admin_notes)
                                            ELSE COALESCE(students.admin_notes, '') || E'\n[SYSTEM: Duplicate application merged for course: ' || EXCLUDED.program || ']'
                                          END,
            drive_link                  = CASE
                                            WHEN students.drive_link IS NULL THEN EXCLUDED.drive_link
                                            WHEN EXCLUDED.drive_link IS NULL THEN students.drive_link
                                            WHEN students.drive_link LIKE '%' || EXCLUDED.drive_link || '%' THEN students.drive_link
                                            ELSE students.drive_link || ', ' || EXCLUDED.drive_link
                                          END,
            photo_url                   = COALESCE(EXCLUDED.photo_url, students.photo_url),
            raw_jotform_payload         = students.raw_jotform_payload || EXCLUDED.raw_jotform_payload,
            updated_at                  = NOW()
        `, [
          s.first_name, s.last_name, s.middle_name, cleanEmail, s.cell_phone, s.home_phone, s.date_of_birth, s.gender, s.ssn_last4,
          s.address_street, s.address_city, s.address_state, s.address_zip, s.program, s.status, s.enrollment_date,
          s.emergency_contact_name, s.emergency_contact_phone, s.emergency_contact_relation,
          s.highest_education, s.high_school_name, s.high_school_grad_year, s.ged_certificate,
          s.currently_employed, s.employer_name, s.employer_phone,
          s.funding_source, s.financial_aid_status, s.scholarship, s.scholarship_name,
          s.admin_notes, s.drive_link, s.photo_url, JSON.stringify(s.raw_jotform_payload)
        ]);

        results.inserted++;
      } catch (rowErr) {
        results.errors.push({ row: results.inserted + results.skipped + 1, error: rowErr.message });
        results.skipped++;
      }
    }

    console.log(`✅ CSV migration complete: ${results.inserted} inserted, ${results.skipped} skipped`);
    res.json({
      message: `Migration complete.`,
      ...results,
      total: dataRows.length,
    });

  } catch (err) {
    console.error('CSV migration error:', err);
    res.status(500).json({ error: 'CSV parsing or database error.', details: err.message });
  }
});

module.exports = router;
