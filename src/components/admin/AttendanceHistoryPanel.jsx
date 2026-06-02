import React, { useState } from 'react';

export default function AttendanceHistoryPanel({ staff }) {
  const [dateFilter, setDateFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const getGroupedAttendance = (attendanceList) => {
    if (!attendanceList) return [];
    
    // Group records by calendar day
    const groups = {};
    attendanceList.forEach(rec => {
      const date = new Date(rec.timestamp);
      const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(rec);
    });

    const sortedGrouped = Object.entries(groups).map(([dateStr, records]) => {
      // Sort records for this day chronologically (earliest first)
      const sortedDayRecords = [...records].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Group records by workLocationId for this day
      const locationGroups = {};
      sortedDayRecords.forEach(rec => {
        const locId = rec.workLocationId || 'unknown';
        if (!locationGroups[locId]) {
          locationGroups[locId] = [];
        }
        locationGroups[locId].push(rec);
      });

      // Pair check-ins and check-outs for each location
      const sessions = [];
      Object.entries(locationGroups).forEach(([locId, locRecords]) => {
        let i = 0;
        while (i < locRecords.length) {
          const current = locRecords[i];
          if (current.attendanceType === 'CHECK_IN' || !current.attendanceType) {
            // Find the next CHECK_OUT for this location
            let checkOut = null;
            let j = i + 1;
            while (j < locRecords.length) {
              if (locRecords[j].attendanceType === 'CHECK_OUT') {
                checkOut = locRecords[j];
                break;
              }
              j++;
            }

            if (checkOut) {
              let durationStr = 'N/A';
              const diffMs = new Date(checkOut.timestamp) - new Date(current.timestamp);
              if (diffMs > 0) {
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                durationStr = `${diffHrs}h ${diffMins}m`;
              }

              sessions.push({
                locationName: current.workLocationName || 'Configured Location',
                checkIn: current,
                checkOut: checkOut,
                durationStr,
                id: `${current.id}-${checkOut.id}`
              });
              // Skip past the checkOut
              i = j + 1;
            } else {
              sessions.push({
                locationName: current.workLocationName || 'Configured Location',
                checkIn: current,
                checkOut: null,
                durationStr: 'N/A',
                id: current.id
              });
              i++;
            }
          } else {
            // It's a CHECK_OUT without a preceding CHECK_IN (orphan checkout)
            sessions.push({
              locationName: current.workLocationName || 'Configured Location',
              checkIn: null,
              checkOut: current,
              durationStr: 'N/A',
              id: current.id
            });
            i++;
          }
        }
      });

      // Sort sessions chronologically by their check-in (or check-out) time
      sessions.sort((a, b) => {
        const timeA = new Date((a.checkIn || a.checkOut).timestamp).getTime();
        const timeB = new Date((b.checkIn || b.checkOut).timestamp).getTime();
        return timeA - timeB;
      });

      let sortTime = 0;
      if (sessions.length > 0) {
        sortTime = new Date((sessions[sessions.length - 1].checkIn || sessions[sessions.length - 1].checkOut).timestamp).getTime();
      }

      return {
        dateStr,
        sessions,
        sortTime
      };
    }).sort((a, b) => b.sortTime - a.sortTime);

    return sortedGrouped;
  };

  const filteredAttendance = staff.attendance?.filter(rec => {
    if (dateFilter) {
      const date = new Date(rec.timestamp);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const recDateStr = `${yyyy}-${mm}-${dd}`;
      if (recDateStr !== dateFilter) return false;
    }
    if (locationFilter) {
      if (rec.workLocationId !== locationFilter) return false;
    }
    return true;
  });

  const dayLogs = getGroupedAttendance(filteredAttendance);

  return (
    <div className="detail-left">
      <div className="section-title" style={{ marginBottom: '10px' }}>
        <span>📋 Day-wise Attendance History</span>
      </div>

      {/* Filters Bar */}
      <div className="history-filter-bar">
        <div className="filter-group">
          <label htmlFor="attendance-date-filter">Date:</label>
          <input
            id="attendance-date-filter"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-input"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="attendance-location-filter">Location:</label>
          <select
            id="attendance-location-filter"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="location-filter-select"
          >
            <option value="">All Locations</option>
            {staff.workLocations?.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
        {(dateFilter || locationFilter) && (
          <button
            type="button"
            onClick={() => {
              setDateFilter('');
              setLocationFilter('');
            }}
            className="btn-clear-filter"
          >
            Clear Filters
          </button>
        )}
      </div>

      {staff.attendance?.length === 0 ? (
        <div className="empty-state">
          <span>📅</span>
          <p>No attendance records logged for this employee.</p>
        </div>
      ) : dayLogs.length === 0 ? (
        <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0', padding: '24px' }}>
          <span>🔍</span>
          <p>No records found for the selected filters.</p>
        </div>
      ) : (
        <div className="day-wise-logs">
          {dayLogs.map((day, idx) => (
            <div key={idx} className="day-log-card">
              <div className="day-log-header">
                <span className="day-date">{day.dateStr}</span>
                <span className="day-sessions-count">🔄 {day.sessions?.length} Session(s)</span>
              </div>
              <div className="day-sessions-container">
                {day.sessions.map((session, sIdx) => (
                  <div key={session.id || sIdx} className="session-item-row">
                    <div className="session-subheader">
                      <span className="session-loc">📍 {session.locationName}</span>
                      <span className="session-duration">⏱️ Duration: {session.durationStr}</span>
                    </div>
                    <div className="day-log-details">
                      <div className="log-action check-in-action">
                        <div className="action-header">
                          <span className="action-badge check-in">Check In</span>
                          {session.checkIn ? (
                            <span className="action-time">
                              {new Date(session.checkIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="action-time missing">Missing</span>
                          )}
                        </div>
                        {session.checkIn ? (
                          <div className="action-meta">
                            <p><strong>Accuracy:</strong> ±{session.checkIn.currentLocation?.accuracy || 0}m</p>
                            <p><strong>Distance:</strong> {session.checkIn.distanceFromWork?.toFixed(1)}m away</p>
                            <p className="remarks">📝 {session.checkIn.remarks}</p>
                          </div>
                        ) : (
                          <div className="action-meta empty">
                            <p>No check-in record.</p>
                          </div>
                        )}
                      </div>

                      <div className="log-action check-out-action">
                        <div className="action-header">
                          <span className="action-badge check-out">Sign Off</span>
                          {session.checkOut ? (
                            <span className="action-time">
                              {new Date(session.checkOut.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="action-time missing">Missing</span>
                          )}
                        </div>
                        {session.checkOut ? (
                          <div className="action-meta">
                            <p><strong>Accuracy:</strong> ±{session.checkOut.currentLocation?.accuracy || 0}m</p>
                            <p><strong>Distance:</strong> {session.checkOut.distanceFromWork?.toFixed(1)}m away</p>
                            <p className="remarks">📝 {session.checkOut.remarks}</p>
                          </div>
                        ) : (
                          <div className="action-meta empty">
                            <p>No sign-off record.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
