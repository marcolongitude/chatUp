import type { LocationModel } from "../model/location";

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function calculateLocationDistance(location1: LocationModel, location2: LocationModel): number {
  return calculateDistance(location1.latitude, location1.longitude, location2.latitude, location2.longitude);
}

export function isWithinRadius(centerLocation: LocationModel, targetLocation: LocationModel, radiusMeters: number): boolean {
  return calculateLocationDistance(centerLocation, targetLocation) <= radiusMeters;
}

export function calculateBoundingBox(
  centerLocation: LocationModel,
  radiusMeters: number
): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const lat = centerLocation.latitude;
  const lon = centerLocation.longitude;

  const latDelta = radiusMeters / 111000;
  const lonDelta = radiusMeters / (111000 * Math.cos(toRadians(lat)));

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lon + lonDelta,
    west: lon - lonDelta,
  };
}

// Temporary radius for internal tests. Revert when production-ready.
export const NEARBY_RADIUS_METERS = 500000;
