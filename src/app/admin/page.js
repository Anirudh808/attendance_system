"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StaffTable from '@/components/admin/StaffTable';
import '@/styles/Admin.css';

export default function AdminPanel() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState('');
  
  // Data states
  const [staffList, setStaffList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // UI states
  const [alert, setAlert] = useState(null);

  // Authenticate user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('authToken');
    if (!storedUser || !storedToken) {
      router.push('/');
      return;
    }
    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== 'ADMIN') {
        router.push('/');
        return;
      }
      setAuthToken(storedToken);
      setCheckingAuth(false);
    } catch (e) {
      router.push('/');
      return;
    }
  }, [router]);

  // Fetch staff list when authenticated
  useEffect(() => {
    if (checkingAuth || !authToken) return;
    fetchStaffList();
  }, [checkingAuth, authToken]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchStaffList = async () => {
    setLoadingList(true);
    try {
      const response = await fetch('/api/admin/staff', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch staff list');
      setStaffList(data);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setLoadingList(false);
    }
  };

  const handleRowClick = (staffId) => {
    router.push(`/admin/${staffId}`);
  };

  if (checkingAuth) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Authorizing...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1>🛡️ Admin Panel</h1>
          </div>
          <div className="header-actions">
            <Link href="/" className="btn btn-secondary">
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Alert Banner */}
        {alert && (
          <div style={{ padding: '0 32px', marginTop: '20px' }}>
            <div className={`alert alert-${alert.type}`}>
              {alert.message}
            </div>
          </div>
        )}

        {/* List View */}
        <div className="table-container">
          <div className="section-title">
            <span>Employee Registry</span>
          </div>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loader" style={{ margin: '0 auto 10px' }}></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <StaffTable staffList={staffList} onRowClick={handleRowClick} />
          )}
        </div>
      </div>
    </div>
  );
}
