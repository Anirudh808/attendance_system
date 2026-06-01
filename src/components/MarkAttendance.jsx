"use client";

import React, { useRef, useState, useEffect } from 'react';
import { markAttendance, getAttendanceStatus } from '../services/api';
import { getCurrentLocation, formatDistance } from '../utils/helpers';
import CameraPortal from './attendance/CameraPortal';
import LocationDisplay from './attendance/LocationDisplay';
import '../styles/MarkAttendance.css';

/**
 * MarkAttendance component coordinates location verification and webcam-based face comparison
 * to register staff attendance.
 *
 * @param {Object} props
 * @param {Object} props.user - The current logged-in user details
 */
export default function MarkAttendance({ user }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedWorkLocationId, setSelectedWorkLocationId] = useState('');
  const [attendanceType, setAttendanceType] = useState('CHECK_IN');
  const [isCheckedIn, setIsCheckedIn] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const locationPromiseRef = useRef(null);

  useEffect(() => {
    if (!selectedWorkLocationId) {
      setIsCheckedIn(null);
      return;
    }

    setLoadingStatus(true);
    setError('');
    getAttendanceStatus(selectedWorkLocationId)
      .then((res) => {
        const checkedIn = res.data.checkedIn;
        setIsCheckedIn(checkedIn);
        setAttendanceType(checkedIn ? 'CHECK_OUT' : 'CHECK_IN');
      })
      .catch((err) => {
        console.error('Error fetching location check-in status:', err);
        setError('Failed to load check-in status for this location.');
      })
      .finally(() => {
        setLoadingStatus(false);
      });
  }, [selectedWorkLocationId]);

  /**
   * Triggers location tracking and activates the camera portal.
   */
  const handleMarkAttendance = () => {
    setError('');
    setSuccess(null);
    setLoading(true);
    setLocation(null);
    setCapturedImage(null);
    setCameraActive(true);

    // Initialize GPS coordinates retrieval and store promise to handle manual override races
    locationPromiseRef.current = getCurrentLocation()
      .then((loc) => {
        setLocation(loc);
        return loc;
      })
      .catch((err) => {
        const msg = err.message || 'Failed to acquire location. Please ensure location permissions are enabled.';
        setError(msg);
        setCameraActive(false);
        setLoading(false);
        throw err;
      });
  };

  /**
   * Callback invoked when a face image is captured.
   * Resolves geolocation, verifies both details against backend, and registers check-in.
   *
   * @param {string} img - Base64 Data URL screenshot
   */
  const handleCapture = async (img) => {
    setCapturedImage(img);

    try {
      if (!locationPromiseRef.current) {
        throw new Error('Location acquisition has not been initiated.');
      }
      // Wait for GPS coordinates fetch to complete if it is still loading
      const loc = await locationPromiseRef.current;

      const response = await markAttendance(
        loc.latitude,
        loc.longitude,
        loc.timestamp,
        loc.accuracy,
        img,
        selectedWorkLocationId,
        attendanceType
      );

      setSuccess({
        message: response.data.message,
        status: response.data.status,
        distance: response.data.distance,
        recordId: response.data.recordId,
      });

      // Update local check-in status
      const nextCheckedIn = attendanceType === 'CHECK_IN';
      setIsCheckedIn(nextCheckedIn);
      setAttendanceType(nextCheckedIn ? 'CHECK_OUT' : 'CHECK_IN');

      setCameraActive(false);
      setCapturedImage(null);
    } catch (err) {
      console.error('Mark attendance failure:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to mark attendance. Verification mismatch or server issue.'
      );
      setCameraActive(false);
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Callback to handle camera errors.
   */
  const handleCameraError = (errMsg) => {
    setError(errMsg);
    setCameraActive(false);
    setCapturedImage(null);
    setLoading(false);
  };

  const currentWorkLocation = user?.workLocations?.find(loc => loc.id === selectedWorkLocationId);

  return (
    <div className="mark-attendance-container">
      <div className="mark-card">
        <h2>Mark Attendance</h2>

        {/* Work Location Dropdown */}
        {!cameraActive && (
          <div className="work-location-select-container">
            <label htmlFor="work-location-select">Select Work Location</label>
            <select
              id="work-location-select"
              value={selectedWorkLocationId}
              onChange={(e) => setSelectedWorkLocationId(e.target.value)}
              className="work-location-dropdown"
              disabled={loading}
            >
              <option value="">-- Choose a location --</option>
              {user?.workLocations?.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} (Lat: {loc.workLat.toFixed(4)}, Lon: {loc.workLon.toFixed(4)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Attendance Action Selector */}
        {!cameraActive && (
          <div className="action-type-container">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Select Action Type</span>
              {loadingStatus && <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 'normal' }}>⏳ Checking status...</span>}
            </label>
            <div className="segmented-control">
              <button
                type="button"
                className={`control-btn ${attendanceType === 'CHECK_IN' ? 'active check-in' : ''}`}
                onClick={() => setAttendanceType('CHECK_IN')}
                disabled={loading || loadingStatus || !selectedWorkLocationId || isCheckedIn === true}
              >
                📥 Check In
              </button>
              <button
                type="button"
                className={`control-btn ${attendanceType === 'CHECK_OUT' ? 'active check-out' : ''}`}
                onClick={() => setAttendanceType('CHECK_OUT')}
                disabled={loading || loadingStatus || !selectedWorkLocationId || isCheckedIn === false}
              >
                📤 Sign Off
              </button>
            </div>
          </div>
        )}

        {/* Location verification display or compact status */}
        {!cameraActive ? (
          <LocationDisplay user={user} location={location} selectedWorkLocation={currentWorkLocation} />
        ) : (
          <div className="camera-location-status">
            {location ? '🟢 Location acquired' : '⏳ Acquiring GPS location...'}
          </div>
        )}

        {/* Camera portal overlay */}
        <CameraPortal
          isActive={cameraActive}
          onCapture={handleCapture}
          onError={handleCameraError}
          capturedImage={capturedImage}
        />

        {/* Error message card */}
        {error && <div className="error-box">{error}</div>}

        {/* Success message card */}
        {success && (
          <div className={`success-box ${success.status === 'PRESENT' ? 'present' : 'absent'}`}>
            <h4>{success.message}</h4>
            <p>Distance: {formatDistance(success.distance)}</p>
            <small>Record ID: {success.recordId}</small>
          </div>
        )}

        {/* Action button */}
        {!cameraActive && (
          <div className="button-group">
            <button
              onClick={handleMarkAttendance}
              disabled={loading || loadingStatus || !selectedWorkLocationId || isCheckedIn === null}
              className={`success-button ${attendanceType === 'CHECK_OUT' ? 'sign-off-btn' : ''}`}
            >
              {loading ? 'Processing...' : loadingStatus ? 'Checking Status...' : attendanceType === 'CHECK_IN' ? '✓ Mark Check-In' : '✗ Mark Sign-Off'}
            </button>
          </div>
        )}

        {/* Settings Info */}
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
