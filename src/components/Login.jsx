"use client";

import React, { useState } from 'react';
import { login } from '../services/api';
import '../styles/Login.css';

export default function Login({ onLoginSuccess }) {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(staffId, password);
      const { token, staff } = response.data;

      // Save to localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(staff));

      onLoginSuccess(staff);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">📍</div>
          <h1>Staff Attendance</h1>
          <p>Mark your attendance securely</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="staffId">Staff ID</label>
            <input
              id="staffId"
              type="text"
              placeholder="e.g., EMP001"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Test Credentials:</p>
          <div className="credentials-list">
            <small>EMP001 / password123</small>
            <small>EMP002 / password456</small>
            <small>EMP003 / password789</small>
          </div>
        </div>
      </div>
    </div>
  );
}
