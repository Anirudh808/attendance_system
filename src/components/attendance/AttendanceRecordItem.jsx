import React from 'react';
import { formatTime, formatDistance, getStatusDisplay } from '../../utils/helpers';

/**
 * AttendanceRecordItem renders a single attendance log entry.
 *
 * @param {Object} props
 * @param {Object} props.record - The attendance record details
 */
export default function AttendanceRecordItem({ record }) {
  const isPresent = record.status === 'PRESENT';
  const itemClass = isPresent ? 'record-item present' : 'record-item absent';
  const statusClass = isPresent ? 'status present' : 'status absent';
  
  const lat = record.currentLocation?.latitude;
  const lon = record.currentLocation?.longitude;

  return (
    <div className={itemClass}>
      <div className="record-header">
        <span className="time">{formatTime(record.timestamp)}</span>
        <span className={statusClass}>
          {getStatusDisplay(record.status)}
        </span>
      </div>
      <div className="record-details">
        <div className="detail">
          <span className="label">Distance:</span>
          <span className="value">{formatDistance(record.distanceFromWork)}</span>
        </div>
        
        {lat !== undefined && lon !== undefined && (
          <div className="detail">
            <span className="label">Location:</span>
            <span className="value">
              {lat.toFixed(4)}, {lon.toFixed(4)}
            </span>
          </div>
        )}

        <div className="detail">
          <span className="label">Remarks:</span>
          <span className="value">{record.remarks}</span>
        </div>
      </div>
    </div>
  );
}
