"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import AttendanceHistoryPanel from '@/components/admin/AttendanceHistoryPanel';
import LocationsPanel from '@/components/admin/LocationsPanel';
import '@/styles/Admin.css';

export default function AdminStaffDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState('');
  
  // Data states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // UI states
  const [alert, setAlert] = useState(null);
  const [apiLoaded, setApiLoaded] = useState(false);

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
        setCheckingAuth(false);
      } catch (e) {
        console.error('Admin authentication error:', e);
        router.push('/');
      }
    }
    checkAuth();
  }, [router]);

  // Fetch staff detail when authenticated
  useEffect(() => {
    if (checkingAuth || !authToken || !id) return;
    fetchStaffDetail(id);
  }, [checkingAuth, authToken, id]);

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const fetchStaffDetail = async (staffId) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch details');
      setSelectedStaff(data);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setLoadingDetail(false);
    }
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
    <APIProvider 
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
      libraries={['places', 'geocoding']}
      onLoad={() => setApiLoaded(true)}
    >
      <div className="admin-container">
        <div className="admin-card">
          {/* Header */}
          <div className="admin-header">
            <div>
              <h1>🛡️ Admin Panel</h1>
              {selectedStaff && (
                <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '16px' }}>
                  Manage profile and coordinates for <strong style={{ color: '#1f2937', fontSize: '18px'}}>{selectedStaff.name}</strong> (ID: {selectedStaff.id})
                </p>
              )}
            </div>
            <div className="header-actions">
              <Link href="/admin" className="btn btn-secondary">
                ← Back to Users
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

          {/* Details Content */}
          {loadingDetail && !selectedStaff ? (
            <div style={{ textAlign: 'center', padding: '80px' }}>
              <div className="loader" style={{ margin: '0 auto 10px' }}></div>
              <p>Loading details...</p>
            </div>
          ) : selectedStaff ? (
            <div className="detail-body">
              <AttendanceHistoryPanel staff={selectedStaff} />
              <LocationsPanel 
                staff={selectedStaff} 
                authToken={authToken} 
                triggerAlert={triggerAlert} 
                onRefresh={() => fetchStaffDetail(id)} 
              />
            </div>
          ) : (
            <div className="empty-state">
              <span>⚠️</span>
              <p>Unable to load profile data.</p>
            </div>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
