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
// Admin manual entry — minimal required fields.
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      first_name, last_name, email, cell_phone,
      program, program_category, status,
      admin_notes, enrollment_date,
    } = req.body;

    if (!first_name || !last_name || !program) {
      return res.status(400).json({ error: 'first_name, last_name, and program are required.' });
    }

    const result = await pool.query(`
      INSERT INTO students (
        first_name, last_name, email, cell_phone,
        program, program_category, status, admin_notes,
        enrollment_date, intake_source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'admin')
      RETURNING *
    `, [
      first_name, last_name, email || null, cell_phone || null,
      program, program_category || null, status || 'Active',
      admin_notes || null, enrollment_date || new Date().toISOString().split('T')[0],
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
      'first_name','last_name','email','cell_phone','program','program_category',
      'status','admin_notes','counselor_name','enrollment_date','start_date',
      'expected_graduation_date','graduation_date','funding_source',
      'wioa_enrolled','wioa_participant_id','wioa_case_manager',
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
