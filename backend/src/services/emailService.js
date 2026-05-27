// ============================================================
// backend/src/services/emailService.js
// NodeMailer-based email service
// Sender: "ROWSC Administration"
// ============================================================
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Sends an email on behalf of ROWSC Administration.
 * @param {string} to      - recipient email address
 * @param {string} subject - email subject line
 * @param {string} body    - plain-text or HTML body
 * @returns {Promise<object>} nodemailer info object
 */
const sendEmail = async (to, subject, body) => {
  const mailer = getTransporter();

  const fromName    = process.env.EMAIL_FROM_NAME    || 'ROWSC Administration';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER;

  const mailOptions = {
    from:    `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text:    body,
    // Also send as HTML for better display
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0044cc; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffcc00; margin: 0;">Raphael O. Wheatley Skill Center</h2>
          <p style="color: #ffffff; margin: 4px 0 0;">ROWSC Administration</p>
        </div>
        <div style="background: #fdfbf7; padding: 24px; border: 1px solid #ddd;">
          ${body.replace(/\n/g, '<br/>')}
        </div>
        <div style="background: #f0f0f0; padding: 12px 20px; border-radius: 0 0 8px 8px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            Raphael O. Wheatley Skill Center — This is an automated message from the Student Portal.
          </p>
        </div>
      </div>
    `,
  };

  const info = await mailer.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to} | MessageID: ${info.messageId}`);
  return info;
};

// Verify SMTP connection on startup (non-blocking)
const verifyConnection = () => {
  getTransporter().verify((err) => {
    if (err) {
      console.warn('⚠️  SMTP connection warning:', err.message);
    } else {
      console.log('✅ SMTP email server ready');
    }
  });
};

module.exports = { sendEmail, verifyConnection };
