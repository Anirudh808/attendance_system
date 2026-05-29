import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

/**
 * CameraPortal component handles webcam rendering, portal overlays,
 * countdown auto-capture, and manual screenshot triggers.
 *
 * @param {Object} props
 * @param {boolean} props.isActive - Toggle webcam activation status
 * @param {Function} props.onCapture - Callback triggered on screenshot capture
 * @param {Function} props.onError - Callback to report errors
 */
export default function CameraPortal({ isActive, onCapture, onError, capturedImage }) {
  const webcamRef = useRef(null);
  const [message, setMessage] = useState('Position your face inside the circle');
  
  // Use ref to keep track of the latest capture handler in timeout closures
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  const captureImage = () => {
    if (!webcamRef.current) {
      throw new Error('Camera feed not initialized');
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      throw new Error('Failed to take screenshot from camera');
    }
    return imageSrc;
  };

  // Set instructions when camera becomes active
  useEffect(() => {
    if (isActive) {
      setMessage('Position your face inside the circle');
    }
  }, [isActive]);

  const handleManualCapture = () => {
    try {
      const img = captureImage();
      if (img && onCapture) {
        onCapture(img);
      }
    } catch (err) {
      console.error('Camera manual capture failed:', err);
      if (onError) {
        onError('Manual capture failed. Please try again.');
      }
    }
  };

  if (!isActive) return null;

  return (
    <div className="camera-portal-wrapper">
      <div className="camera-container">
        {capturedImage ? (
          <img
            src={capturedImage}
            className="camera-video camera-frozen"
            alt="Captured face"
          />
        ) : (
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
        )}
        <div className="portal-overlay" />
      </div>
      <div className="camera-instructions">
        {capturedImage ? 'Image captured! Processing...' : message}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={handleManualCapture}
          className="capture-button"
          disabled={!!capturedImage}
          type="button"
        >
          {capturedImage ? 'Processing...' : 'Capture Now'}
        </button>
      </div>
    </div>
  );
}
