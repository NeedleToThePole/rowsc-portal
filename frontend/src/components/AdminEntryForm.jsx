// ============================================================
// src/components/AdminEntryForm.jsx
// Form for manual student intake and legacy CSV migration utility
// ============================================================
import React, { useState } from 'react';
import { api } from '../api/client';
import { Save, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export const AdminEntryForm = ({ onSubmitSuccess, addStudent }) => {
  // Manual Entry Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    cell_phone: '',
    program: '',
    program_category: '',
    status: 'Active',
    admin_notes: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // CSV Migration State
  const [csvFile, setCsvFile] = useState(null);
  const [adminSecret, setAdminSecret] = useState('');
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
    const { name, value } = e.target;
    
    // Automatically set the category if program changes
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
      setFormData(prev => ({ ...prev, [name]: value }));
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
        email: '',
        cell_phone: '',
        program: '',
        program_category: '',
        status: 'Active',
        admin_notes: '',
      });
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
    if (!adminSecret) {
      setMigrationError('Authorization Admin Secret key is required.');
      return;
    }

    setMigrating(true);
    try {
      const data = await api.migrateCsv(csvFile, adminSecret);
      setMigrationResult(data);
      setCsvFile(null);
      // Reset file input element manually
      document.getElementById('csv-file-input').value = '';
    } catch (err) {
      console.error(err);
      setMigrationError(err.response?.data?.error || 'Migration failed. Please check secret key and format.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', padding: '24px' }}>
      
      {/* Fallback Entry Form */}
      <div className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.03)' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '16px', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Save size={18} /> Manual Enrollment Fallback
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

        <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>FIRST NAME *</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>LAST NAME *</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>EMAIL ADDRESS</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>CELL PHONE</label>
            <input
              type="tel"
              name="cell_phone"
              value={formData.cell_phone}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ACADEMIC PROGRAM *</label>
            <select
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={loading}
              required
            >
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ADMINISTRATIVE INTAKE NOTES</label>
            <textarea
              name="admin_notes"
              rows={3}
              value={formData.admin_notes}
              onChange={handleInputChange}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px', resize: 'vertical' }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-gold"
            disabled={loading}
            style={{ gridColumn: 'span 2', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            SAVE RECORD TO DATABASE
          </button>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ADMIN MIGRATION KEY (SECRET)</label>
            <input
              type="password"
              placeholder="Enter Migration Secret Token"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '14px' }}
              disabled={migrating}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-green"
            disabled={migrating}
            style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '8px', fontSize: '13px', background: 'linear-gradient(to bottom, #008000 0%, #006600 100%)', borderColor: '#005500' }}
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
