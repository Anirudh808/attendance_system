import React from 'react';
import { formatTime } from '../../utils/helpers';

/**
 * LocationDisplay component renders both the target office location details
 * and the user's resolved GPS location (if available).
 *
 * @param {Object} props
 * @param {Object} props.user - Current logged-in user object
 * @param {Object} [props.location] - Resolved user coordinates and accuracy
 */
export default function LocationDisplay({ user, location }) {
  const workLat = user?.workLocation?.latitude;
  const workLon = user?.workLocation?.longitude;

  return (
    <div className="location-display-wrapper">
      {/* Target Work Location */}
      <div className="info-box">
        <h3>📍 Work Location</h3>
        <p>{user?.workLocation?.address || 'Configured Location'}</p>
        {workLat !== undefined && workLon !== undefined && (
          <small>
            Lat: {workLat.toFixed(4)}, Lon: {workLon.toFixed(4)}
          </small>
        )}
      </div>

      {/* Resolved GPS Coordinates */}
      {location && (
        <div className="info-box location-box">
          <h3>🛰️ Your Current Location</h3>
          <p>
            Lat: {location.latitude.toFixed(4)}, Lon: {location.longitude.toFixed(4)}
          </p>
          <small>Accuracy: ±{Math.round(location.accuracy)}m</small>
          <small style={{ marginTop: '8px', display: 'block' }}>
            Time: {formatTime(location.timestamp)}
          </small>
        </div>
      )}
    </div>
  );
}
