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
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const getGroupedAttendance = (attendanceList) => {
    if (!attendanceList) return [];
    
    // Group records by calendar day
    const groups = {};
    attendanceList.forEach(rec => {
      const date = new Date(rec.timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(rec);
    });

    const sortedGrouped = Object.entries(groups).map(([dateStr, records]) => {
      // Sort records for this day chronologically (earliest first)
      const sortedDayRecords = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Group records by workLocationId for this day
      const locationGroups = {};
      sortedDayRecords.forEach(rec => {
        const locId = rec.workLocationId || 'unknown';
        if (!locationGroups[locId]) {
          locationGroups[locId] = [];
        }
        locationGroups[locId].push(rec);
      });

      // Pair check-ins and check-outs for each location
      const sessions = [];
      Object.entries(locationGroups).forEach(([locId, locRecords]) => {
        let i = 0;
        while (i < locRecords.length) {
          const current = locRecords[i];
          if (current.attendanceType === 'CHECK_IN' || !current.attendanceType) {
            // Find the next CHECK_OUT for this location
            let checkOut = null;
            let j = i + 1;
            while (j < locRecords.length) {
              if (locRecords[j].attendanceType === 'CHECK_OUT') {
                checkOut = locRecords[j];
                break;
              }
              j++;
            }

            if (checkOut) {
              let durationStr = 'N/A';
              const diffMs = new Date(checkOut.timestamp) - new Date(current.timestamp);
              if (diffMs > 0) {
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                durationStr = `${diffHrs}h ${diffMins}m`;
              }

              sessions.push({
                locationName: current.workLocationName || 'Configured Location',
                checkIn: current,
                checkOut: checkOut,
                durationStr,
                id: `${current.id}-${checkOut.id}`
              });
              // Skip past the checkOut
              i = j + 1;
            } else {
              sessions.push({
                locationName: current.workLocationName || 'Configured Location',
                checkIn: current,
                checkOut: null,
                durationStr: 'N/A',
                id: current.id
              });
              i++;
            }
          } else {
            // It's a CHECK_OUT without a preceding CHECK_IN (orphan checkout)
            sessions.push({
              locationName: current.workLocationName || 'Configured Location',
              checkIn: null,
              checkOut: current,
              durationStr: 'N/A',
              id: current.id
            });
            i++;
          }
        }
      });

      // Sort sessions chronologically by their check-in (or check-out) time
      sessions.sort((a, b) => {
        const timeA = new Date((a.checkIn || a.checkOut).timestamp).getTime();
        const timeB = new Date((b.checkIn || b.checkOut).timestamp).getTime();
        return timeA - timeB;
      });

      let sortTime = 0;
      if (sessions.length > 0) {
        sortTime = new Date((sessions[sessions.length - 1].checkIn || sessions[sessions.length - 1].checkOut).timestamp).getTime();
      }

      return {
        dateStr,
        sessions,
        sortTime
      };
    }).sort((a, b) => b.sortTime - a.sortTime);

    return sortedGrouped;
  };

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

  // Fetch staff list or selected staff details when authenticated
  useEffect(() => {
    if (checkingAuth || !authToken) return;
    
    // Check if there is a staff ID query parameter on mount
    const params = new URLSearchParams(window.location.search);
    const staffIdParam = params.get('id');
    if (staffIdParam) {
      fetchStaffDetail(staffIdParam);
    }
    
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
    setDateFilter('');
    setLocationFilter('');
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
    // Persist selected staff ID in URL parameters
    const url = new URL(window.location.href);
    url.searchParams.set('id', staffId);
    window.history.pushState({}, '', url.toString());
    
    fetchStaffDetail(staffId);
  };

  const handleBackToList = () => {
    // Clear URL parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url.toString());

    setSelectedStaff(null);
    setEditorMode(null);
    setDateFilter('');
    setLocationFilter('');
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
                <div className="section-title" style={{ marginBottom: '10px' }}>
                  <span>📋 Day-wise Attendance History</span>
                </div>

                {/* Filters Bar */}
                <div className="history-filter-bar">
                  <div className="filter-group">
                    <label htmlFor="attendance-date-filter">Date:</label>
                    <input
                      id="attendance-date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="date-filter-input"
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor="attendance-location-filter">Location:</label>
                    <select
                      id="attendance-location-filter"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                      className="location-filter-select"
                    >
                      <option value="">All Locations</option>
                      {selectedStaff.workLocations?.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(dateFilter || locationFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('');
                        setLocationFilter('');
                      }}
                      className="btn-clear-filter"
                    >
                      Clear Filters
                    </button>
                  )}
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
                ) : (() => {
                  const filteredAttendance = selectedStaff.attendance?.filter(rec => {
                    if (dateFilter) {
                      const date = new Date(rec.timestamp);
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      const recDateStr = `${yyyy}-${mm}-${dd}`;
                      if (recDateStr !== dateFilter) return false;
                    }
                    if (locationFilter) {
                      if (rec.workLocationId !== locationFilter) return false;
                    }
                    return true;
                  });
                  const dayLogs = getGroupedAttendance(filteredAttendance);
                  
                  if (dayLogs.length === 0) {
                    return (
                      <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', padding: '24px' }}>
                        <span>🔍</span>
                        <p>No records found for the selected filters.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="day-wise-logs">
                      {dayLogs.map((day, idx) => (
                        <div key={idx} className="day-log-card">
                          <div className="day-log-header">
                            <span className="day-date">{day.dateStr}</span>
                            <span className="day-sessions-count">🔄 {day.sessions?.length} Session(s)</span>
                          </div>
                          <div className="day-sessions-container">
                            {day.sessions.map((session, sIdx) => (
                              <div key={session.id || sIdx} className="session-item-row">
                                <div className="session-subheader">
                                  <span className="session-loc">📍 {session.locationName}</span>
                                  <span className="session-duration">⏱️ Duration: {session.durationStr}</span>
                                </div>
                                <div className="day-log-details">
                                  <div className="log-action check-in-action">
                                    <div className="action-header">
                                      <span className="action-badge check-in">Check In</span>
                                      {session.checkIn ? (
                                        <span className="action-time">
                                          {new Date(session.checkIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      ) : (
                                        <span className="action-time missing">Missing</span>
                                      )}
                                    </div>
                                    {session.checkIn ? (
                                      <div className="action-meta">
                                        <p><strong>Accuracy:</strong> ±{session.checkIn.currentLocation?.accuracy || 0}m</p>
                                        <p><strong>Distance:</strong> {session.checkIn.distanceFromWork?.toFixed(1)}m away</p>
                                        <p className="remarks">📝 {session.checkIn.remarks}</p>
                                      </div>
                                    ) : (
                                      <div className="action-meta empty">
                                        <p>No check-in record.</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="log-action check-out-action">
                                    <div className="action-header">
                                      <span className="action-badge check-out">Sign Off</span>
                                      {session.checkOut ? (
                                        <span className="action-time">
                                          {new Date(session.checkOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      ) : (
                                        <span className="action-time missing">Missing</span>
                                      )}
                                    </div>
                                    {session.checkOut ? (
                                      <div className="action-meta">
                                        <p><strong>Accuracy:</strong> ±{session.checkOut.currentLocation?.accuracy || 0}m</p>
                                        <p><strong>Distance:</strong> {session.checkOut.distanceFromWork?.toFixed(1)}m away</p>
                                        <p className="remarks">📝 {session.checkOut.remarks}</p>
                                      </div>
                                    ) : (
                                      <div className="action-meta empty">
                                        <p>No sign-off record.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
