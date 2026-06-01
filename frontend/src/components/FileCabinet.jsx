// ============================================================
// src/components/FileCabinet.jsx
// Root Skeuomorphic container coordinating drawers and portal
// ============================================================
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Folder, PlusCircle, Database, RefreshCw } from 'lucide-react';
import { Drawer } from './Drawer';
import { AdminEntryForm } from './AdminEntryForm';
import { FolderList } from './FolderList';
import { StudentModal } from './StudentModal';
import { useStudents } from '../hooks/useStudents';
import { api } from '../api/client';

export const FileCabinet = ({ user, onLogout }) => {
  const [openDrawer, setOpenDrawer] = useState(null); // 'entry' | 'records' | null
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Custom hook for student records
  const {
    students,
    currentStudent,
    loading,
    error,
    fetchStudents,
    fetchStudentById,
    addStudent,
    updateStudent,
    linkDriveFolder,
  } = useStudents();

  // Load students on mount and filter changes
  useEffect(() => {
    if (openDrawer === 'records') {
      fetchStudents();
    }
  }, [openDrawer, fetchStudents]);

  const handleToggleDrawer = (drawerName) => {
    setOpenDrawer((prev) => (prev === drawerName ? null : drawerName));
  };

  const handleSelectStudent = async (studentId) => {
    try {
      const fullDetail = await fetchStudentById(studentId);
      setSelectedStudent(fullDetail);
    } catch (err) {
      alert('Failed to load student details.');
    }
  };

  const handleCloseModal = () => {
    setSelectedStudent(null);
  };

  return (
    <div className="cabinet-wrapper">
      <div className="cabinet-container">
        
        {/* Logout / Admin Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>
            LOGGED IN AS: <span style={{ color: 'var(--gold)' }}>{user?.username?.toUpperCase()} ({user?.role?.toUpperCase()})</span>
          </div>
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '4px',
              color: '#fff',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <LogOut size={14} />
            SECURE LOGOUT
          </button>
        </div>

        {/* Logo / Header Plate */}
        <div className="cabinet-header">
          <div className="logo-plate">
            <h1>RAPHAEL O. WHEATLEY SKILL CENTER</h1>
            <p>Student Management Portal & Digital File Cabinet</p>
          </div>
        </div>

        {/* Drawer 1: Admin Manual Entry (Fallback) */}
        <Drawer
          title="Manual Student Intake"
          subtitle="New Student Registration Fallback"
          isOpen={openDrawer === 'entry'}
          onToggle={() => handleToggleDrawer('entry')}
          icon={<PlusCircle size={20} color="var(--gold)" />}
        >
          <AdminEntryForm 
            onSubmitSuccess={() => {
              // Toggle to records drawer after successfully adding a student
              setOpenDrawer('records');
            }} 
            addStudent={addStudent}
          />
        </Drawer>

        {/* Drawer 2: Active Student Records */}
        <Drawer
          title="Active Student Records"
          subtitle="Manage & Search Enrolled Students"
          isOpen={openDrawer === 'records'}
          onToggle={() => handleToggleDrawer('records')}
          icon={<Folder size={20} color="var(--gold)" />}
        >
          <FolderList
            students={students}
            loading={loading}
            error={error}
            onSelectFolder={handleSelectStudent}
            onRefresh={fetchStudents}
          />
        </Drawer>

        {/* Cabinet Foot / Bottom base shadow */}
        <div style={{
          height: '24px',
          background: 'linear-gradient(to bottom, #001a50 0%, #000c25 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: 'rgba(255, 255, 255, 0.3)',
          letterSpacing: '1px',
        }}>
          EST. 1980 | OFFICIAL SCHOOL RECORDS CABINET
        </div>
      </div>

      {/* 3D Paper Modal Overlay */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentModal
            student={selectedStudent}
            onClose={handleCloseModal}
            linkDriveFolder={async (id, drive_link) => {
              const res = await linkDriveFolder(id, drive_link);
              setSelectedStudent(prev => ({ ...prev, drive_link: res.student.drive_link }));
              return res;
            }}
            updateStudent={async (id, data) => {
              const res = await updateStudent(id, data);
              setSelectedStudent(res.student);
              return res;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
