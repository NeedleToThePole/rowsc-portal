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

// ── Admin secret middleware ───────────────────────────────────
const requireAdminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden: invalid admin secret.' });
  }
  next();
};

// ── POST /api/admin/migrate-csv ───────────────────────────────
router.post('/migrate-csv', requireAdminSecret, upload.single('csv'), async (req, res) => {
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

    const headers = records[0].map(h => h ? h.toLowerCase().trim() : '');
    const dataRows = records.slice(1);

    console.log(`📂 CSV migration: ${dataRows.length} rows to process`);

    // Find column indexes dynamically
    const firstNameIdx = headers.findIndex(h => ['first name', 'first_name', 'firstname'].includes(h));
    const lastNameIdx  = headers.findIndex(h => ['last name', 'last_name', 'lastname'].includes(h));
    let emailIdx       = headers.findIndex(h => ['email address', 'email_address'].includes(h));
    if (emailIdx === -1) {
      emailIdx = headers.findIndex(h => h === 'email');
    }
    const courseIdx    = headers.findIndex(h => ['course', 'program'].includes(h)); // first match
    const phoneIdx     = headers.findIndex(h => ['cell phone', 'phone', 'cell_phone', 'cellphone'].includes(h));
    const statusIdx    = headers.findIndex(h => h === 'status' || h === 'enrollment status' || h === 'enrollment_status');
    const notesIdx     = headers.findIndex(h => ['notes', 'admin_notes', 'adminnotes'].includes(h));
    const enrollDateIdx= headers.findIndex(h => ['enrollment date', 'enrollment_date', 'date'].includes(h));

    for (const row of dataRows) {
      try {
        const firstName = firstNameIdx !== -1 ? row[firstNameIdx] : '';
        const lastName  = lastNameIdx !== -1 ? row[lastNameIdx] : '';
        const email     = emailIdx !== -1 ? row[emailIdx] : null;
        const program   = (courseIdx !== -1 && row[courseIdx]) ? row[courseIdx] : 'Undeclared';
        const phone     = phoneIdx !== -1 ? row[phoneIdx] : null;
        const status    = (statusIdx !== -1 && row[statusIdx]) ? row[statusIdx] : 'Active';
        const notes     = notesIdx !== -1 ? row[notesIdx] : null;
        const enrollDate= enrollDateIdx !== -1 ? row[enrollDateIdx] : null;

        // Scan columns for all Google Drive and bit.ly URLs
        const driveLinks = [];
        for (const cell of row) {
          if (cell && typeof cell === 'string') {
            const parts = cell.split(',').map(p => p.trim());
            for (const p of parts) {
              if (p.includes('drive.google.com') || p.includes('bit.ly/')) {
                driveLinks.push(p);
              }
            }
          }
        }
        const driveLink = driveLinks.length > 0 ? driveLinks.join(', ') : null;

        // Build raw payload object using headers
        const rawPayload = {};
        headers.forEach((h, i) => {
          if (h && row[i]) {
            rawPayload[h] = row[i];
          }
        });

        if (!firstName && !lastName) {
          results.skipped++;
          continue;
        }

        // We clean emails to avoid conflicts
        const cleanEmail = email && email.trim() ? email.trim() : null;

        await pool.query(`
          INSERT INTO students (
            first_name, last_name, email, cell_phone,
            program, status, drive_link, admin_notes,
            enrollment_date, intake_source, raw_jotform_payload
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'csv_import',$10)
          ON CONFLICT (email) DO UPDATE SET
            first_name   = EXCLUDED.first_name,
            last_name    = EXCLUDED.last_name,
            program      = EXCLUDED.program,
            status       = EXCLUDED.status,
            drive_link   = COALESCE(EXCLUDED.drive_link, students.drive_link),
            admin_notes  = COALESCE(EXCLUDED.admin_notes, students.admin_notes),
            raw_jotform_payload = EXCLUDED.raw_jotform_payload,
            updated_at   = NOW()
        `, [
          firstName, lastName, cleanEmail, phone, program, status, 
          driveLink, notes, enrollDate || null, JSON.stringify(rawPayload)
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
