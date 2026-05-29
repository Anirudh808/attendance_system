"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { getAttendanceRecords } from '../services/api';
import { formatDate } from '../utils/helpers';
import AttendanceRecordItem from './attendance/AttendanceRecordItem';
import '../styles/AttendanceHistory.css';

/**
 * AttendanceHistory displays a paginated chronological view of the staff member's attendance log entries.
 *
 * @param {Object} props
 * @param {Object} props.user - The current logged-in user details
 */
export default function AttendanceHistory({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);

  const limit = 10;

  /**
   * Fetches attendance logs from the server.
   */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getAttendanceRecords(limit, page * limit);
      setRecords(response.data.records);
      setTotalRecords(response.data.total);
    } catch (err) {
      console.error('Error fetching records:', err);
      setError('Failed to fetch attendance records. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /**
   * Helper function to group records by calendar date.
   *
   * @param {Array} recordsList - Raw records
   * @returns {Object} Mapped calendar date to records arrays
   */
  const groupRecordsByDate = (recordsList) => {
    const grouped = {};
    recordsList.forEach((record) => {
      const date = formatDate(record.timestamp);
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(record);
    });
    return grouped;
  };

  const groupedRecords = groupRecordsByDate(records);
  const totalPages = Math.ceil(totalRecords / limit);

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
                    <AttendanceRecordItem key={record.id} record={record} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalRecords > limit && (
          <div className="pagination">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="pagination-button"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {page + 1} of {totalPages} ({totalRecords} total)
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
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
