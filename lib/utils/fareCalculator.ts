import { VehicleTypeId } from '@/lib/types';
import { VEHICLE_TYPE_MAP } from '@/lib/constants';

/**
 * Calculate the distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Base fare rates for Butwal, Nepal (in NPR - Nepalese Rupees)
 */
const BASE_FARE_PER_KM = 2.5; // Base rate per kilometer
const MINIMUM_FARE = 15; // Minimum fare regardless of distance

/**
 * Calculate fare based on distance and vehicle type
 * @param distanceKm - Distance in kilometers
 * @param vehicleType - Type of vehicle
 * @param numberOfPassengers - Number of passengers (default: 1)
 * @returns Calculated fare in NPR
 */
export function calculateFare(
  distanceKm: number,
  vehicleType: VehicleTypeId,
  numberOfPassengers: number = 1
): number {
  const vehicleTypeData = VEHICLE_TYPE_MAP[vehicleType];
  if (!vehicleTypeData) {
    throw new Error(`Invalid vehicle type: ${vehicleType}`);
  }

  // Base fare calculation
  let fare = distanceKm * BASE_FARE_PER_KM * vehicleTypeData.fareMultiplier;

  // Apply minimum fare
  fare = Math.max(fare, MINIMUM_FARE);

  // Multiply by number of passengers
  fare = fare * numberOfPassengers;

  // Round to nearest 5 rupees (common practice in Nepal)
  fare = Math.ceil(fare / 5) * 5;

  return fare;
}

/**
 * Calculate fare from two locations
 * @param pickupLocation - Pickup location coordinates
 * @param dropoffLocation - Dropoff location coordinates
 * @param vehicleType - Type of vehicle
 * @param numberOfPassengers - Number of passengers (default: 1)
 * @returns Calculated fare in NPR
 */
export function calculateFareFromLocations(
  pickupLocation: { lat: number; lng: number },
  dropoffLocation: { lat: number; lng: number },
  vehicleType: VehicleTypeId,
  numberOfPassengers: number = 1
): number {
  const distance = calculateDistance(
    pickupLocation.lat,
    pickupLocation.lng,
    dropoffLocation.lat,
    dropoffLocation.lng
  );

  return calculateFare(distance, vehicleType, numberOfPassengers);
}

