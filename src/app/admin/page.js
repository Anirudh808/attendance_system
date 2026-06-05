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
  const [currentAdminId, setCurrentAdminId] = useState('');
  
  // Data states
  const [staffList, setStaffList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // UI states
  const [alert, setAlert] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Authenticate user on mount
  useEffect(() => {
    async function checkAuth() {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        router.push('/');
        return;
      }
      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (!response.ok) {
          localStorage.removeItem('authToken');
          router.push('/');
          return;
        }
        const data = await response.json();
        if (data.role !== 'ADMIN') {
          router.push('/');
          return;
        }
        setAuthToken(storedToken);
        setCurrentAdminId(data.id);
        setCheckingAuth(false);
      } catch (e) {
        console.error('Admin authentication error:', e);
        router.push('/');
      }
    }
    checkAuth();
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

  const handleDelete = async (staffId) => {
    if (!authToken) return;
    setDeletingId(staffId);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete staff account');
      
      triggerAlert('success', `Staff member "${deleteConfirm.name}" has been successfully deleted.`);
      setDeleteConfirm(null);
      fetchStaffList();
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStaffList = staffList.filter((staff) =>
    staff.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset pagination to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Pagination bounds and slicing
  const totalItems = filteredStaffList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  
  const paginatedStaffList = filteredStaffList.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

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
            <div className="registry-title-search">
              <span>Employee Registry</span>
              <div className="registry-search-container">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="registry-search-input"
                />
              </div>
            </div>
          </div>
          {loadingList ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="loader" style={{ margin: '0 auto 10px' }}></div>
              <p>Loading users...</p>
            </div>
          ) : (
            <>
              <StaffTable 
                staffList={paginatedStaffList} 
                onRowClick={handleRowClick} 
                onDeleteClick={(id, name) => setDeleteConfirm({ id, name })}
                currentAdminId={currentAdminId}
              />
              
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                  >
                    Previous
                  </button>
                  <span className="page-info">
                    Page {activePage} of {totalPages}
                  </span>
                  <button
                    className="pagination-button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-danger">
              <h2>⚠️ Confirm Account Deletion</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the staff account for <strong>{deleteConfirm.name}</strong> (ID: <code>{deleteConfirm.id}</code>)?</p>
              <p className="text-danger-subtle">
                This action cannot be undone. All attendance records and custom work locations for this user will be permanently deleted from the database.
              </p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId === deleteConfirm.id}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deletingId === deleteConfirm.id}
              >
                {deletingId === deleteConfirm.id ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
