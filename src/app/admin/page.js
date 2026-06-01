"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import MapWidget from '@/components/attendance/MapWidget';
import '@/styles/Admin.css';

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India default

export default function AdminPanel() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authToken, setAuthToken] = useState('');
  
  // Data states
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // UI states
  const [alert, setAlert] = useState(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  
  // Location editor states
  const [editorMode, setEditorMode] = useState(null); // 'add' or 'edit' or null
  const [targetLocationId, setTargetLocationId] = useState('');
  const [locName, setLocName] = useState('');
  const [markerPosition, setMarkerPosition] = useState(DEFAULT_CENTER);
  const [formSaving, setFormSaving] = useState(false);

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

  const fetchStaffDetail = async (id) => {
    setLoadingDetail(true);
    setEditorMode(null);
    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
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

  const handleRowClick = (staffId) => {
    fetchStaffDetail(staffId);
  };

  const handleBackToList = () => {
    setSelectedStaff(null);
    setEditorMode(null);
  };

  const handleStartAddLocation = () => {
    setEditorMode('add');
    setTargetLocationId('');
    setLocName('');
    setMarkerPosition(DEFAULT_CENTER);
  };

  const handleStartEditLocation = (loc) => {
    setEditorMode('edit');
    setTargetLocationId(loc.id);
    setLocName(loc.name);
    setMarkerPosition({ lat: loc.workLat, lng: loc.workLon });
  };

  const handleCancelEditor = () => {
    setEditorMode(null);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locName.trim()) {
      triggerAlert('error', 'Location name is required');
      return;
    }
    setFormSaving(true);

    try {
      let response;
      if (editorMode === 'add') {
        response = await fetch('/api/admin/work-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            userId: selectedStaff.id,
            name: locName,
            workLat: markerPosition.lat,
            workLon: markerPosition.lng
          })
        });
      } else {
        response = await fetch(`/api/admin/work-location/${targetLocationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            name: locName,
            workLat: markerPosition.lat,
            workLon: markerPosition.lng
          })
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');

      triggerAlert('success', data.message || 'Location saved successfully');
      setEditorMode(null);
      // Reload details to get refreshed list
      await fetchStaffDetail(selectedStaff.id);
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm('Are you sure you want to delete this work location?')) return;
    
    try {
      const response = await fetch(`/api/admin/work-location/${locId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Deletion failed');

      triggerAlert('success', data.message || 'Location deleted successfully');
      if (editorMode === 'edit' && targetLocationId === locId) {
        setEditorMode(null);
      }
      await fetchStaffDetail(selectedStaff.id);
    } catch (err) {
      triggerAlert('error', err.message);
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
              {selectedStaff && <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Manage employee profile and coordinates</p>}
            </div>
            <div className="header-actions">
              {selectedStaff ? (
                <button onClick={handleBackToList} className="btn btn-secondary">
                  ← Back to Users
                </button>
              ) : (
                <Link href="/" className="btn btn-secondary">
                  ← Dashboard
                </Link>
              )}
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
          {!selectedStaff && (
            <div className="table-container">
              <div className="section-title">
                <span>Employee Registry</span>
              </div>
              {loadingList ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="loader" style={{ margin: '0 auto 10px' }}></div>
                  <p>Loading users...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="empty-state">
                  <span>👥</span>
                  <p>No registered employees found.</p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Staff ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((staff) => (
                      <tr 
                        key={staff.id} 
                        onClick={() => handleRowClick(staff.id)}
                        className="clickable-row"
                      >
                        <td><strong>{staff.id}</strong></td>
                        <td>{staff.name}</td>
                        <td>{staff.email}</td>
                        <td>{staff.department}</td>
                        <td>
                          <span className={`badge ${staff.role === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>
                            {staff.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Detail View */}
          {selectedStaff && (
            <div className="detail-body">
              {/* Left Side: Attendance History */}
              <div className="detail-left">
                <div className="section-title">
                  <span>📋 Attendance History</span>
                </div>
                {loadingDetail ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="loader" style={{ margin: '0 auto 10px' }}></div>
                    <p>Loading details...</p>
                  </div>
                ) : selectedStaff.attendance?.length === 0 ? (
                  <div className="empty-state">
                    <span>📅</span>
                    <p>No attendance records logged for this employee.</p>
                  </div>
                ) : (
                  <table className="admin-table" style={{ fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Status</th>
                        <th>Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStaff.attendance?.map((rec) => (
                        <tr key={rec.id}>
                          <td>{new Date(rec.timestamp).toLocaleString()}</td>
                          <td>
                            <span className={`badge ${rec.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                              {rec.status}
                            </span>
                          </td>
                          <td>{rec.distanceFromWork.toFixed(1)}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Right Side: Locations Manager */}
              <div className="detail-right">
                <div className="section-title">
                  <span>📍 Work Locations</span>
                  {!editorMode && (
                    <button onClick={handleStartAddLocation} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      + Add Location
                    </button>
                  )}
                </div>

                {/* Form to Add/Edit Work Location */}
                {editorMode && (
                  <form onSubmit={handleSaveLocation} className="location-form">
                    <div className="section-title" style={{ fontSize: '14px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                      <span>{editorMode === 'add' ? 'New Work Location' : 'Edit Work Location'}</span>
                    </div>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="loc-name-input">Location Name / Address</label>
                        <input
                          id="loc-name-input"
                          type="text"
                          placeholder="e.g. Coimbatore Branch, Sitra Office"
                          value={locName}
                          onChange={(e) => setLocName(e.target.value)}
                          disabled={formSaving}
                          required
                        />
                      </div>
                    </div>

                    <div className="map-section">
                      <h4>Pinpoint Location</h4>
                      <MapWidget
                        markerPosition={markerPosition}
                        setMarkerPosition={setMarkerPosition}
                        setWorkAddress={setLocName}
                      />
                    </div>

                    <div className="form-actions">
                      <button type="button" onClick={handleCancelEditor} className="btn btn-secondary" disabled={formSaving}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-success" disabled={formSaving}>
                        {formSaving ? 'Saving...' : 'Save Location'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Existing locations listing */}
                <div className="locations-list">
                  {selectedStaff.workLocations?.map((loc) => (
                    <div key={loc.id} className="location-item">
                      <div className="loc-details">
                        <h4>{loc.name}</h4>
                        <p>Lat: {loc.workLat.toFixed(5)}, Lon: {loc.workLon.toFixed(5)}</p>
                      </div>
                      <div className="loc-actions">
                        <button 
                          onClick={() => handleStartEditLocation(loc)} 
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          disabled={editorMode !== null}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteLocation(loc.id)} 
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          disabled={editorMode !== null}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedStaff.workLocations?.length === 0 && (
                    <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                      <span>📍</span>
                      <p>No work locations configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
