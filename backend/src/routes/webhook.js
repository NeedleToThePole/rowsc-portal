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

    // Build dynamic INSERT from mapped data (exclude nulls for cleanliness)
    const columns = Object.keys(studentData).filter(k => studentData[k] !== null && studentData[k] !== undefined);
    const values  = columns.map(k => {
      const v = studentData[k];
      return (typeof v === 'object' && !(v instanceof Date)) ? JSON.stringify(v) : v;
    });
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO students (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (email) DO UPDATE SET
        updated_at = NOW(),
        raw_jotform_payload = EXCLUDED.raw_jotform_payload
      RETURNING id, first_name, last_name, email, program
    `;

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
