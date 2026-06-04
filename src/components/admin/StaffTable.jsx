import React from 'react';

export default function StaffTable({ staffList, onRowClick, onDeleteClick, currentAdminId }) {
  if (staffList.length === 0) {
    return (
      <div className="empty-state">
        <span>👥</span>
        <p>No registered employees found.</p>
      </div>
    );
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Staff ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Department</th>
          <th>Role</th>
          <th style={{ textAlign: 'center' }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {staffList.map((staff) => (
          <tr 
            key={staff.id} 
            onClick={() => onRowClick(staff.id)}
            className="clickable-row"
          >
            <td><strong>{staff.id}</strong></td>
            <td>{staff.name}</td>
            <td>{staff.email}</td>
            <td>{staff.department}</td>
            <td>
              <span className={`badge ${staff.role === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>
                {staff.role}
              </span>
            </td>
            <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
              {staff.id !== currentAdminId ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(staff.id, staff.name);
                  }}
                  className="btn-delete"
                  title="Delete Staff Member"
                >
                  🗑️
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>
                  Current Session
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
