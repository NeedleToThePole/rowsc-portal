// ============================================================
// src/components/StudentModal.jsx
// Detailed student paper folder view with editing, uploads, and emailing
// ============================================================
import React from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  X, Calendar, Phone, Mail, Award, CheckCircle, Clock, 
  Edit3, Save, Upload, Loader2, User, BookOpen, HeartHandshake, 
  ShieldCheck, FileText, PlusCircle, Paperclip
} from 'lucide-react';
import { DriveLinker } from './DriveLinker';
import { EmailComposer } from './EmailComposer';

export const StudentModal = ({ student, onClose, linkDriveFolder, updateStudent }) => {
  if (!student) return null;

  const {
    id,
    first_name,
    last_name,
    middle_name,
    email,
    cell_phone,
    home_phone,
    date_of_birth,
    gender,
    ssn_last4,
    address_street,
    address_city,
    address_state,
    address_zip,
    program,
    program_category,
    status,
    enrollment_date,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relation,
    highest_education,
    high_school_name,
    high_school_grad_year,
    ged_certificate,
    currently_employed,
    employer_name,
    employer_phone,
    funding_source,
    financial_aid_status,
    scholarship,
    scholarship_name,
    background_check_date,
    background_check_passed,
    drug_test_date,
    drug_test_passed,
    immunization_complete,
    hipaa_signed,
    enrollment_agreement_signed,
    admin_notes,
    photo_url,
    drive_link,
    intake_source,
    raw_jotform_payload,
  } = student;

  // View States
  const [isEditingFull, setIsEditingFull] = React.useState(false);
  const [editTab, setEditTab] = React.useState('personal'); // 'personal' | 'program' | 'education' | 'compliance'
  const [savingFull, setSavingFull] = React.useState(false);
  const [uploadingType, setUploadingType] = React.useState(null); // 'photo' | 'doc' | null
  const [showFullPayload, setShowFullPayload] = React.useState(false);

  // Quick Notes State (Direct)
  const [isEditingNotes, setIsEditingNotes] = React.useState(false);
  const [notesText, setNotesText] = React.useState(admin_notes || '');
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Edit Form State
  const [editForm, setEditForm] = React.useState({});

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

  // Program select options matching intake form
  const programCategories = {
    'Automotive & Trades': [
      'Automotive Body Repair', 'Automotive Mechanic', 'Carpentry', 'Electrical Technician', 'HVAC/R', 'Plumbing'
    ],
    'Medical & Allied Health': [
      'Certified Nursing Assistant', 'Clinical Medical Assistant', 'Emergency Medical Technician', 'Medical Administrative Assistant', 'Medical Massage Therapy', 'Patient Care Technician', 'Phlebotomy'
    ],
    'Beauty & Wellness': [
      'Barbering', 'Cosmetology', 'Esthetician', 'Hair Braiding', 'Nail Technology'
    ],
    'Other': [
      'Computer Applications', 'Culinary Arts'
    ]
  };

  const handleStartEdit = () => {
    setEditForm({
      first_name: first_name || '',
      last_name: last_name || '',
      middle_name: middle_name || '',
      email: email || '',
      cell_phone: cell_phone || '',
      home_phone: home_phone || '',
      date_of_birth: date_of_birth ? new Date(date_of_birth).toISOString().split('T')[0] : '',
      gender: gender || '',
      ssn_last4: ssn_last4 || '',
      address_street: address_street || '',
      address_city: address_city || '',
      address_state: address_state || '',
      address_zip: address_zip || '',
      program: program || '',
      program_category: program_category || '',
      status: status || 'Active',
      enrollment_date: enrollment_date ? new Date(enrollment_date).toISOString().split('T')[0] : '',
      emergency_contact_name: emergency_contact_name || '',
      emergency_contact_phone: emergency_contact_phone || '',
      emergency_contact_relation: emergency_contact_relation || '',
      highest_education: highest_education || '',
      high_school_name: high_school_name || '',
      high_school_grad_year: high_school_grad_year || '',
      ged_certificate: ged_certificate || false,
      currently_employed: currently_employed || false,
      employer_name: employer_name || '',
      employer_phone: employer_phone || '',
      funding_source: funding_source || '',
      financial_aid_status: financial_aid_status || '',
      scholarship: scholarship || false,
      scholarship_name: scholarship_name || '',
      background_check_date: background_check_date ? new Date(background_check_date).toISOString().split('T')[0] : '',
      background_check_passed: background_check_passed || false,
      drug_test_date: drug_test_date ? new Date(drug_test_date).toISOString().split('T')[0] : '',
      drug_test_passed: drug_test_passed || false,
      immunization_complete: immunization_complete || false,
      hipaa_signed: hipaa_signed || false,
      enrollment_agreement_signed: enrollment_agreement_signed || false,
      admin_notes: admin_notes || '',
      photo_url: photo_url || '',
      drive_link: drive_link || '',
    });
    setEditTab('personal');
    setIsEditingFull(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalVal = type === 'checkbox' ? checked : value;

    if (name === 'program') {
      let category = '';
      for (const [cat, courses] of Object.entries(programCategories)) {
        if (courses.includes(value)) {
          category = cat;
          break;
        }
      }
      setEditForm(prev => ({ ...prev, program: value, program_category: category }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: finalVal }));
    }
  };

  const handleEditFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingType(type);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const token = localStorage.getItem('rowsc_token');
      const res = await axios.post('/api/students/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      if (type === 'photo') {
        setEditForm(prev => ({ ...prev, photo_url: res.data.fileUrl }));
      } else {
        const currentLinks = editForm.drive_link ? editForm.drive_link.split(',').map(l => l.trim()).filter(Boolean) : [];
        currentLinks.push(window.location.origin + res.data.fileUrl);
        setEditForm(prev => ({ ...prev, drive_link: currentLinks.join(', ') }));
      }
      alert(`${file.name} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleSaveFull = async (e) => {
    e.preventDefault();
    setSavingFull(true);
    try {
      const finalData = { ...editForm };
      
      // Clean high school grad year
      if (finalData.high_school_grad_year) {
        finalData.high_school_grad_year = parseInt(finalData.high_school_grad_year) || null;
      } else {
        finalData.high_school_grad_year = null;
      }
      
      // Map empty dates to null to satisfy DB constraints
      const dateFields = ['date_of_birth', 'enrollment_date', 'background_check_date', 'drug_test_date'];
      dateFields.forEach(f => {
        if (!finalData[f]) finalData[f] = null;
      });

      await updateStudent(id, finalData);
      setIsEditingFull(false);
      alert('Student record updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update student profile: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingFull(false);
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
        style={{ overflowY: 'auto', maxHeight: '90vh', padding: '40px' }}
      >
        
        {/* Red Official Stamp */}
        {!isEditingFull && <div className="official-stamp">OFFICIAL RECORD</div>}

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
            zIndex: 10
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          <X size={20} />
        </button>

        {/* Skeuomorphic Paper-Clipped Portrait Photo */}
        {!isEditingFull && photo_url && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '40px',
            background: '#fff',
            padding: '6px 6px 16px 6px',
            boxShadow: '0 5px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.1)',
            transform: 'rotate(2deg)',
            border: '1px solid #ddd',
            width: '95px',
            zIndex: 5
          }}>
            <div style={{ position: 'absolute', top: '-12px', left: '20px', color: '#777', zIndex: 10 }}>
              <Paperclip size={20} style={{ transform: 'rotate(-45deg)' }} />
            </div>
            <img
              src={photo_url}
              alt={fullName}
              style={{
                width: '83px',
                height: '83px',
                objectFit: 'cover',
                display: 'block',
                border: '1px solid #eee'
              }}
            />
            <div style={{
              textAlign: 'center',
              fontSize: '8px',
              fontFamily: 'monospace',
              color: '#888',
              marginTop: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ID-{id}
            </div>
          </div>
        )}

        {/* --------------------- RECORD VIEW MODE --------------------- */}
        {!isEditingFull ? (
          <>
            {/* File Header */}
            <div className="document-header" style={{ paddingRight: photo_url ? '120px' : '0px' }}>
              <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                RAPHAEL O. WHEATLEY SKILL CENTER
              </span>
              <h2 className="document-title">{fullName}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
                  Student ID: #{String(id).padStart(5, '0')}
                </span>
                <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
                  Intake: {intake_source?.toUpperCase()}
                </span>
                {middle_name && (
                  <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
                    Middle Name: {middle_name}
                  </span>
                )}
                {ssn_last4 && (
                  <span style={{ fontSize: '11px', color: '#666', background: '#eaeaea', padding: '2px 8px', borderRadius: '12px' }}>
                    SSN Last 4: ***-**-{ssn_last4}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Button Panel */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button
                onClick={handleStartEdit}
                className="btn-gold"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 700 }}
              >
                <Edit3 size={14} /> Edit Full Record
              </button>
            </div>

            {/* Info Grid (Standard Paper Text) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>ACADEMIC PROGRAM</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <Award size={16} color="#0044cc" /> {program}
                  {program && program.includes(' & ') && (
                    <span style={{
                      fontSize: '9px',
                      background: '#d62828',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '3px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Dual Enrolled
                    </span>
                  )}
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
                <span style={{ fontSize: '13px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <Phone size={14} color="#666" /> Cell: {cell_phone || 'Not Provided'}
                  {home_phone && <span style={{ marginLeft: '10px', color: '#666' }}>(Home: {home_phone})</span>}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>ENROLLMENT DATE</span>
                <span style={{ fontSize: '13px', color: '#333', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="#666" /> {formatDate(enrollment_date)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>DATE OF BIRTH & GENDER</span>
                <span style={{ fontSize: '13px', color: '#333' }}>
                  {formatDate(date_of_birth)} {gender ? `(${gender})` : ''}
                </span>
              </div>

              {address_street && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '10px', color: '#777', fontWeight: 700 }}>RESIDENTIAL ADDRESS</span>
                  <span style={{ fontSize: '13px', color: '#333' }}>
                    {address_street}, {address_city}, {address_state} {address_zip}
                  </span>
                </div>
              )}

              {/* Emergency Contact Block */}
              {emergency_contact_name && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2', background: 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <span style={{ fontSize: '9px', color: '#888', fontWeight: 800, textTransform: 'uppercase' }}>EMERGENCY CONTACT INFORMATION</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#333', marginTop: '2px' }}>
                    <div>Name: <strong>{emergency_contact_name}</strong> ({emergency_contact_relation || 'N/A'})</div>
                    <div>Phone: {emergency_contact_phone || 'N/A'}</div>
                  </div>
                </div>
              )}
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
                    Quick Edit
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
                        if (!value || String(value).includes('drive.google.com') || String(value).includes('bit.ly/')) return null;
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
          </>
        ) : (
          // --------------------- RECORD EDIT MODE ---------------------
          <form onSubmit={handleSaveFull} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#002a80', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Edit3 size={20} /> Edit Student Profile
              </h2>
              <span style={{ fontSize: '12px', color: '#777', fontWeight: 600 }}>ID: #{String(id).padStart(5, '0')}</span>
            </div>

            {/* Editor Tab Controls */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ccc', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setEditTab('personal')}
                style={{
                  padding: '8px 12px',
                  background: editTab === 'personal' ? '#eaeaea' : 'transparent',
                  border: 'none',
                  borderBottom: editTab === 'personal' ? '2px solid #002a80' : 'none',
                  color: editTab === 'personal' ? '#002a80' : '#555',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <User size={12} /> Personal & Address
              </button>
              <button
                type="button"
                onClick={() => setEditTab('program')}
                style={{
                  padding: '8px 12px',
                  background: editTab === 'program' ? '#eaeaea' : 'transparent',
                  border: 'none',
                  borderBottom: editTab === 'program' ? '2px solid #002a80' : 'none',
                  color: editTab === 'program' ? '#002a80' : '#555',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <BookOpen size={12} /> Program & Funding
              </button>
              <button
                type="button"
                onClick={() => setEditTab('education')}
                style={{
                  padding: '8px 12px',
                  background: editTab === 'education' ? '#eaeaea' : 'transparent',
                  border: 'none',
                  borderBottom: editTab === 'education' ? '2px solid #002a80' : 'none',
                  color: editTab === 'education' ? '#002a80' : '#555',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <HeartHandshake size={12} /> Contact & Education
              </button>
              <button
                type="button"
                onClick={() => setEditTab('compliance')}
                style={{
                  padding: '8px 12px',
                  background: editTab === 'compliance' ? '#eaeaea' : 'transparent',
                  border: 'none',
                  borderBottom: editTab === 'compliance' ? '2px solid #002a80' : 'none',
                  color: editTab === 'compliance' ? '#002a80' : '#555',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ShieldCheck size={12} /> Compliance & Docs
              </button>
            </div>

            {/* TAB 1: Personal Info & Address */}
            {editTab === 'personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>FIRST NAME *</label>
                  <input type="text" name="first_name" value={editForm.first_name} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>LAST NAME *</label>
                  <input type="text" name="last_name" value={editForm.last_name} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>MIDDLE NAME</label>
                  <input type="text" name="middle_name" value={editForm.middle_name} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>EMAIL ADDRESS</label>
                  <input type="email" name="email" value={editForm.email} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>CELL PHONE</label>
                  <input type="tel" name="cell_phone" value={editForm.cell_phone} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>HOME PHONE</label>
                  <input type="tel" name="home_phone" value={editForm.home_phone} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>DATE OF BIRTH</label>
                  <input type="date" name="date_of_birth" value={editForm.date_of_birth} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>GENDER</label>
                  <select name="gender" value={editForm.gender} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: '#fff' }}>
                    <option value="">-- Select --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>SSN LAST 4</label>
                  <input type="text" maxLength="4" placeholder="1234" name="ssn_last4" value={editForm.ssn_last4} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>STREET ADDRESS</label>
                  <input type="text" name="address_street" value={editForm.address_street} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>CITY</label>
                  <input type="text" name="address_city" value={editForm.address_city} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>STATE</label>
                    <input type="text" name="address_state" value={editForm.address_state} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>ZIP</label>
                    <input type="text" name="address_zip" value={editForm.address_zip} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Program & Funding */}
            {editTab === 'program' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>ACADEMIC PROGRAM *</label>
                  <select name="program" value={editForm.program} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: '#fff' }} required>
                    <option value="">-- Select Program --</option>
                    {Object.entries(programCategories).map(([category, courses]) => (
                      <optgroup label={category} key={category}>
                        {courses.map(course => (
                          <option value={course} key={course}>{course}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>ENROLLMENT STATUS</label>
                  <select name="status" value={editForm.status} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: '#fff' }}>
                    <option value="Active">Active</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>ENROLLMENT DATE</label>
                  <input type="date" name="enrollment_date" value={editForm.enrollment_date} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>FUNDING SOURCE</label>
                  <input type="text" placeholder="e.g. WIOA, Self-Pay" name="funding_source" value={editForm.funding_source} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>FINANCIAL AID STATUS</label>
                  <input type="text" placeholder="e.g. Approved, Pending" name="financial_aid_status" value={editForm.financial_aid_status} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="scholarship" checked={editForm.scholarship} onChange={handleEditInputChange} style={{ width: '16px', height: '16px' }} />
                    RECIPIENT OF SCHOLARSHIP
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>SCHOLARSHIP NAME</label>
                  <input type="text" name="scholarship_name" value={editForm.scholarship_name} onChange={handleEditInputChange} disabled={!editForm.scholarship} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: editForm.scholarship ? '#fff' : '#eaeaea' }} />
                </div>
              </div>
            )}

            {/* TAB 3: Contact & Education */}
            {editTab === 'education' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>EMERGENCY CONTACT NAME</label>
                  <input type="text" name="emergency_contact_name" value={editForm.emergency_contact_name} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>RELATIONSHIP</label>
                  <input type="text" placeholder="e.g. Parent, Spouse" name="emergency_contact_relation" value={editForm.emergency_contact_relation} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>EMERGENCY PHONE</label>
                  <input type="tel" name="emergency_contact_phone" value={editForm.emergency_contact_phone} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>HIGHEST EDUCATION</label>
                  <input type="text" name="highest_education" value={editForm.highest_education} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>HIGH SCHOOL NAME</label>
                  <input type="text" name="high_school_name" value={editForm.high_school_name} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>GRAD YEAR</label>
                    <input type="number" name="high_school_grad_year" value={editForm.high_school_grad_year} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                    <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                      <input type="checkbox" name="ged_certificate" checked={editForm.ged_certificate} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                      GED HOLDER
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="currently_employed" checked={editForm.currently_employed} onChange={handleEditInputChange} style={{ width: '16px', height: '16px' }} />
                    CURRENTLY EMPLOYED
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>EMPLOYER NAME</label>
                  <input type="text" name="employer_name" value={editForm.employer_name} onChange={handleEditInputChange} disabled={!editForm.currently_employed} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', background: editForm.currently_employed ? '#fff' : '#eaeaea' }} />
                </div>
              </div>
            )}

            {/* TAB 4: Compliance & Uploads */}
            {editTab === 'compliance' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>BACKGROUND CHECK DATE</label>
                  <input type="date" name="background_check_date" value={editForm.background_check_date} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="background_check_passed" checked={editForm.background_check_passed} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                    BACKGROUND CHECK PASSED
                  </label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>DRUG TEST DATE</label>
                  <input type="date" name="drug_test_date" value={editForm.drug_test_date} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="drug_test_passed" checked={editForm.drug_test_passed} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                    DRUG TEST PASSED
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: 'span 2', background: 'rgba(0,0,0,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="immunization_complete" checked={editForm.immunization_complete} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                    IMMUNIZATIONS COMPLETE & ON FILE
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="hipaa_signed" checked={editForm.hipaa_signed} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                    HIPAA SIGNED
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', cursor: 'pointer', fontWeight: 700 }}>
                    <input type="checkbox" name="enrollment_agreement_signed" checked={editForm.enrollment_agreement_signed} onChange={handleEditInputChange} style={{ width: '15px', height: '15px' }} />
                    ENROLLMENT SERVICE AGREEMENT SIGNED
                  </label>
                </div>

                {/* Upload Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>CHANGE PORTRAIT PHOTO</label>
                  <input type="file" accept="image/*" onChange={(e) => handleEditFileUpload(e, 'photo')} style={{ fontSize: '12px', color: '#666' }} disabled={uploadingType !== null} />
                  {uploadingType === 'photo' && <div style={{ fontSize: '10px', color: '#ffb300' }}>Uploading photo...</div>}
                  {editForm.photo_url && <div style={{ fontSize: '10px', color: 'green' }}>✓ Photo uploaded: {editForm.photo_url}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>UPLOAD SUPPORTING DOCUMENT</label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleEditFileUpload(e, 'doc')} style={{ fontSize: '12px', color: '#666' }} disabled={uploadingType !== null} />
                  {uploadingType === 'doc' && <div style={{ fontSize: '10px', color: '#ffb300' }}>Uploading document...</div>}
                  {editForm.drive_link && (
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      Staged Docs: {editForm.drive_link.split(',').length} links total
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#555' }}>ADMINISTRATIVE TRANSCRIPT NOTES</label>
                  <textarea name="admin_notes" rows={3} value={editForm.admin_notes} onChange={handleEditInputChange} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }} />
                </div>
              </div>
            )}

            {/* Editor Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditingFull(false)}
                className="btn-gold"
                style={{ flex: 1, padding: '10px', background: '#ccc', borderColor: '#bbb', color: '#333' }}
                disabled={savingFull}
              >
                Cancel Changes
              </button>
              
              <button
                type="submit"
                className="btn-green"
                disabled={savingFull || uploadingType !== null}
                style={{ flex: 2, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px' }}
              >
                {savingFull ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Saving Record...
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Student Record
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
