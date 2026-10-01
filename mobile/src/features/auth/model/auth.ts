export type { UserProfile, Location } from "@/entities/user";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    displayName?: string;
    photoURL?: string;
  };
  token: string;
  refreshToken?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthResponse["user"] | null;
  token: string | null;
}

export interface CreateProfileData {
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
}
