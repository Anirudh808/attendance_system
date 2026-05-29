"use client";

import React, { useRef, useState } from 'react';
import { markAttendance } from '../services/api';
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

  const locationPromiseRef = useRef(null);

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
        img
      );

      setSuccess({
        message: response.data.message,
        status: response.data.status,
        distance: response.data.distance,
        recordId: response.data.recordId,
      });

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

  return (
    <div className="mark-attendance-container">
      <div className="mark-card">
        <h2>Mark Attendance</h2>

        {/* Location verification display or compact status */}
        {!cameraActive ? (
          <LocationDisplay user={user} location={location} />
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
              disabled={loading}
              className="success-button"
            >
              {loading ? 'Processing...' : '✓ Mark Attendance'}
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
