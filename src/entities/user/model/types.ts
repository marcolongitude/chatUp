import { User as BaseUser } from '@/shared/types';

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

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  phone?: string;
  location?: string;
  avatar?: string;
}
