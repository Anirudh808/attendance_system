"use client";

import React, { useState } from 'react';
import '../styles/Profile.css';

export default function Profile({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pwAlert, setPwAlert] = useState(null);

  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPwAlert(null);

    // Frontend validation
    if (newPassword !== confirmNewPassword) {
      setPwAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 4) {
      setPwAlert({ type: 'error', message: 'New password must be at least 4 characters.' });
      return;
    }

    setUpdatingPassword(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update password');

      setPwAlert({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPwAlert({ type: 'error', message: err.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="avatar">{getInitials(user?.name)}</div>
          <h2>{user?.name}</h2>
          <p className="department">{user?.department}</p>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>Personal Information</h3>
            <div className="detail-item">
              <span className="label">Staff ID</span>
              <span className="value">{user?.id}</span>
            </div>
            <div className="detail-item">
              <span className="label">Email</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="detail-item">
              <span className="label">Department</span>
              <span className="value">{user?.department}</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>Work Location</h3>
            <div className="location-display">
              <p className="address">📍 {user?.workLocation?.address}</p>
              <div className="coordinates">
                <div className="coord">
                  <span className="label">Latitude:</span>
                  <span className="value">{user?.workLocation?.latitude}</span>
                </div>
                <div className="coord">
                  <span className="label">Longitude:</span>
                  <span className="value">{user?.workLocation?.longitude}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Attendance Settings</h3>
            <div className="setting-item">
              <span className="label">Acceptance Radius</span>
              <span className="value">50 meters</span>
            </div>
            <div className="setting-item">
              <span className="label">Location Verification</span>
              <span className="value">Enabled ✓</span>
            </div>
          </div>

          <div className="detail-section">
            <h3>🔑 Change Password</h3>
            <form onSubmit={handlePasswordUpdate} className="password-form">
              {pwAlert && (
                <div className={`alert alert-${pwAlert.type}`} style={{ padding: '10px 14px', fontSize: '13px', margin: '0 0 12px 0', borderRadius: '8px', borderLeft: '4px solid' }}>
                  {pwAlert.message}
                </div>
              )}
              <div className="password-field-group">
                <div className="form-field">
                  <label htmlFor="current-pw">Current Password</label>
                  <input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={updatingPassword}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="new-pw">New Password</label>
                  <input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    disabled={updatingPassword}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="confirm-new-pw">Confirm New Password</label>
                  <input
                    id="confirm-new-pw"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    disabled={updatingPassword}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-submit-pw" disabled={updatingPassword}>
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="tips-section">
            <h3>📝 Tips for Marking Attendance</h3>
            <ul>
              <li>Enable GPS and ensure accurate location access</li>
              <li>Make sure you are within 50 meters of your work location</li>
              <li>Maintain a stable internet connection</li>
              <li>Mark attendance as soon as you arrive at work</li>
              <li>Check your location accuracy before confirming</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
