export interface LocationModel {
  latitude: number;
  longitude: number;
  updatedAt: Date | string;
}

export interface UserLocationModel {
  location: LocationModel;
  isLocationEnabled: boolean;
}

export interface NearbyUserModel {
  id: string;
  name: string;
  avatar?: string;
  location?: LocationModel;
  distance: number;
  locationVisible?: boolean;
  inGrace?: boolean;
  familyLink?: boolean;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: "granted" | "denied" | "undetermined";
}
