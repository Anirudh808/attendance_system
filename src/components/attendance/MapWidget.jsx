import React, { useEffect, useRef } from 'react';
import { Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India center as default

/**
 * Reusable MapWidget component handles Google Maps rendering, places autocomplete,
 * clicking on the map to relocate the marker, and dragging the marker.
 */
export default function MapWidget({ markerPosition, setMarkerPosition, setWorkAddress, readOnly = false }) {
  const map = useMap();
  const autocompleteInputRef = useRef(null);
  const placesLibrary = useMapsLibrary('places');

  // Autocomplete search box setup (only in editable mode)
  useEffect(() => {
    if (readOnly || !map || !placesLibrary || !autocompleteInputRef.current) return;

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
        
        map.panTo(newPos);
        map.setZoom(16);
      }
    });
  }, [map, placesLibrary, setMarkerPosition, setWorkAddress, readOnly]);

  // Smoothly pan map to center when marker position changes (e.g. on dropdown selection)
  useEffect(() => {
    if (map && markerPosition) {
      map.panTo(markerPosition);
    }
  }, [map, markerPosition]);

  const handleMapClick = (event) => {
    if (readOnly) return;
    if (event.latLng) {
      setMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      });
    }
  };

  const handleMarkerDragEnd = (event) => {
    if (readOnly) return;
    if (event.latLng) {
      setMarkerPosition({
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      });
    }
  };

  return (
    <>
      {!readOnly && (
        <div className="map-search-container">
          <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="🔍 Search location or address..."
            className="map-search-input"
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
          />
        </div>
      )}
      <div className="map-wrapper">
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={13}
          onClick={readOnly ? null : handleMapClick}
          gestureHandling={readOnly ? "none" : "greedy"}
          disableDefaultUI={true}
        >
          <Marker
            position={markerPosition}
            draggable={!readOnly}
            onDragEnd={readOnly ? null : handleMarkerDragEnd}
          />
        </Map>
      </div>
    </>
  );
}
