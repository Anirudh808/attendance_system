"use client";

import React from 'react';
import '../styles/Profile.css';

export default function Profile({ user }) {
  const getInitials = (name) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
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
