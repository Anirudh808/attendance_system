/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // distance between latitudes
  // and longitudes
  let dLat = (lat2 - lat1) * Math.PI / 180.0;
  let dLon = (lon2 - lon1) * Math.PI / 180.0;
    
  // convert to radiansa
  lat1 = (lat1) * Math.PI / 180.0;
  lat2 = (lat2) * Math.PI / 180.0;
  
  // apply formulae
  let a = Math.pow(Math.sin(dLat / 2), 2) + 
          Math.pow(Math.sin(dLon / 2), 2) * 
          Math.cos(lat1) * 
          Math.cos(lat2);
  let rad = 6371000; // Radius of earth in meters
  let c = 2 * Math.asin(Math.sqrt(a));
  return rad * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Value in degrees
 * @returns {number} Value in radians
 */
const toRad = (degrees) => {
  return (degrees * Math.PI) / 180;
};

/**
 * Check if coordinates are within specified radius
 * @param {number} currentLat - Current latitude
 * @param {number} currentLon - Current longitude
 * @param {number} workLat - Work location latitude
 * @param {number} workLon - Work location longitude
 * @param {number} radiusMeters - Allowed radius in meters
 * @param {number} accuracy - GPS accuracy in meters
 * @returns {boolean} True if within radius
 */
export const isWithinRadius = (currentLat, currentLon, workLat, workLon, radiusMeters, accuracy) => {
  const distance = calculateDistance(currentLat, currentLon, workLat, workLon) - accuracy;
  return distance <= radiusMeters;
};
