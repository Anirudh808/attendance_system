"use client";

import React, { useState } from 'react';
import '../styles/Dashboard.css';
import MarkAttendance from './MarkAttendance';
import AttendanceHistory from './AttendanceHistory';
import Profile from './Profile';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('mark');
  console.log('User in Dashboard:', user); // Debugging line to check user data
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome, {user?.name}</h1>
          <p>{user?.department} • {user?.email}</p>
        </div>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>

      <div className="dashboard-nav">
        <button
          className={`nav-button ${activeTab === 'mark' ? 'active' : ''}`}
          onClick={() => setActiveTab('mark')}
        >
          📍 Mark
        </button>
        <button
          className={`nav-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 History
        </button>
        <button
          className={`nav-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'mark' && <MarkAttendance user={user} />}
        {activeTab === 'history' && <AttendanceHistory user={user} />}
        {activeTab === 'profile' && <Profile user={user} />}
      </div>
    </div>
  );
}
