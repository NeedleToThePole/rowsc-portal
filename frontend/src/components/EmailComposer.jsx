// ============================================================
// src/components/EmailComposer.jsx
// Interactive email composition area with transactional states
// ============================================================
import React, { useState } from 'react';
import { Mail, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useEmail } from '../hooks/useEmail';

export const EmailComposer = ({ studentEmail, studentName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const { sending, success, error, sendStudentEmail, setSuccess, setError } = useEmail();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject || !message) {
      setError('Please provide both a subject and email body.');
      return;
    }

    const emailSent = await sendStudentEmail(studentEmail, subject, message);
    if (emailSent) {
      setSubject('');
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
      }, 3500);
    }
  };

  return (
    <div style={{ marginTop: '20px', borderTop: '1px dashed #e2ded0', paddingTop: '16px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-gold"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px',
          fontSize: '13px',
        }}
      >
        <Mail size={16} />
        {isOpen ? 'Close Email Panel' : `Email Student (${studentName})`}
      </button>

      {isOpen && (
        <form 
          onSubmit={handleSend}
          style={{
            background: '#fcfcfc',
            border: '1px solid #e2ded0',
            borderRadius: '4px',
            padding: '16px',
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#333', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
            New Official Correspondence
          </h4>

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e8f7ed', border: '1px solid #a3e2b9', borderRadius: '4px', padding: '8px 12px', color: '#1b5e20', fontSize: '12px' }}>
              <CheckCircle size={14} /> Email sent successfully via ROWSC Administration.
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '4px', padding: '8px 12px', color: '#c62828', fontSize: '12px' }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Recipient Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#666' }}>RECIPIENT EMAIL</label>
            <input
              type="text"
              value={studentEmail}
              disabled
              style={{
                padding: '6px 10px',
                background: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
                color: '#555',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Subject Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#666' }}>SUBJECT *</label>
            <input
              type="text"
              placeholder="e.g. Notice of Pending Graduation Documents"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              style={{
                padding: '8px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#333',
              }}
              required
            />
          </div>

          {/* Message Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#666' }}>MESSAGE BODY *</label>
            <textarea
              placeholder="Type your official administrative message here..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              style={{
                padding: '8px 10px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#333',
                resize: 'vertical',
                lineHeight: '1.4',
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-green"
            disabled={sending}
            style={{
              padding: '10px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {sending ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Sending Email...
              </>
            ) : (
              <>
                <Send size={12} /> Send Now
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
