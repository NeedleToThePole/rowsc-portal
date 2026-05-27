// ============================================================
// backend/src/routes/webhook.js
// POST /api/webhooks/jotform
// Receives and processes Jotform form submissions
// ============================================================
const express   = require('express');
const router    = express.Router();
const crypto    = require('crypto');
const pool      = require('../config/database');
const { mapJotformToStudent } = require('../services/jotformMapper');

/**
 * Validates Jotform webhook signature.
 * Jotform sends HMAC-SHA256 of the raw body using your webhook secret.
 * Enable this by setting JOTFORM_WEBHOOK_SECRET in .env.
 */
const validateJotformSignature = (req, res, next) => {
  const secret = process.env.JOTFORM_WEBHOOK_SECRET;

  // If no secret configured, skip validation (dev mode)
  if (!secret) {
    console.warn('⚠️  JOTFORM_WEBHOOK_SECRET not set — skipping signature validation');
    return next();
  }

  const receivedSig = req.headers['x-jotform-signature'];
  if (!receivedSig) {
    return res.status(401).json({ error: 'Missing webhook signature.' });
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const sigBuffer   = Buffer.from(receivedSig);
  const expectedBuf = Buffer.from(expectedSig);

  // Timing-safe comparison to prevent timing attacks
  if (sigBuffer.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuffer, expectedBuf)) {
    console.warn('⚠️  Invalid Jotform webhook signature rejected');
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  next();
};

// ── POST /api/webhooks/jotform ────────────────────────────────
router.post('/jotform', validateJotformSignature, async (req, res) => {
  // Jotform sends data as application/x-www-form-urlencoded
  // Express will parse this automatically when using express.urlencoded()
  const payload = req.body;

  console.log('📥 Jotform webhook received:', {
    submissionId: payload.submissionID || payload.submission_id,
    timestamp: new Date().toISOString(),
  });

  try {
    const studentData = mapJotformToStudent(payload);

    // Skip if we've already processed this submission
    if (studentData.jotform_submission_id) {
      const existing = await pool.query(
        'SELECT id FROM students WHERE jotform_submission_id = $1',
        [studentData.jotform_submission_id]
      );
      if (existing.rows.length > 0) {
        console.log(`⚠️  Duplicate Jotform submission ${studentData.jotform_submission_id} — skipped`);
        return res.status(200).json({ message: 'Duplicate submission — skipped.' });
      }
    }

    const query = `
      INSERT INTO students (
        first_name, last_name, middle_name, email, cell_phone, home_phone, date_of_birth, gender, ssn_last4,
        address_street, address_city, address_state, address_zip, program, status, enrollment_date,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        highest_education, high_school_name, high_school_grad_year, ged_certificate,
        currently_employed, employer_name, employer_phone,
        funding_source, financial_aid_status, scholarship, scholarship_name,
        admin_notes, drive_link, photo_url, intake_source, jotform_submission_id, jotform_submission_date, raw_jotform_payload
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22, $23,
        $24, $25, $26,
        $27, $28, $29, $30,
        $31, $32, $33, 'jotform', $34, $35, $36
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
        jotform_submission_id       = COALESCE(EXCLUDED.jotform_submission_id, students.jotform_submission_id),
        jotform_submission_date     = COALESCE(EXCLUDED.jotform_submission_date, students.jotform_submission_date),
        raw_jotform_payload         = students.raw_jotform_payload || EXCLUDED.raw_jotform_payload,
        updated_at                  = NOW()
      RETURNING id, first_name, last_name, email, program
    `;

    const values = [
      studentData.first_name, studentData.last_name, studentData.middle_name, studentData.email, studentData.cell_phone, studentData.home_phone, studentData.date_of_birth, studentData.gender, studentData.ssn_last4,
      studentData.address_street, studentData.address_city, studentData.address_state, studentData.address_zip, studentData.program, studentData.status, studentData.enrollment_date,
      studentData.emergency_contact_name, studentData.emergency_contact_phone, studentData.emergency_contact_relation,
      studentData.highest_education, studentData.high_school_name, studentData.high_school_grad_year, studentData.ged_certificate,
      studentData.currently_employed, studentData.employer_name, studentData.employer_phone,
      studentData.funding_source, studentData.financial_aid_status, studentData.scholarship, studentData.scholarship_name,
      studentData.admin_notes, studentData.drive_link, studentData.photo_url, studentData.jotform_submission_id, studentData.jotform_submission_date, JSON.stringify(studentData.raw_jotform_payload)
    ];

    const result = await pool.query(query, values);
    const student = result.rows[0];

    console.log(`✅ Jotform student inserted: ${student.first_name} ${student.last_name} (ID: ${student.id})`);

    // Jotform requires a 200 response to confirm receipt
    res.status(200).json({
      message: 'Student record created successfully.',
      studentId: student.id,
    });

  } catch (err) {
    console.error('❌ Jotform webhook processing error:', err);
    // Return 200 to prevent Jotform retry loops — log the error internally
    res.status(200).json({ message: 'Received — processing error logged.' });
  }
});

module.exports = router;
