import { useState, useEffect, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import * as Location from "expo-location";
import Constants from "expo-constants";

import { openLocationSettings } from "../lib/open-location-settings";
import type { LocationModel, LocationPermissionStatus } from "./location";

const MOCK_LOCATION: LocationModel = {
  latitude: -17.803677,
  longitude: -50.920879,
  updatedAt: new Date(),
};

const SHOULD_USE_MOCK = __DEV__ || Constants.expoConfig?.extra?.forceMockLocation === true;

export function useLocation() {
  const [location, setLocation] = useState<LocationModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      let status = "undetermined";
      let canAskAgain = true;

      if (Platform.OS === "android") {
        try {
          const androidResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Permissão de Localização",
              message: "Este app precisa da sua localização para mostrar usuários próximos a você.",
              buttonNeutral: "Perguntar depois",
              buttonNegative: "Cancelar",
              buttonPositive: "OK",
            }
          );

          if (androidResult === PermissionsAndroid.RESULTS.GRANTED) {
            status = "granted";
            canAskAgain = false;
          } else if (androidResult === PermissionsAndroid.RESULTS.DENIED) {
            status = "denied";
          }
        } catch (androidErr) {
          console.warn("[Feature/Location] PermissionsAndroid error:", androidErr);
        }
      }

      try {
        const expoPermission = await Location.requestForegroundPermissionsAsync();
        if (expoPermission.status === "granted") {
          status = "granted";
          canAskAgain = expoPermission.canAskAgain;
        } else if (status === "undetermined") {
          status = expoPermission.status;
          canAskAgain = expoPermission.canAskAgain;
        }
      } catch (expoErr) {
        console.warn("[Feature/Location] Expo-location request error:", expoErr);
      }

      const permission: LocationPermissionStatus = {
        granted: status === "granted",
        canAskAgain,
        status: status as LocationPermissionStatus["status"],
      };

      setPermissionStatus(permission);
      setError(status !== "granted" ? "Permissão de localização negada." : null);
      return status === "granted";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao solicitar permissão";
      setError(message);
      return false;
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (SHOULD_USE_MOCK) {
      setPermissionStatus({ granted: true, canAskAgain: false, status: "granted" });
      return true;
    }

    try {
      let status = "undetermined";
      let canAskAgain = true;

      try {
        const expoPermission = await Location.getForegroundPermissionsAsync();
        status = expoPermission.status;
        canAskAgain = expoPermission.canAskAgain;
      } catch (expoErr) {
        console.warn("[Feature/Location] Expo-location check error:", expoErr);
      }

      if (Platform.OS === "android") {
        try {
          const androidFine = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          const androidCoarse = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
          if (androidFine || androidCoarse) {
            status = "granted";
            canAskAgain = false;
          }
        } catch (androidErr) {
          console.warn("[Feature/Location] PermissionsAndroid check error:", androidErr);
        }
      }

      setPermissionStatus({
        granted: status === "granted",
        canAskAgain,
        status: status as LocationPermissionStatus["status"],
      });
      return status === "granted";
    } catch {
      return false;
    }
  }, []);

  const updateLocation = useCallback(async () => {
    if (SHOULD_USE_MOCK) {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 100));
      setLocation({ ...MOCK_LOCATION, updatedAt: new Date() });
      setIsLoading(false);
      return;
    }

    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error("GPS desabilitado.");
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        updatedAt: new Date(),
      });
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao obter localização.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [checkPermission, requestPermission]);

  useEffect(() => {
    checkPermission().then((granted) => {
      if (granted) {
        updateLocation();
      } else {
        setIsLoading(false);
      }
    });
  }, [checkPermission, updateLocation]);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    updateLocation,
    openSettings: openLocationSettings,
  };
}
