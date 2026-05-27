// ============================================================
// src/components/AdminEntryForm.jsx
// Detailed manual student intake form & CSV migration utility
// ============================================================
import React, { useState } from 'react';
import axios from 'axios';
import { api } from '../api/client';
import { Save, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2, User, BookOpen, HeartHandshake, ShieldCheck } from 'lucide-react';

export const AdminEntryForm = ({ onSubmitSuccess, addStudent }) => {
  // Tabs State
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'program' | 'education' | 'compliance'

  // Manual Entry Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    cell_phone: '',
    home_phone: '',
    date_of_birth: '',
    gender: '',
    ssn_last4: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    program: '',
    program_category: '',
    status: 'Active',
    enrollment_date: new Date().toISOString().split('T')[0],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    highest_education: '',
    high_school_name: '',
    high_school_grad_year: '',
    ged_certificate: false,
    currently_employed: false,
    employer_name: '',
    employer_phone: '',
    funding_source: '',
    financial_aid_status: '',
    scholarship: false,
    scholarship_name: '',
    background_check_date: '',
    background_check_passed: false,
    drug_test_date: '',
    drug_test_passed: false,
    immunization_complete: false,
    hipaa_signed: false,
    enrollment_agreement_signed: false,
    admin_notes: '',
    photo_url: '',
    drive_link: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null); // 'photo' | 'doc' | null
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // CSV Migration State
  const [csvFile, setCsvFile] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [migrationError, setMigrationError] = useState('');

  // Course options structure with optgroup categories
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

  const handleInputChange = (e) => {
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
      setFormData(prev => ({ ...prev, program: value, program_category: category }));
    } else {
      setFormData(prev => ({ ...prev, [name]: finalVal }));
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(type);
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
        setFormData(prev => ({ ...prev, photo_url: res.data.fileUrl }));
      } else {
        const currentLinks = formData.drive_link ? formData.drive_link.split(',').map(l => l.trim()).filter(Boolean) : [];
        currentLinks.push(window.location.origin + res.data.fileUrl);
        setFormData(prev => ({ ...prev, drive_link: currentLinks.join(', ') }));
      }
      alert(`${file.name} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      alert('File upload failed.');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.first_name || !formData.last_name || !formData.program) {
      setErrorMsg('First Name, Last Name, and Program are required.');
      return;
    }

    setLoading(true);
    try {
      await addStudent(formData);
      setSuccessMsg('Student record created successfully.');
      setFormData({
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        cell_phone: '',
        home_phone: '',
        date_of_birth: '',
        gender: '',
        ssn_last4: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_zip: '',
        program: '',
        program_category: '',
        status: 'Active',
        enrollment_date: new Date().toISOString().split('T')[0],
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relation: '',
        highest_education: '',
        high_school_name: '',
        high_school_grad_year: '',
        ged_certificate: false,
        currently_employed: false,
        employer_name: '',
        employer_phone: '',
        funding_source: '',
        financial_aid_status: '',
        scholarship: false,
        scholarship_name: '',
        background_check_date: '',
        background_check_passed: false,
        drug_test_date: '',
        drug_test_passed: false,
        immunization_complete: false,
        hipaa_signed: false,
        enrollment_agreement_signed: false,
        admin_notes: '',
        photo_url: '',
        drive_link: '',
      });
      setActiveTab('personal');
      setTimeout(() => {
        if (onSubmitSuccess) onSubmitSuccess();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to register student.');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleMigrationSubmit = async (e) => {
    e.preventDefault();
    setMigrationError('');
    setMigrationResult(null);

    if (!csvFile) {
      setMigrationError('Please select a CSV file.');
      return;
    }

    setMigrating(true);
    try {
      const data = await api.migrateCsv(csvFile);
      setMigrationResult(data);
      setCsvFile(null);
      document.getElementById('csv-file-input').value = '';
    } catch (err) {
      console.error(err);
      setMigrationError(err.response?.data?.error || 'Migration failed. Please check file format.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', padding: '24px' }}>
      
      {/* Fallback Entry Form */}
      <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '16px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> Detailed Student Intake Form
        </h3>
        
        {successMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,128,0,0.15)', border: '1px solid var(--green-action)', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#88ff88', fontSize: '13px' }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(214,40,40,0.15)', border: '1px solid #d62828', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#ff8888', fontSize: '13px' }}>
            <AlertTriangle size={16} /> {errorMsg}
          </div>
        )}

        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px', flexWrap: 'wrap', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            style={{
              padding: '10px 16px',
              background: activeTab === 'personal' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'personal' ? '2px solid var(--gold)' : 'none',
              color: activeTab === 'personal' ? 'var(--gold)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={14} /> Personal & Address
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('program')}
            style={{
              padding: '10px 16px',
              background: activeTab === 'program' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'program' ? '2px solid var(--gold)' : 'none',
              color: activeTab === 'program' ? 'var(--gold)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <BookOpen size={14} /> Program & Funding
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('education')}
            style={{
              padding: '10px 16px',
              background: activeTab === 'education' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'education' ? '2px solid var(--gold)' : 'none',
              color: activeTab === 'education' ? 'var(--gold)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <HeartHandshake size={14} /> Emergency & Education
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compliance')}
            style={{
              padding: '10px 16px',
              background: activeTab === 'compliance' ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'compliance' ? '2px solid var(--gold)' : 'none',
              color: activeTab === 'compliance' ? 'var(--gold)' : '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShieldCheck size={14} /> Compliance & Uploads
          </button>
        </div>

        <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TAB 1: Personal & Address */}
          {activeTab === 'personal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>FIRST NAME *</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>LAST NAME *</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>MIDDLE NAME</label>
                <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>EMAIL ADDRESS</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>CELL PHONE</label>
                <input type="tel" name="cell_phone" value={formData.cell_phone} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>HOME PHONE</label>
                <input type="tel" name="home_phone" value={formData.home_phone} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>DATE OF BIRTH</label>
                <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>GENDER</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}>
                  <option value="">-- Select --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>SSN (LAST 4 DIGITS)</label>
                <input type="text" maxLength="4" placeholder="1234" name="ssn_last4" value={formData.ssn_last4} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>STREET ADDRESS</label>
                <input type="text" name="address_street" value={formData.address_street} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>CITY</label>
                <input type="text" name="address_city" value={formData.address_city} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>STATE</label>
                  <input type="text" name="address_state" value={formData.address_state} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ZIP</label>
                  <input type="text" name="address_zip" value={formData.address_zip} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Program & Funding */}
          {activeTab === 'program' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ACADEMIC PROGRAM *</label>
                <select name="program" value={formData.program} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} required>
                  <option value="">-- Select Program --</option>
                  {Object.entries(programCategories).map(([category, courses]) => (
                    <optgroup label={category} key={category} style={{ background: '#001a50', color: '#fff' }}>
                      {courses.map(course => (
                        <option value={course} key={course}>{course}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ENROLLMENT STATUS</label>
                <select name="status" value={formData.status} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }}>
                  <option value="Active">Active</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ENROLLMENT DATE</label>
                <input type="date" name="enrollment_date" value={formData.enrollment_date} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>FUNDING SOURCE</label>
                <input type="text" placeholder="e.g. WIOA, Self-Pay" name="funding_source" value={formData.funding_source} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>FINANCIAL AID STATUS</label>
                <input type="text" placeholder="e.g. Approved, Pending" name="financial_aid_status" value={formData.financial_aid_status} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="scholarship" checked={formData.scholarship} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                  RECIPIENT OF SCHOLARSHIP
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>SCHOLARSHIP NAME</label>
                <input type="text" name="scholarship_name" value={formData.scholarship_name} onChange={handleInputChange} disabled={!formData.scholarship} style={{ padding: '8px 12px', background: formData.scholarship ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
            </div>
          )}

          {/* TAB 3: Emergency & Education */}
          {activeTab === 'education' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Emergency Contact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>EMERGENCY CONTACT NAME</label>
                <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>RELATIONSHIP</label>
                <input type="text" placeholder="e.g. Parent, Spouse" name="emergency_contact_relation" value={formData.emergency_contact_relation} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>EMERGENCY CONTACT PHONE</label>
                <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>

              {/* Education */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>HIGHEST EDUCATION COMPLETED</label>
                <input type="text" placeholder="e.g. High School Diploma, College" name="highest_education" value={formData.highest_education} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>HIGH SCHOOL NAME</label>
                <input type="text" name="high_school_name" value={formData.high_school_name} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>GRAD YEAR</label>
                  <input type="number" placeholder="2020" name="high_school_grad_year" value={formData.high_school_grad_year} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', cursor: 'pointer' }}>
                    <input type="checkbox" name="ged_certificate" checked={formData.ged_certificate} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                    GED HOLDER
                  </label>
                </div>
              </div>

              {/* Employment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="currently_employed" checked={formData.currently_employed} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                  CURRENTLY EMPLOYED
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>EMPLOYER NAME</label>
                <input type="text" name="employer_name" value={formData.employer_name} onChange={handleInputChange} disabled={!formData.currently_employed} style={{ padding: '8px 12px', background: formData.currently_employed ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
            </div>
          )}

          {/* TAB 4: Compliance & Uploads */}
          {activeTab === 'compliance' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Compliance Dates */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>BACKGROUND CHECK DATE</label>
                <input type="date" name="background_check_date" value={formData.background_check_date} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="background_check_passed" checked={formData.background_check_passed} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                  BACKGROUND CHECK PASSED
                </label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>DRUG TEST DATE</label>
                <input type="date" name="drug_test_date" value={formData.drug_test_date} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="drug_test_passed" checked={formData.drug_test_passed} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                  DRUG TEST PASSED
                </label>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', gridColumn: 'span 2', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="immunization_complete" checked={formData.immunization_complete} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                  ALL IMMUNIZATIONS COMPLETE & ON FILE
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="hipaa_signed" checked={formData.hipaa_signed} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                  HIPAA AGREEMENT COMPLIANCE SIGNED
                </label>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', cursor: 'pointer' }}>
                  <input type="checkbox" name="enrollment_agreement_signed" checked={formData.enrollment_agreement_signed} onChange={handleInputChange} style={{ width: '15px', height: '15px' }} />
                  ENROLLMENT SERVICE AGREEMENT SIGNED
                </label>
              </div>

              {/* Photo & Document Uploads */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>UPLOAD STUDENT PHOTO</label>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} style={{ color: '#ccc', fontSize: '12px' }} disabled={uploadingFile !== null} />
                {formData.photo_url && <span style={{ fontSize: '10px', color: 'var(--gold)' }}>Photo staged: {formData.photo_url}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>UPLOAD SUPPORTING DOCUMENTS (PDF/WORD)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'doc')} style={{ color: '#ccc', fontSize: '12px' }} disabled={uploadingFile !== null} />
                {formData.drive_link && <span style={{ fontSize: '10px', color: 'var(--gold)' }}>Docs staged: {formData.drive_link.split(',').length} links</span>}
              </div>

              {/* Admin notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ADMINISTRATIVE INTAKE NOTES</label>
                <textarea name="admin_notes" rows={3} value={formData.admin_notes} onChange={handleInputChange} style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '13px', resize: 'vertical' }} />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {activeTab !== 'personal' && (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['personal', 'program', 'education', 'compliance'];
                  setActiveTab(tabs[tabs.indexOf(activeTab) - 1]);
                }}
                className="btn-gold"
                style={{ flex: 1, padding: '12px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                BACK SECTION
              </button>
            )}
            
            {activeTab !== 'compliance' ? (
              <button
                type="button"
                onClick={() => {
                  const tabs = ['personal', 'program', 'education', 'compliance'];
                  setActiveTab(tabs[tabs.indexOf(activeTab) + 1]);
                }}
                className="btn-gold"
                style={{ flex: 1, padding: '12px', fontSize: '13px' }}
              >
                NEXT SECTION
              </button>
            ) : (
              <button
                type="submit"
                className="btn-green"
                disabled={loading || uploadingFile !== null}
                style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                SAVE COMPLETED DOSSIER
              </button>
            )}
          </div>
        </form>
      </div>

      {/* CSV Legacy Migration Tool */}
      <div className="glass-panel" style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px dashed rgba(255,255,255,0.15)' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '16px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={18} /> Legacy CSV Migration Utility
        </h3>

        {migrationError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(214,40,40,0.15)', border: '1px solid #d62828', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#ff8888', fontSize: '13px' }}>
            <AlertTriangle size={16} /> {migrationError}
          </div>
        )}

        {migrationResult && (
          <div style={{ background: 'rgba(0,128,0,0.15)', border: '1px solid var(--green-action)', borderRadius: '6px', padding: '12px', marginBottom: '16px', color: '#88ff88', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> CSV Migration Completed Successfully
            </div>
            <ul style={{ paddingLeft: '24px', marginTop: '6px', fontSize: '12px', listStyleType: 'square' }}>
              <li>Total Row Records Checked: {migrationResult.total}</li>
              <li>Successfully Migrated: {migrationResult.inserted}</li>
              <li>Rows Skipped/Errors: {migrationResult.skipped}</li>
            </ul>
          </div>
        )}

        <form onSubmit={handleMigrationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>SELECT HISTORICAL STUDENT CSV FILE</label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleCsvChange}
              style={{ color: '#ccc', fontSize: '13px', padding: '8px 0' }}
              disabled={migrating}
              required
            />
          </div>



          <button
            type="submit"
            className="btn-green"
            disabled={migrating}
            style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(to bottom, #008000 0%, #006600 100%)', borderColor: '#005500' }}
          >
            {migrating ? (
              <>
                <Loader2 className="animate-spin" size={16} /> MIGRATING DATA RECORDS...
              </>
            ) : (
              <>
                <Upload size={16} /> RUN CSV BULK IMPORT
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
