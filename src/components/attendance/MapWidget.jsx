import React, { useEffect, useRef } from 'react';
import { Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai, India center as default

/**
 * Reusable MapWidget component handles Google Maps rendering, places autocomplete,
 * clicking on the map to relocate the marker, and dragging the marker.
 */
export default function MapWidget({ markerPosition, setMarkerPosition, setWorkAddress }) {
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
