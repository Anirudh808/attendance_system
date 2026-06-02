import React from 'react';

export default function StaffTable({ staffList, onRowClick }) {
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
