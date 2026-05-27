// ============================================================
// src/hooks/useStudents.js
// Custom hook to manage student operations
// ============================================================
import { useState, useCallback } from 'react';
import { api } from '../api/client';

export const useStudents = () => {
  const [students, setStudents] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudents(filters);
      setStudents(data.students || []);
    } catch (err) {
      console.error('fetchStudents error:', err);
      setError(err.response?.data?.error || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentById(id);
      setCurrentStudent(data);
      return data;
    } catch (err) {
      console.error('fetchStudentById error:', err);
      setError(err.response?.data?.error || 'Failed to load student details.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addStudent = async (studentData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createStudent(studentData);
      setStudents((prev) => [...prev, res.student].sort((a, b) => 
        a.last_name.localeCompare(b.last_name)
      ));
      return res;
    } catch (err) {
      console.error('addStudent error:', err);
      setError(err.response?.data?.error || 'Failed to create student.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, updateStudent = async (id, studentData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.updateStudent(id, studentData);
      setStudents((prev) => 
        prev.map((s) => (s.id === id ? { ...s, ...res.student } : s))
      );
      if (currentStudent && currentStudent.id === id) {
        setCurrentStudent(res.student);
      }
      return res;
    } catch (err) {
      console.error('updateStudent error:', err);
      setError(err.response?.data?.error || 'Failed to update student.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, linkDriveFolder = async (id, drive_link) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.updateDriveLink(id, drive_link);
      setStudents((prev) => 
        prev.map((s) => (s.id === id ? { ...s, drive_link: res.student.drive_link } : s))
      );
      if (currentStudent && currentStudent.id === id) {
        setCurrentStudent((prev) => ({ ...prev, drive_link: res.student.drive_link }));
      }
      return res;
    } catch (err) {
      console.error('linkDriveFolder error:', err);
      setError(err.response?.data?.error || 'Failed to link Google Drive folder.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    students,
    currentStudent,
    loading,
    error,
    fetchStudents,
    fetchStudentById,
    addStudent,
    updateStudent,
    linkDriveFolder,
    setCurrentStudent,
  };
};
