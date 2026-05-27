// ============================================================
// src/hooks/useEmail.js
// Custom hook to handle sending emails
// ============================================================
import { useState } from 'react';
import { api } from '../api/client';

export const useEmail = () => {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const sendStudentEmail = async (to, subject, body) => {
    setSending(true);
    setSuccess(false);
    setError(null);
    try {
      await api.sendEmail({ to, subject, body });
      setSuccess(true);
      return true;
    } catch (err) {
      console.error('sendStudentEmail error:', err);
      setError(err.response?.data?.error || 'Failed to send email.');
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    sending,
    success,
    error,
    sendStudentEmail,
    setSuccess,
    setError,
  };
};
