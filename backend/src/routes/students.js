// ============================================================
// backend/src/routes/students.js
// GET /api/students      - list all active students
// POST /api/students     - admin manual entry
// GET /api/students/:id  - single student detail
// ============================================================
const express = require('express');
const router  = express.Router();
const pool    = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

// Ensure uploads folder exists in backend/uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max limit
});

// File upload route
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ fileUrl });
});

// ── GET /api/students ─────────────────────────────────────────
// Returns all active students, sorted by last_name ASC.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, program, status = 'Active', limit = 500, offset = 0 } = req.query;

    let query = `
      SELECT
        id, first_name, last_name, email, cell_phone,
        program, program_category, status, enrollment_date,
        drive_link, intake_source, created_at
      FROM students
      WHERE 1=1
    `;
    const params = [];

    if (status !== 'all') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (
        last_name  ILIKE $${params.length} OR
        first_name ILIKE $${params.length} OR
        email      ILIKE $${params.length} OR
        program    ILIKE $${params.length}
      )`;
    }

    if (program) {
      params.push(program);
      query += ` AND program = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(parseInt(offset));
    query += ` ORDER BY last_name ASC, first_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ students: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('GET /api/students error:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

// ── GET /api/students/:id ─────────────────────────────────────
// Returns full detail for a single student.
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/students/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
});

// ── POST /api/students ────────────────────────────────────────
// Admin manual entry — detailed form.
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      first_name, last_name, middle_name, email, cell_phone, home_phone,
      date_of_birth, gender, ssn_last4,
      address_street, address_city, address_state, address_zip,
      program, program_category, status, enrollment_date,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      highest_education, high_school_name, high_school_grad_year, ged_certificate,
      currently_employed, employer_name, employer_phone,
      funding_source, financial_aid_status, scholarship, scholarship_name,
      background_check_date, background_check_passed,
      drug_test_date, drug_test_passed,
      immunization_complete, hipaa_signed, enrollment_agreement_signed,
      admin_notes, photo_url, drive_link
    } = req.body;

    if (!first_name || !last_name || !program) {
      return res.status(400).json({ error: 'first_name, last_name, and program are required.' });
    }

    const result = await pool.query(`
      INSERT INTO students (
        first_name, last_name, middle_name, email, cell_phone, home_phone,
        date_of_birth, gender, ssn_last4,
        address_street, address_city, address_state, address_zip,
        program, program_category, status, enrollment_date,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        highest_education, high_school_name, high_school_grad_year, ged_certificate,
        currently_employed, employer_name, employer_phone,
        funding_source, financial_aid_status, scholarship, scholarship_name,
        background_check_date, background_check_passed,
        drug_test_date, drug_test_passed,
        immunization_complete, hipaa_signed, enrollment_agreement_signed,
        admin_notes, photo_url, drive_link, intake_source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, 'admin'
      ) RETURNING *
    `, [
      first_name, last_name, middle_name || null, email || null, cell_phone || null, home_phone || null,
      date_of_birth || null, gender || null, ssn_last4 || null,
      address_street || null, address_city || null, address_state || null, address_zip || null,
      program, program_category || null, status || 'Active', enrollment_date || new Date().toISOString().split('T')[0],
      emergency_contact_name || null, emergency_contact_phone || null, emergency_contact_relation || null,
      highest_education || null, high_school_name || null, high_school_grad_year ? parseInt(high_school_grad_year) : null, ged_certificate === 'true' || ged_certificate === true,
      currently_employed === 'true' || currently_employed === true, employer_name || null, employer_phone || null,
      funding_source || null, financial_aid_status || null, scholarship === 'true' || scholarship === true, scholarship_name || null,
      background_check_date || null, background_check_passed === 'true' || background_check_passed === true,
      drug_test_date || null, drug_test_passed === 'true' || drug_test_passed === true,
      immunization_complete === 'true' || immunization_complete === true, hipaa_signed === 'true' || hipaa_signed === true, enrollment_agreement_signed === 'true' || enrollment_agreement_signed === true,
      admin_notes || null, photo_url || null, drive_link || null
    ]);

    res.status(201).json({ student: result.rows[0], message: 'Student created successfully.' });
  } catch (err) {
    if (err.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'A student with that email already exists.' });
    }
    console.error('POST /api/students error:', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
});

// ── PATCH /api/students/:id/drive-link ────────────────────────
router.patch('/:id/drive-link', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { drive_link } = req.body;

    if (!drive_link) {
      return res.status(400).json({ error: 'drive_link URL is required.' });
    }

    // Basic URL validation
    try { new URL(drive_link); } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    const result = await pool.query(
      'UPDATE students SET drive_link = $1 WHERE id = $2 RETURNING id, first_name, last_name, drive_link',
      [drive_link, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({ student: result.rows[0], message: 'Drive link updated successfully.' });
  } catch (err) {
    console.error('PATCH /api/students/:id/drive-link error:', err);
    res.status(500).json({ error: 'Failed to update drive link.' });
  }
});

// ── PATCH /api/students/:id ───────────────────────────────────
// Update any student fields (admin use)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'email', 'cell_phone', 'home_phone',
      'date_of_birth', 'gender', 'ssn_last4',
      'address_street', 'address_city', 'address_state', 'address_zip',
      'program', 'program_category', 'status', 'enrollment_date', 'start_date',
      'expected_graduation_date', 'graduation_date',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
      'highest_education', 'high_school_name', 'high_school_grad_year', 'ged_certificate',
      'currently_employed', 'employer_name', 'employer_phone',
      'funding_source', 'financial_aid_status', 'scholarship', 'scholarship_name',
      'background_check_date', 'background_check_passed',
      'drug_test_date', 'drug_test_passed',
      'immunization_complete', 'hipaa_signed', 'enrollment_agreement_signed',
      'admin_notes', 'photo_url', 'drive_link', 'counselor_name',
      'wioa_enrolled', 'wioa_participant_id', 'wioa_case_manager',
      'veteran_status', 'disability_status', 'homeless_status', 'ex_offender_status',
      'snap_recipient', 'tanf_recipient'
    ];

    const updates = [];
    const values  = [];
    for (const [key, val] of Object.entries(req.body)) {
      if (allowedFields.includes(key)) {
        values.push(val);
        updates.push(`${key} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error('PATCH /api/students/:id error:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

module.exports = router;
