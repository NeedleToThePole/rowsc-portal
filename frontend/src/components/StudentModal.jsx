// ============================================================
// src/components/StudentModal.jsx
// Detailed student paper folder view with Drive linking and Emailing
// ============================================================
import React from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Phone, Mail, Award, CheckCircle, Clock } from 'lucide-react';
import { DriveLinker } from './DriveLinker';
import { EmailComposer } from './EmailComposer';

export const StudentModal = ({ student, onClose, linkDriveFolder, updateStudent }) => {
  if (!student) return null;

  const {
    id,
    first_name,
    last_name,
    email,
    cell_phone,
    program,
    program_category,
    status,
    enrollment_date,
    drive_link,
    admin_notes,
    intake_source,
    raw_jotform_payload,
  } = student;

  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notesText, setNotesText] = React.useState(admin_notes || '');
  const [savingNotes, setSavingNotes] = React.useState(false);
  const [showFullPayload, setShowFullPayload] = React.useState(false);

  // Sync state if student changes
  React.useEffect(() => {
    setNotesText(admin_notes || '');
  }, [admin_notes]);

  const fullName = `${first_name} ${last_name}`;

  // Formatted date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusStyle = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { color: 'green', background: '#e8f5e9', border: '1px solid green' };
      case 'graduated':
        return { color: 'blue', background: '#e3f2fd', border: '1px solid blue' };
      default:
        return { color: 'orange', background: '#fff3e0', border: '1px solid orange' };
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateStudent(id, { admin_notes: notesText });
      setIsEditingNotes(false);
    } catch (err) {
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="paper-modal-overlay" onClick={onClose}>
      
      {/* 3D Paper document entry animation */}
      <motion.div
        className="paper-document"
        onClick={(e) => e.stopPropagation()} // Prevent close on card click
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ 
          y: 0, 
          opacity: 1, 
          scale: 1,
          transition: { type: 'spring', damping: 25, stiffness: 250 } 
        }}
        exit={{ y: 30, opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      >
        
        {/* Red Official Stamp */}
        <div className="official-stamp">
          OFFICIAL RECORD
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <X size={20} />
        </button>

        {/* File Header */}
        <div className="document-header">
          <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            RAPHAEL O. WHEATLEY SKILL CENTER
          </span>
          <h2 className="document-title">{fullName}</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
              Student ID: #{String(id).padStart(5, '0')}
            </span>
            <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
              Intake: {intake_source?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Info Grid (Standard Paper Text) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>ACADEMIC PROGRAM</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="#0044cc" /> {program}
            </span>
            <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>({program_category || 'N/A'})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>ENROLLMENT STATUS</span>
            <span style={{
              alignSelf: 'flex-start',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: '12px',
              textTransform: 'uppercase',
              ...getStatusStyle()
            }}>
              {status}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>EMAIL ADDRESS</span>
            <span style={{ fontSize: '13px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="#666" /> {email || 'Not Provided'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>CONTACT NUMBER</span>
            <span style={{ fontSize: '13px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={14} color="#666" /> {cell_phone || 'Not Provided'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>ENROLLMENT DATE</span>
            <span style={{ fontSize: '13px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#666" /> {formatDate(enrollment_date)}
            </span>
          </div>
        </div>

        {/* Administrative Notes Field */}
        <div style={{ background: '#fcfbf2', padding: '16px', borderRadius: '4px', border: '1px solid #e5dfcf', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#555', margin: 0 }}>ADMINISTRATIVE TRANSCRIPT NOTES:</h4>
            {isEditingNotes ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="btn-gold"
                  style={{ padding: '2px 8px', fontSize: '11px' }}
                >
                  {savingNotes ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setNotesText(admin_notes || ''); setIsEditingNotes(false); }}
                  disabled={savingNotes}
                  style={{ padding: '2px 8px', fontSize: '11px', background: '#ccc', border: '1px solid #999', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="btn-gold"
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                Edit Notes
              </button>
            )}
          </div>
          
          {isEditingNotes ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#fff',
                color: '#333',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical'
              }}
            />
          ) : (
            <p style={{ fontSize: '12px', color: '#444', fontStyle: admin_notes ? 'normal' : 'italic', whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>
              {admin_notes || 'No administrative notes have been logged for this record.'}
            </p>
          )}
        </div>

        {/* Document Linker widget */}
        <DriveLinker
          studentId={id}
          currentLink={drive_link}
          onLinkSuccess={linkDriveFolder}
        />

        {/* Collapsible Complete Registration dossier */}
        {raw_jotform_payload && typeof raw_jotform_payload === 'object' && Object.keys(raw_jotform_payload).length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px dashed #e2ded0', paddingTop: '16px' }}>
            <button
              onClick={() => setShowFullPayload(!showFullPayload)}
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
              {showFullPayload ? 'Hide Complete Application Dossier' : 'View Complete Application Dossier'}
            </button>

            {showFullPayload && (
              <div style={{
                marginTop: '12px',
                background: '#fcfcfc',
                border: '1px solid #e2ded0',
                borderRadius: '4px',
                padding: '16px',
                maxHeight: '300px',
                overflowY: 'auto',
              }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#333', borderBottom: '1px solid #eee', paddingBottom: '6px', marginBottom: '10px' }}>
                  Full Historical Application Form Records
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(raw_jotform_payload).map(([key, value]) => {
                    // Skip printing drive links or empty values again
                    if (!value || String(value).includes('drive.google.com') || String(value).includes('bit.ly/')) return null;
                    
                    // Clean key name formatting
                    const displayName = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <div key={key} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#666', width: '40%', paddingRight: '10px', wordBreak: 'break-word' }}>
                          {displayName}:
                        </span>
                        <span style={{ fontSize: '11px', color: '#333', width: '60%', wordBreak: 'break-word' }}>
                          {String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emailing module */}
        {email ? (
          <EmailComposer
            studentEmail={email}
            studentName={fullName}
          />
        ) : (
          <div style={{ marginTop: '20px', borderTop: '1px dashed #e2ded0', paddingTop: '16px', fontSize: '11px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
            Email communication unavailable: no registered email address on file.
          </div>
        )}
      </motion.div>
    </div>
  );
};
