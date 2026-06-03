// ============================================================
// src/components/DriveLinker.jsx
// Google Drive folder linker form for student records
// ============================================================
import React, { useState } from 'react';
import { Link2, ExternalLink, Loader2, Check } from 'lucide-react';

export const DriveLinker = ({ studentId, currentLink, onLinkSuccess }) => {
  const [driveUrl, setDriveUrl] = useState(currentLink || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const resolveLink = (link) => {
    if (!link) return '';
    if (link.startsWith('/uploads')) {
      const backendHost = import.meta.env.PROD ? 'https://rowsc-api.onrender.com' : '';
      return `${backendHost}${link}`;
    }
    if (link.includes('rowsc-portal.vercel.app/uploads')) {
      return link.replace('rowsc-portal.vercel.app', 'rowsc-api.onrender.com');
    }
    if (import.meta.env.PROD && link.includes('localhost:5173/uploads')) {
      return link.replace('localhost:5173', 'rowsc-api.onrender.com');
    }
    return link;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!driveUrl) {
      setError('Please paste a Google Drive folder link.');
      return;
    }

    if (!driveUrl.includes('drive.google.com') && !driveUrl.includes('/uploads/')) {
      setError('Link must be a valid Google Drive URL or local upload.');
      return;
    }

    setLoading(true);
    try {
      await onLinkSuccess(studentId, driveUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update folder link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#f5f4ef', padding: '16px', borderRadius: '4px', border: '1px solid #e2ded0', marginTop: '12px' }}>
      <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Link2 size={15} /> Google Drive Folder Link
      </h4>

      {(() => {
        const links = currentLink ? currentLink.split(',').map(l => l.trim()).filter(Boolean) : [];
        if (links.length > 0) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {links.map((link, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#fff', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }} title={link}>
                    {link}
                  </span>
                  <a
                    href={resolveLink(link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold"
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} /> View Link {links.length > 1 ? `#${index + 1}` : ''}
                  </a>
                </div>
              ))}
            </div>
          );
        }
        return (
          <p style={{ fontSize: '11px', color: '#888', marginBottom: '10px', fontStyle: 'italic' }}>
            No document folders have been linked to this student record.
          </p>
        );
      })()}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="url"
            placeholder="Paste Google Drive folder URL"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '8px 10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '12px',
              background: '#fff',
              color: '#333',
            }}
            required
          />
          <button
            type="submit"
            className="btn-gold"
            disabled={loading}
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : success ? (
              <Check size={14} color="green" />
            ) : (
              'Link Documents'
            )}
          </button>
        </div>
        
        {error && <span style={{ fontSize: '11px', color: '#c30000', fontWeight: 600 }}>{error}</span>}
        {success && <span style={{ fontSize: '11px', color: 'green', fontWeight: 600 }}>Drive folder linked successfully!</span>}
      </form>
    </div>
  );
};
