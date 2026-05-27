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

    const cleanEmail = studentData.email && studentData.email.trim() ? studentData.email.trim() : null;

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

    if (!existingStudent && studentData.first_name && studentData.last_name) {
      const resName = await pool.query(
        'SELECT id, program, drive_link, admin_notes, raw_jotform_payload FROM students WHERE LOWER(TRIM(first_name)) = LOWER(TRIM($1)) AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))',
        [studentData.first_name, studentData.last_name]
      );
      if (resName.rows.length > 0) {
        existingStudent = resName.rows[0];
      }
    }

    let studentId;
    let studentProgram;

    if (existingStudent) {
      // Merge program
      const existingProgram = existingStudent.program;
      let newProgram = studentData.program;
      if (existingProgram && newProgram && existingProgram !== newProgram && !existingProgram.includes(newProgram)) {
        newProgram = `${existingProgram} & ${newProgram}`;
      } else if (existingProgram) {
        newProgram = existingProgram;
      }

      // Merge drive link
      let mergedDriveLink = existingStudent.drive_link;
      if (studentData.drive_link) {
        if (!mergedDriveLink) {
          mergedDriveLink = studentData.drive_link;
        } else if (!mergedDriveLink.includes(studentData.drive_link)) {
          mergedDriveLink = `${mergedDriveLink}, ${studentData.drive_link}`;
        }
      }

      // Merge admin notes
      let mergedNotes = existingStudent.admin_notes || '';
      if (studentData.program && existingProgram && existingProgram !== studentData.program) {
        mergedNotes = `${mergedNotes}\n[SYSTEM: Duplicate application merged for course: ${studentData.program}]`.trim();
      }

      // Merge JSON payload
      const mergedPayload = {
        ...(existingStudent.raw_jotform_payload || {}),
        ...(studentData.raw_jotform_payload || {})
      };

      const result = await pool.query(`
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
          jotform_submission_id       = COALESCE($35, jotform_submission_id),
          jotform_submission_date     = COALESCE($36, jotform_submission_date),
          raw_jotform_payload         = $37,
          updated_at                  = NOW()
        WHERE id = $1
        RETURNING id, first_name, last_name, email, program
      `, [
        existingStudent.id,
        studentData.first_name, studentData.last_name, studentData.middle_name, cleanEmail, studentData.cell_phone, studentData.home_phone, studentData.date_of_birth, studentData.gender, studentData.ssn_last4,
        studentData.address_street, studentData.address_city, studentData.address_state, studentData.address_zip, newProgram, studentData.status, studentData.enrollment_date,
        studentData.emergency_contact_name, studentData.emergency_contact_phone, studentData.emergency_contact_relation,
        studentData.highest_education, studentData.high_school_name, studentData.high_school_grad_year, studentData.ged_certificate,
        studentData.currently_employed, studentData.employer_name, studentData.employer_phone,
        studentData.funding_source, studentData.financial_aid_status, studentData.scholarship, studentData.scholarship_name,
        mergedNotes, mergedDriveLink, studentData.photo_url, studentData.jotform_submission_id, studentData.jotform_submission_date, JSON.stringify(mergedPayload)
      ]);

      const student = result.rows[0];
      studentId = student.id;
      studentProgram = student.program;
    } else {
      const result = await pool.query(`
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
        RETURNING id, first_name, last_name, email, program
      `, [
        studentData.first_name, studentData.last_name, studentData.middle_name, cleanEmail, studentData.cell_phone, studentData.home_phone, studentData.date_of_birth, studentData.gender, studentData.ssn_last4,
        studentData.address_street, studentData.address_city, studentData.address_state, studentData.address_zip, studentData.program, studentData.status, studentData.enrollment_date,
        studentData.emergency_contact_name, studentData.emergency_contact_phone, studentData.emergency_contact_relation,
        studentData.highest_education, studentData.high_school_name, studentData.high_school_grad_year, studentData.ged_certificate,
        studentData.currently_employed, studentData.employer_name, studentData.employer_phone,
        studentData.funding_source, studentData.financial_aid_status, studentData.scholarship, studentData.scholarship_name,
        studentData.admin_notes, studentData.drive_link, studentData.photo_url, studentData.jotform_submission_id, studentData.jotform_submission_date, JSON.stringify(studentData.raw_jotform_payload)
      ]);

      const student = result.rows[0];
      studentId = student.id;
      studentProgram = student.program;
    }

    console.log(`✅ Jotform student upserted: ${studentData.first_name} ${studentData.last_name} (ID: ${studentId})`);

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
