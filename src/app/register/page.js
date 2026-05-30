"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import '../../styles/Register.css';

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India center as default

/**
 * MapWidget handles rendering of the interactive map, placing a draggable marker,
 * and performing places autocomplete searches to pan the map.
 * Declared inside the provider context to enable maps SDK hooks.
 */
function MapWidget({ markerPosition, setMarkerPosition, setWorkAddress }) {
  const map = useMap();
  const autocompleteInputRef = useRef(null);
  const placesLibrary = useMapsLibrary('places');

  useEffect(() => {
    if (!map || !placesLibrary || !autocompleteInputRef.current) return;

    // Initialize Places Autocomplete on search input
    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
      fields: ['geometry', 'formatted_address', 'name'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        const newPos = { lat, lng };
        setMarkerPosition(newPos);
        setWorkAddress(place.formatted_address || place.name || '');
        
        // Pan the map and zoom in on search result location
        map.panTo(newPos);
        map.setZoom(16);
      }
    });
  }, [map, placesLibrary, setMarkerPosition, setWorkAddress]);

  const handleMapClick = (event) => {
    if (event.latLng) {
      setMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      });
    }
  };

  const handleMarkerDragEnd = (event) => {
    if (event.latLng) {
      setMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      });
    }
  };

  return (
    <>
      <div className="map-search-container">
        <input
          ref={autocompleteInputRef}
          type="text"
          placeholder="🔍 Search location or address..."
          className="map-search-input"
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        />
      </div>
      <div className="map-wrapper">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={13}
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI={true}
        >
          <Marker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        </Map>
      </div>
    </>
  );
}

export default function Register() {
  const router = useRouter();
  
  // State for form fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [workLat, setWorkLat] = useState(DEFAULT_CENTER.lat);
  const [workLon, setWorkLon] = useState(DEFAULT_CENTER.lng);
  
  // Image state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  // Form submission and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Map marker position and API loading states
  const [markerPosition, setMarkerPosition] = useState(DEFAULT_CENTER);
  const [apiLoaded, setApiLoaded] = useState(false);
  
  const fileInputRef = useRef(null);

  // Synchronize marker position state to workLat/workLon and perform reverse geocoding
  useEffect(() => {
    setWorkLat(markerPosition.lat);
    setWorkLon(markerPosition.lng);
    
    // Call geocoder to auto-fill address if maps API is loaded
    if (
      typeof window !== 'undefined' && 
      window.google && 
      window.google.maps && 
      typeof window.google.maps.Geocoder === 'function'
    ) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: markerPosition }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setWorkAddress(results[0].formatted_address);
        }
      });
    }
  }, [markerPosition, apiLoaded]);

  // Handle profile image file selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Front-end validations
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (workLat < -90 || workLat > 90 || workLon < -180 || workLon > 180) {
      setError('Invalid latitude or longitude coordinates.');
      return;
    }

    if (!imageFile) {
      setError('Please upload a profile photo.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('id', id);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('department', department);
      formData.append('workLat', workLat.toString());
      formData.append('workLon', workLon.toString());
      formData.append('workAddress', workAddress);
      formData.append('image', imageFile);

      // Call API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      setSuccess(true);
      // Clean form on success
      setId('');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDepartment('');
      setWorkAddress('');
      setImageFile(null);
      setImagePreview('');

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <APIProvider 
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''} 
      libraries={['places', 'geocoding']}
      onLoad={() => setApiLoaded(true)}
    >
      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1>Staff Registration</h1>
            <Link href="/" className="back-to-login">← Back to Login</Link>
          </div>

          {success ? (
            <div className="success-banner">
              <h4>Registration Successful!</h4>
              <p>You have registered successfully. Redirecting you to login in 3 seconds...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-body">
              {/* Form Fields Section */}
              <div className="register-form-section">
                {error && <div className="error-banner">{error}</div>}

                {/* Photo Upload Zone */}
                <div className="photo-upload-container">
                  <div className="photo-preview-box" onClick={triggerFileSelect}>
                    {imagePreview ? (
                      <img src={imagePreview} className="photo-preview-image" alt="Profile preview" />
                    ) : (
                      <div className="photo-upload-placeholder">
                        <span>📸</span>
                        <strong>Upload Photo</strong>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={loading}
                  />
                  <span className="upload-hint">Upload face photo for verification (JPG/PNG)</span>
                </div>

                <div className="form-grid">
                  <div className="form-group-row">
                    <div className="form-field">
                      <label htmlFor="staff-id">Staff ID</label>
                      <input
                        id="staff-id"
                        type="text"
                        placeholder="e.g. EMP100"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="staff-name">Full Name</label>
                      <input
                        id="staff-name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-row">
                    <div className="form-field">
                      <label htmlFor="staff-email">Email Address</label>
                      <input
                        id="staff-email"
                        type="email"
                        placeholder="john.doe@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="staff-dept">Department</label>
                      <select
                        id="staff-dept"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        disabled={loading}
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="Engineering">Engineering</option>
                        <option value="HR">HR</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="Operations">Operations</option>
                        <option value="Finance">Finance</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group-row">
                    <div className="form-field">
                      <label htmlFor="staff-pass">Password</label>
                      <input
                        id="staff-pass"
                        type="password"
                        placeholder="Min 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="staff-conf-pass">Confirm Password</label>
                      <input
                        id="staff-conf-pass"
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="staff-addr">Work Location Address</label>
                    <input
                      id="staff-addr"
                      type="text"
                      placeholder="Drop a pin on the map to autofill, or enter address"
                      value={workAddress}
                      onChange={(e) => setWorkAddress(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group-row">
                    <div className="form-field">
                      <label htmlFor="staff-lat">Work Latitude</label>
                      <input
                        id="staff-lat"
                        type="number"
                        step="any"
                        value={workLat}
                        onChange={(e) => setWorkLat(parseFloat(e.target.value) || 0)}
                        disabled={loading}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="staff-lon">Work Longitude</label>
                      <input
                        id="staff-lon"
                        type="number"
                        step="any"
                        value={workLon}
                        onChange={(e) => setWorkLon(parseFloat(e.target.value) || 0)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="register-button"
                >
                  {loading ? 'Registering...' : 'Register Staff'}
                </button>
              </div>

              {/* Map Widget Section */}
              <div className="register-map-section">
                <h3>📍 Select Work Location on Map</h3>
                <MapWidget
                  markerPosition={markerPosition}
                  setMarkerPosition={setMarkerPosition}
                  setWorkAddress={setWorkAddress}
                />
              </div>
            </form>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
