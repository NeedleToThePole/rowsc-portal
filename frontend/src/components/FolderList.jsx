// ============================================================
// src/components/FolderList.jsx
// Filterable collection of student folder tabs (Drawer 2)
// ============================================================
import React, { useState, useEffect } from 'react';
import { FolderTab } from './FolderTab';
import { Search, RefreshCw, AlertCircle, Loader } from 'lucide-react';

export const FolderList = ({ students, loading, error, onSelectFolder, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  // Auto refresh or search filtering local fallback or call parent onRefresh with query
  // Let's filter locally for ultra-fast, responsive UI search feedback
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(student.id).includes(searchTerm);

    const matchesProgram = selectedProgram === '' || student.program === selectedProgram;

    return matchesSearch && matchesProgram;
  });

  // Extract unique programs for the dropdown filter
  const programs = Array.from(new Set(students.map(s => s.program))).filter(Boolean).sort();

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by last name, first name, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Program Filter Dropdown */}
        <select
          value={selectedProgram}
          onChange={(e) => setSelectedProgram(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: '#fff',
            fontSize: '13px',
            minWidth: '180px',
          }}
        >
          <option value="">-- All Programs --</option>
          {programs.map(prog => (
            <option value={prog} key={prog} style={{ background: '#001a50' }}>{prog}</option>
          ))}
        </select>

        {/* Sync/Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            padding: '8px 12px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Folders List Container */}
      <div className="folder-container">
        
        {loading && students.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0', color: 'rgba(255,255,255,0.5)' }}>
            <Loader className="animate-spin" size={24} />
            <span style={{ fontSize: '13px' }}>Retrieving archive records...</span>
          </div>
        )}

        {error && (
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(214,40,40,0.15)', borderColor: '#d62828' }}>
            <AlertCircle size={20} color="#ff8888" />
            <p style={{ fontSize: '13px', color: '#ffcccc' }}>{error}</p>
          </div>
        )}

        {!loading && filteredStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '6px' }}>
            No matching student records found.
          </div>
        )}

        {filteredStudents.map(student => (
          <FolderTab
            student={student}
            key={student.id}
            onClick={() => onSelectFolder(student.id)}
          />
        ))}
      </div>
    </div>
  );
};
