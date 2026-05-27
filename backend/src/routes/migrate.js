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

        // Check if student already exists by email OR by first/last name
        let existingStudent = null;
        if (cleanEmail) {
          const resEmail = await pool.query(
            'SELECT id, program, drive_link, admin_notes, raw_jotform_payload FROM students WHERE email = $1',
            [cleanEmail]
          );
          if (resEmail.rows.length > 0) {
            existingStudent = resEmail.rows[0];
          }
        }

        if (!existingStudent && s.first_name && s.last_name) {
          const resName = await pool.query(
            'SELECT id, program, drive_link, admin_notes, raw_jotform_payload FROM students WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1)) AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))',
            [s.first_name, s.last_name]
          );
          if (resName.rows.length > 0) {
            existingStudent = resName.rows[0];
          }
        }

        if (existingStudent) {
          // Merge program
          const existingProgram = existingStudent.program;
          let newProgram = s.program;
          if (existingProgram && newProgram && existingProgram !== newProgram && !existingProgram.includes(newProgram)) {
            newProgram = `${existingProgram} & ${newProgram}`;
          } else if (existingProgram) {
            newProgram = existingProgram;
          }

          // Merge drive link
          let mergedDriveLink = existingStudent.drive_link;
          if (s.drive_link) {
            if (!mergedDriveLink) {
              mergedDriveLink = s.drive_link;
            } else if (!mergedDriveLink.includes(s.drive_link)) {
              mergedDriveLink = `${mergedDriveLink}, ${s.drive_link}`;
            }
          }

          // Merge admin notes
          let mergedNotes = existingStudent.admin_notes || '';
          if (s.program && existingProgram && existingProgram !== s.program) {
            mergedNotes = `${mergedNotes}\n[SYSTEM: Duplicate application merged for course: ${s.program}]`.trim();
          }

          // Merge JSON payload
          const mergedPayload = {
            ...(existingStudent.raw_jotform_payload || {}),
            ...(s.raw_jotform_payload || {})
          };

          await pool.query(`
            UPDATE students SET
              first_name                  = COALESCE($2, first_name),
              last_name                   = COALESCE($3, last_name),
              middle_name                 = COALESCE($4, middle_name),
              email                       = COALESCE($5, email),
              cell_phone                  = COALESCE($6, cell_phone),
              home_phone                  = COALESCE($7, home_phone),
              date_of_birth               = COALESCE($8, date_of_birth),
              gender                      = COALESCE($9, gender),
              ssn_last4                   = COALESCE($10, ssn_last4),
              address_street              = COALESCE($11, address_street),
              address_city                = COALESCE($12, address_city),
              address_state               = COALESCE($13, address_state),
              address_zip                 = COALESCE($14, address_zip),
              program                     = $15,
              status                      = $16,
              enrollment_date             = COALESCE($17, enrollment_date),
              emergency_contact_name      = COALESCE($18, emergency_contact_name),
              emergency_contact_phone     = COALESCE($19, emergency_contact_phone),
              emergency_contact_relation  = COALESCE($20, emergency_contact_relation),
              highest_education           = COALESCE($21, highest_education),
              high_school_name            = COALESCE($22, high_school_name),
              high_school_grad_year       = COALESCE($23, high_school_grad_year),
              ged_certificate             = COALESCE($24, ged_certificate),
              currently_employed          = COALESCE($25, currently_employed),
              employer_name               = COALESCE($26, employer_name),
              employer_phone              = COALESCE($27, employer_phone),
              funding_source              = COALESCE($28, funding_source),
              financial_aid_status        = COALESCE($29, financial_aid_status),
              scholarship                 = COALESCE($30, scholarship),
              scholarship_name            = COALESCE($31, scholarship_name),
              admin_notes                 = $32,
              drive_link                  = $33,
              photo_url                   = COALESCE($34, photo_url),
              raw_jotform_payload         = $35,
              updated_at                  = NOW()
            WHERE id = $1
          `, [
            existingStudent.id,
            s.first_name, s.last_name, s.middle_name, cleanEmail, s.cell_phone, s.home_phone, s.date_of_birth, s.gender, s.ssn_last4,
            s.address_street, s.address_city, s.address_state, s.address_zip, newProgram, s.status, s.enrollment_date,
            s.emergency_contact_name, s.emergency_contact_phone, s.emergency_contact_relation,
            s.highest_education, s.high_school_name, s.high_school_grad_year, s.ged_certificate,
            s.currently_employed, s.employer_name, s.employer_phone,
            s.funding_source, s.financial_aid_status, s.scholarship, s.scholarship_name,
            mergedNotes, mergedDriveLink, s.photo_url, JSON.stringify(mergedPayload)
          ]);
        } else {
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
          `, [
            s.first_name, s.last_name, s.middle_name, cleanEmail, s.cell_phone, s.home_phone, s.date_of_birth, s.gender, s.ssn_last4,
            s.address_street, s.address_city, s.address_state, s.address_zip, s.program, s.status, s.enrollment_date,
            s.emergency_contact_name, s.emergency_contact_phone, s.emergency_contact_relation,
            s.highest_education, s.high_school_name, s.high_school_grad_year, s.ged_certificate,
            s.currently_employed, s.employer_name, s.employer_phone,
            s.funding_source, s.financial_aid_status, s.scholarship, s.scholarship_name,
            s.admin_notes, s.drive_link, s.photo_url, JSON.stringify(s.raw_jotform_payload)
          ]);
        }

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
