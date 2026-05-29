"use client";

import React, { useState } from 'react';
import '../styles/Dashboard.css';
import MarkAttendance from './MarkAttendance';
import AttendanceHistory from './AttendanceHistory';
import Profile from './Profile';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('mark');
  const [menuOpen, setMenuOpen] = useState(false);
  console.log('User in Dashboard:', user); // Debugging line to check user data
  
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome, {user?.name}</h1>
          <p>{user?.department} • {user?.email}</p>
        </div>
        
        {/* Desktop static logout button */}
        <button onClick={onLogout} className="logout-button">Logout</button>

        {/* Mobile Hamburger menu container */}
        <div className="menu-container">
          <button
            className={`hamburger-button ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
          
          {menuOpen && (
            <>
              <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="dropdown-menu">
                <div className="dropdown-user-info">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
                <hr className="dropdown-divider" />
                <button onClick={onLogout} className="dropdown-logout-button">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
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
