/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c; // Distance in meters
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
