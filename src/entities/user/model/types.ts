import { User as BaseUser } from "@/shared/lib/contracts";

export interface Location {
	latitude: number;
	longitude: number;
	updatedAt: Date | string;
}

export interface UserLocation {
	location: Location;
	isLocationEnabled: boolean;
}

export interface User extends BaseUser {
  bio?: string;
  phone?: string;
  location?: string | Location;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  hasProfile: boolean;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  location?: Location;
  isLocationEnabled?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar?: string;
}
