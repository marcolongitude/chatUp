import { useState, useEffect } from "react";

import type { NearbyUser } from "@/entities/contact";

import { useLocation } from "./use-location";
import { NEARBY_RADIUS_METERS } from "../lib/geolocation";
import { fetchNearbyUsersApi } from "../api/nearby-users.api";
import { updateLocationApi } from "../api/update-location.api";

/**
 * @param userId - ID do usuário autenticado (injetado pela camada superior)
 */
export function useNearbyUsers(userId: string | undefined) {
  const {
    location: userLocation,
    permissionStatus,
    isLoading: isLocationLoading,
    error: locationError,
  } = useLocation();

  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLocationLoading) {
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    if (!permissionStatus?.granted) {
      const timer = setTimeout(() => {
        if (!permissionStatus?.granted) {
          setError("No location permission");
          setNearbyUsers([]);
          setIsLoading(false);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }

    if (locationError) {
      setError(locationError);
      setNearbyUsers([]);
      setIsLoading(false);
      return;
    }

    if (!userLocation) {
      setIsLoading(true);
      return;
    }

    setError(null);
    setIsLoading(true);

    const fetchNearby = async () => {
      try {
        updateLocationApi(userLocation.latitude, userLocation.longitude).catch((err: unknown) => {
          console.warn("Update location failed", err);
        });

        const data = await fetchNearbyUsersApi({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius: NEARBY_RADIUS_METERS / 1000,
        });

        setNearbyUsers(data);
        setIsLoading(false);
      } catch {
        setError("Error fetching nearby users");
        setNearbyUsers([]);
        setIsLoading(false);
      }
    };

    fetchNearby();
    const interval = setInterval(fetchNearby, 30000);
    return () => clearInterval(interval);
  }, [userId, userLocation, permissionStatus?.granted, isLocationLoading, locationError]);

  return {
    nearbyUsers,
    isLoading,
    error,
  };
}
