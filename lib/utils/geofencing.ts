import { Location } from '@/lib/types';

/**
 * Calculate distance between two locations in kilometers
 * Uses Haversine formula for great-circle distance
 */
export function getDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine distance in meters between two coordinates
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const km = getDistance({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 });
  return km * 1000;
}

export type ProximityLevel = 'far' | 'approaching' | 'nearby' | 'arrived';

/**
 * Check proximity of a bus to a pickup location.
 * Returns:
 * - 'far'        : > 500m
 * - 'approaching': 200–500m
 * - 'nearby'     : 50–200m
 * - 'arrived'    : < 50m
 */
export function checkProximity(
  busLocation: { lat: number; lng: number } | null | undefined,
  pickupLocation: { lat: number; lng: number } | null | undefined
): ProximityLevel | null {
  if (!busLocation || !pickupLocation) return null;

  const distanceMeters = haversineDistance(
    busLocation.lat,
    busLocation.lng,
    pickupLocation.lat,
    pickupLocation.lng
  );

  if (distanceMeters < 50) return 'arrived';
  if (distanceMeters < 200) return 'nearby';
  if (distanceMeters < 500) return 'approaching';
  return 'far';
}

/**
 * Check if a location is within a certain radius of a center point
 * @param location - Location to check
 * @param center - Center point
 * @param radiusKm - Radius in kilometers
 * @returns true if location is within radius
 */
export function isWithinRadius(
  location: { lat: number; lng: number },
  center: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const distance = getDistance(location, center);
  return distance <= radiusKm;
}

/**
 * Check if a location is within Butwal service area
 * Uses BUTWAL_CENTER as the center point
 * Default radius: 20km (covers Butwal and surrounding areas)
 */
export function isWithinButwalServiceArea(
  location: { lat: number; lng: number },
  radiusKm: number = 20
): boolean {
  const BUTWAL_CENTER = { lat: 27.6588, lng: 83.4534 };
  return isWithinRadius(location, BUTWAL_CENTER, radiusKm);
}

/**
 * Find the nearest bus to a given location
 * @param location - Location to find nearest bus for
 * @param buses - Array of buses with currentLocation
 * @returns The nearest bus or null if no buses available
 */
export function findNearestBus(
  location: { lat: number; lng: number },
  buses: Array<{ id: string; currentLocation: Location; isActive: boolean }>
): { id: string; distance: number } | null {
  const activeBuses = buses.filter((bus) => bus.isActive);

  if (activeBuses.length === 0) {
    return null;
  }

  let nearestBus: { id: string; distance: number } | null = null;
  let minDistance = Infinity;

  for (const bus of activeBuses) {
    const distance = getDistance(location, bus.currentLocation);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBus = { id: bus.id, distance };
    }
  }

  return nearestBus;
}

/**
 * Check if a bus is near a pickup location
 * @param busLocation - Bus current location
 * @param pickupLocation - Pickup location
 * @param thresholdKm - Distance threshold in kilometers (default: 0.5km = 500m)
 * @returns true if bus is within threshold
 */
export function isBusNearPickup(
  busLocation: { lat: number; lng: number },
  pickupLocation: { lat: number; lng: number },
  thresholdKm: number = 0.5
): boolean {
  return isWithinRadius(busLocation, pickupLocation, thresholdKm);
}

