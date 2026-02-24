import { haversineDistance } from './geofencing';

/**
 * Calculate road distance multiplier based on straight-line distance
 * Road distance is typically 1.3-1.5x straight-line distance in cities
 * For longer distances, the multiplier decreases
 */
function getRoadDistanceMultiplier(straightLineKm: number): number {
  if (straightLineKm < 1) return 1.5; // Short distances: 50% longer
  if (straightLineKm < 5) return 1.4; // Medium distances: 40% longer
  if (straightLineKm < 10) return 1.3; // Longer distances: 30% longer
  return 1.2; // Very long distances: 20% longer
}

/**
 * Calculate Estimated Time of Arrival (ETA) in minutes
 * Uses road distance approximation (not straight-line) to account for actual travel paths
 * @param driverLocation - Current driver location
 * @param passengerLocation - Passenger location
 * @param speedKmh - Average speed in km/h (default: 30 km/h for city traffic)
 * @returns ETA in minutes, or null if unable to calculate
 * 
 * NOTE: For production, consider using a routing API (Google Maps, OSRM, Mapbox)
 * to get actual road-based distances and travel times.
 */
export function calculateETA(
  driverLocation: { lat: number; lng: number },
  passengerLocation: { lat: number; lng: number },
  speedKmh: number = 30
): number | null {
  if (!driverLocation || !passengerLocation) {
    return null;
  }

  // Calculate straight-line distance
  const straightLineMeters = haversineDistance(
    driverLocation.lat,
    driverLocation.lng,
    passengerLocation.lat,
    passengerLocation.lng
  );

  if (straightLineMeters <= 0) {
    return 0; // Already arrived
  }

  // Convert to kilometers
  const straightLineKm = straightLineMeters / 1000;
  
  // Apply road distance multiplier to account for actual road paths
  // (roads are not straight lines, they follow streets and routes)
  const roadMultiplier = getRoadDistanceMultiplier(straightLineKm);
  const roadDistanceKm = straightLineKm * roadMultiplier;

  // Calculate time based on road distance
  const timeHours = roadDistanceKm / speedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);

  return Math.max(1, timeMinutes); // At least 1 minute
}

/**
 * Format ETA as a human-readable string
 * @param etaMinutes - ETA in minutes
 * @returns Formatted string like "Arriving in 5 mins" or "Arriving now"
 */
export function formatETA(etaMinutes: number | null): string {
  if (etaMinutes === null) {
    return 'Calculating...';
  }

  if (etaMinutes === 0) {
    return 'Arriving now';
  }

  if (etaMinutes === 1) {
    return 'Arriving in 1 min';
  }

  return `Arriving in ${etaMinutes} mins`;
}

/**
 * Calculate distance in a human-readable format
 * @param driverLocation - Current driver location
 * @param passengerLocation - Passenger location
 * @returns Formatted string like "2.5 km" or "150 m"
 */
export function formatDistance(
  driverLocation: { lat: number; lng: number },
  passengerLocation: { lat: number; lng: number }
): string {
  if (!driverLocation || !passengerLocation) {
    return 'Unknown';
  }

  const distanceMeters = haversineDistance(
    driverLocation.lat,
    driverLocation.lng,
    passengerLocation.lat,
    passengerLocation.lng
  );

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  const distanceKm = distanceMeters / 1000;
  return `${distanceKm.toFixed(1)} km`;
}

