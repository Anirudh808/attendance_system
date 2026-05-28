"use client";

import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { markAttendance } from '../services/api';
import { getCurrentLocation, formatDistance, formatTime } from '../utils/helpers';
import '../styles/MarkAttendance.css';

export default function MarkAttendance({ user }) {
  const webcamRef = useRef(null);
  const manualCaptureResolver = useRef(null);

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureMessage, setCaptureMessage] = useState('');

  const captureImage = async () => {
    if (!webcamRef.current) {
      throw new Error('Camera reference not available');
    }

    // Capture the current frame as a data URL
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      throw new Error('Failed to capture image from camera');
    }

    console.log('Image captured, size:', imageSrc.length);
    return imageSrc;
  };

  const requestManualCapture = () => {
    return new Promise((resolve) => {
      manualCaptureResolver.current = resolve;
    });
  };

  const captureNow = async () => {
    try {
      const img = await captureImage();
      if (manualCaptureResolver.current) {
        manualCaptureResolver.current(img);
        manualCaptureResolver.current = null;
      }
      return img;
    } catch (e) {
      console.error('captureNow error', e);
      setError('Manual capture failed.');
      return null;
    }
  };

  const captureFaceImage = async () => {
    setCameraActive(true);
    setCaptureMessage('Position your face inside the circle');

    // Auto-capture after 2.8 seconds or wait for manual capture
    const autoDelay = 2800;
    const autoPromise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const img = await captureImage();
          resolve(img);
        } catch (e) {
          console.error('Auto-capture failed', e);
          resolve(null);
        }
      }, autoDelay);
    });

    const manualPromise = requestManualCapture();
    const result = await Promise.race([autoPromise, manualPromise]);

    if (!result) {
      setCaptureMessage('Auto-capture timed out. Please press "Capture Now".');
      const retryResult = await requestManualCapture();
      return retryResult;
    }

    return result;
  };

  const handleMarkAttendance = async () => {
    setError('');
    setSuccess(null);
    setLoading(true);

    try {
      const locationPromise = getCurrentLocation();
      const capturePromise = captureFaceImage();
      const [loc, capturedImage] = await Promise.all([locationPromise, capturePromise]);

      setLocation(loc);

      const response = await markAttendance(
        loc.latitude,
        loc.longitude,
        loc.timestamp,
        loc.accuracy,
        capturedImage
      );

      setSuccess({
        message: response.data.message,
        status: response.data.status,
        distance: response.data.distance,
        recordId: response.data.recordId,
      });

      setCaptureMessage('');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to mark attendance'
      );
    } finally {
      setCameraActive(false);
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
          <p>{user?.workLocation?.address || 'Configured Location'}</p>
          <small>
            Lat: {user?.workLocation?.latitude.toFixed(4)}, Lon:{' '}
            {user?.workLocation?.longitude.toFixed(4)}
          </small>
        </div>

        {cameraActive && (
          <>
            <div className="camera-container">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.8}
                className="camera-video"
                videoConstraints={{
                  facingMode: 'user',
                  width: { ideal: 640 },
                  height: { ideal: 480 },
                }}
              />
              <div className="portal-overlay" />
            </div>
            <div className="camera-instructions">{captureMessage}</div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <button
                onClick={() => captureNow()}
                className="primary-button"
                type="button"
              >
                Capture Now
              </button>
            </div>
          </>
        )}

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
          <button onClick={handleMarkAttendance} disabled={loading} className="success-button">
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
