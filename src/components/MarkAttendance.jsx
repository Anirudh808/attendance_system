"use client";

import React, { useState } from 'react';
import { markAttendance } from '../services/api';
import { getCurrentLocation, formatDistance, formatTime } from '../utils/helpers';
import '../styles/MarkAttendance.css';

export default function MarkAttendance({ user }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = async () => {
    setError('');
    setGettingLocation(true);

    try {
      const loc = await getCurrentLocation();
      console.log('Current Location:', loc);
      setLocation(loc);
    } catch (err) {
      setError(`Failed to get location: ${err.message}`);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!location) {
      setError('Please get your location first');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await markAttendance(
        location.latitude,
        location.longitude,
        location.timestamp, 
        location.accuracy,
      );

      setSuccess({
        message: response.data.message,
        status: response.data.status,
        distance: response.data.distance,
        recordId: response.data.recordId,
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to mark attendance'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mark-attendance-container">
      <div className="mark-card">
        <h2>Mark Attendance</h2>

        {/* Work Location Info */}
        <div className="info-box">
          <h3>📍 Work Location</h3>
          <p>
            {user?.workLocation?.address || 'Configured Location'}
          </p>
          <small>
            Lat: {user?.workLocation?.latitude.toFixed(4)}, Lon:{' '}
            {user?.workLocation?.longitude.toFixed(4)}
          </small>
        </div>

        {/* Current Location */}
        {location && (
          <div className="info-box location-box">
            <h3>🛰️ Your Current Location</h3>
            <p>
              Lat: {location.latitude.toFixed(4)}, Lon:{' '}
              {location.longitude.toFixed(4)}
            </p>
            <small>Accuracy: ±{Math.round(location.accuracy)}m</small>
            <small style={{ marginTop: '8px', display: 'block' }}>
              Time: {formatTime(location.timestamp)}
            </small>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-box">{error}</div>}

        {/* Success Message */}
        {success && (
          <div className={`success-box ${success.status === 'PRESENT' ? 'present' : 'absent'}`}>
            <h4>{success.message}</h4>
            <p>Distance: {formatDistance(success.distance)}</p>
            <small>Record ID: {success.recordId}</small>
          </div>
        )}

        {/* Buttons */}
        <div className="button-group">
          <button
            onClick={handleGetLocation}
            disabled={gettingLocation || loading}
            className="primary-button"
          >
            {gettingLocation ? 'Getting Location...' : '📍 Get Location'}
          </button>

          <button
            onClick={handleMarkAttendance}
            disabled={!location || loading}
            className="success-button"
          >
            {loading ? 'Marking...' : '✓ Mark Attendance'}
          </button>
        </div>

        {/* Info */}
        <div className="info-text">
          <p>
            ℹ️ You must be within <strong>50 meters</strong> of your work location
            to mark attendance.
          </p>
        </div>
      </div>
    </div>
  );
}
