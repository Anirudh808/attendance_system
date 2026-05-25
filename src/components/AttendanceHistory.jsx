"use client";

import React, { useState, useEffect } from 'react';
import { getAttendanceRecords } from '../services/api';
import { formatDate, formatTime, formatDistance } from '../utils/helpers';
import '../styles/AttendanceHistory.css';

export default function AttendanceHistory({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const limit = 10;

  useEffect(() => {
    fetchRecords();
  }, [page]);

  const fetchRecords = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getAttendanceRecords(limit, page * limit);
      setRecords(response.data.records);
      setTotalRecords(response.data.total);
    } catch (err) {
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const groupRecordsByDate = (records) => {
    const grouped = {};
    records.forEach((record) => {
      const date = formatDate(record.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const groupedRecords = groupRecordsByDate(records);

  return (
    <div className="attendance-history-container">
      <div className="history-card">
        <h2>Attendance History</h2>

        {error && <div className="error-box">{error}</div>}

        {loading && <div className="loading">Loading records...</div>}

        {!loading && records.length === 0 && (
          <div className="empty-state">
            <p>No attendance records yet</p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="records-list">
            {Object.entries(groupedRecords).map(([date, dayRecords]) => (
              <div key={date} className="date-group">
                <h3 className="date-header">{date}</h3>
                <div className="records">
                  {dayRecords.map((record) => (
                    <div key={record.id} className={`record-item ${record.status.toLowerCase()}`}>
                      <div className="record-header">
                        <span className="time">{formatTime(record.timestamp)}</span>
                        <span className={`status ${record.status.toLowerCase()}`}>
                          {record.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                        </span>
                      </div>
                      <div className="record-details">
                        <div className="detail">
                          <span className="label">Distance:</span>
                          <span className="value">{formatDistance(record.distanceFromWork)}</span>
                        </div>
                        <div className="detail">
                          <span className="label">Location:</span>
                          <span className="value">
                            {record.currentLocation.latitude.toFixed(4)}, {record.currentLocation.longitude.toFixed(4)}
                          </span>
                        </div>
                        <div className="detail">
                          <span className="label">Remarks:</span>
                          <span className="value">{record.remarks}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalRecords > limit && (
          <div className="pagination">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="pagination-button"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {page + 1} of {Math.ceil(totalRecords / limit)} ({totalRecords} total)
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= totalRecords}
              className="pagination-button"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
