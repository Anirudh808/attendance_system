import React, { useState, useEffect } from 'react';
import MapWidget from '@/components/attendance/MapWidget';

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India default

export default function LocationsPanel({ staff, authToken, triggerAlert, onRefresh }) {
  const [editorMode, setEditorMode] = useState(null); // 'add' or 'edit' or null
  const [targetLocationId, setTargetLocationId] = useState('');
  const [locName, setLocName] = useState('');
  const [markerPosition, setMarkerPosition] = useState(DEFAULT_CENTER);
  const [formSaving, setFormSaving] = useState(false);

  // Existing Locations Select States
  const [existingLocations, setExistingLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [selectedExistingIndex, setSelectedExistingIndex] = useState('');

  // Fetch unique existing locations across the system
  const fetchExistingLocations = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/admin/work-location', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch existing locations');
      setExistingLocations(data);
    } catch (err) {
      console.error('Fetch existing locations error:', err.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Fetch locations on mount when token is available
  useEffect(() => {
    if (authToken) {
      fetchExistingLocations();
    }
  }, [authToken]);

  const handleStartAddLocation = () => {
    setEditorMode('add');
    setTargetLocationId('');
    setLocName('');
    setMarkerPosition(DEFAULT_CENTER);
    setSelectedExistingIndex('');
    fetchExistingLocations(); // Refresh list on opening add form
  };

  const handleStartEditLocation = (loc) => {
    setEditorMode('edit');
    setTargetLocationId(loc.id);
    setLocName(loc.name);
    setMarkerPosition({ lat: loc.workLat, lng: loc.workLon });
    setSelectedExistingIndex('');
  };

  const handleCancelEditor = () => {
    setEditorMode(null);
  };

  const handleSelectExistingChange = (e) => {
    const idx = e.target.value;
    setSelectedExistingIndex(idx);
    if (idx === '') {
      setLocName('');
      setMarkerPosition(DEFAULT_CENTER);
    } else {
      const selected = existingLocations[idx];
      setLocName(selected.name);
      setMarkerPosition({ lat: selected.workLat, lng: selected.workLon });
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!locName.trim()) {
      triggerAlert('error', 'Location name is required');
      return;
    }
    setFormSaving(true);

    try {
      let response;
      if (editorMode === 'add') {
        response = await fetch('/api/admin/work-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            userId: staff.id,
            name: locName,
            workLat: markerPosition.lat,
            workLon: markerPosition.lng
          })
        });
      } else {
        response = await fetch(`/api/admin/work-location/${targetLocationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            name: locName,
            workLat: markerPosition.lat,
            workLon: markerPosition.lng
          })
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');

      triggerAlert('success', data.message || 'Location saved successfully');
      setEditorMode(null);
      fetchExistingLocations(); // Refresh unique locations list
      await onRefresh();
    } catch (err) {
      triggerAlert('error', err.message);
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteLocation = async (locId) => {
    if (!window.confirm('Are you sure you want to delete this work location?')) return;
    
    try {
      const response = await fetch(`/api/admin/work-location/${locId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Deletion failed');

      triggerAlert('success', data.message || 'Location deleted successfully');
      if (editorMode === 'edit' && targetLocationId === locId) {
        setEditorMode(null);
      }
      fetchExistingLocations(); // Refresh unique locations list
      await onRefresh();
    } catch (err) {
      triggerAlert('error', err.message);
    }
  };

  return (
    <div className="detail-right">
      <div className="section-title">
        <span>📍 Work Locations</span>
        {!editorMode && (
          <button onClick={handleStartAddLocation} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            + Add Location
          </button>
        )}
      </div>

      {/* Form to Add/Edit Work Location */}
      {editorMode && (
        <form onSubmit={handleSaveLocation} className="location-form">
          <div className="section-title" style={{ fontSize: '14px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
            <span>{editorMode === 'add' ? 'New Work Location' : 'Edit Work Location'}</span>
          </div>
          <div className="form-grid">
            {editorMode === 'add' && (
              <div className="form-field" style={{ marginBottom: '12px' }}>
                <label htmlFor="existing-loc-select">Choose from Existing Locations</label>
                {loadingLocations ? (
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '6px 0' }}>Loading locations...</p>
                ) : (
                  <select
                    id="existing-loc-select"
                    value={selectedExistingIndex}
                    onChange={handleSelectExistingChange}
                    className="location-select-dropdown"
                    disabled={formSaving}
                  >
                    <option value="">-- Create a new custom location --</option>
                    {existingLocations.map((loc, idx) => (
                      <option key={idx} value={idx}>
                        {loc.name} ({parseFloat(loc.workLat).toFixed(4)}, {parseFloat(loc.workLon).toFixed(4)})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="form-field">
              <label htmlFor="loc-name-input">
                {editorMode === 'add' && selectedExistingIndex !== '' ? 'Location Name (Selected Existing)' : 'Location Name / Address'}
              </label>
              <input
                id="loc-name-input"
                type="text"
                placeholder="e.g. Coimbatore Branch, Sitra Office"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                disabled={formSaving || (editorMode === 'add' && selectedExistingIndex !== '')}
                required
              />
            </div>
          </div>

          <div className="map-section">
            <h4>
              {editorMode === 'add' && selectedExistingIndex !== '' ? 'Work Location Pin' : 'Pinpoint Location'}
            </h4>
            <MapWidget
              markerPosition={markerPosition}
              setMarkerPosition={setMarkerPosition}
              setWorkAddress={setLocName}
              readOnly={editorMode === 'add' && selectedExistingIndex !== ''}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={handleCancelEditor} className="btn btn-secondary" disabled={formSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={formSaving}>
              {formSaving ? 'Saving...' : 'Save Location'}
            </button>
          </div>
        </form>
      )}

      {/* Existing locations listing */}
      <div className="locations-list">
        {staff.workLocations?.map((loc) => (
          <div key={loc.id} className="location-item">
            <div className="loc-details">
              <h4>{loc.name}</h4>
              <p>Lat: {loc.workLat.toFixed(5)}, Lon: {loc.workLon.toFixed(5)}</p>
            </div>
            <div className="loc-actions">
              <button 
                onClick={() => handleStartEditLocation(loc)} 
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                disabled={editorMode !== null}
              >
                ✏️ Edit
              </button>
              <button 
                onClick={() => handleDeleteLocation(loc.id)} 
                className="btn btn-danger"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                disabled={editorMode !== null}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        {staff.workLocations?.length === 0 && (
          <div className="empty-state" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <span>📍</span>
            <p>No work locations configured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
