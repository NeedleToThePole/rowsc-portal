// ============================================================
// src/components/FolderTab.jsx
// Hanging Manila Folder Tab representing a student record
// ============================================================
import React from 'react';

export const FolderTab = ({ student, onClick }) => {
  const { first_name, last_name, program } = student;
  
  // Get initials or display name
  const displayName = `${last_name.toUpperCase()}, ${first_name}`;

  return (
    <div className="manila-folder" onClick={onClick}>
      {/* Visual hanging folder tab */}
      <div className="manila-tab">
        {last_name.substring(0, 3).toUpperCase()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span className="manila-folder-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {displayName}
          {program && program.includes(' & ') && (
            <span style={{
              fontSize: '8px',
              background: '#b38600',
              color: '#fff',
              padding: '1px 5px',
              borderRadius: '3px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Dual Enrolled
            </span>
          )}
        </span>
        <span style={{ fontSize: '11px', color: 'rgba(0,0,0,0.4)', fontWeight: 500 }}>
          ID: #{String(student.id).padStart(5, '0')}
        </span>
      </div>

      <div className="manila-folder-program">
        {program}
      </div>
    </div>
  );
};
