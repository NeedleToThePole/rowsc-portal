// ============================================================
// backend/src/routes/email.js
// POST /api/email/send
// Sends email via NodeMailer on behalf of ROWSC Administration
// ============================================================
const express = require('express');
const router  = express.Router();
const { sendEmail } = require('../services/emailService');
const { authenticateToken } = require('../middleware/auth');

router.post('/send', authenticateToken, async (req, res) => {
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required.' });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({ error: 'Invalid recipient email address.' });
  }

  if (body.length > 10000) {
    return res.status(400).json({ error: 'Message body too long (max 10,000 characters).' });
  }

  try {
    const info = await sendEmail(to, subject, body);
    res.json({
      message: 'Email sent successfully.',
      messageId: info.messageId,
    });
  } catch (err) {
    console.error('POST /api/email/send error:', err);
    res.status(500).json({ error: 'Failed to send email. Check SMTP configuration.' });
  }
});

module.exports = router;
