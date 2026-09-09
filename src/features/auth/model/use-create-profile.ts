import { useState } from "react";

import { updateProfileApi } from "../api/profile.api";
import type { CreateProfileData } from "./auth";
import { useAuthSession } from "./use-auth-session";

export function useCreateProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, updateProfile } = useAuthSession();

  const createProfile = async (data: CreateProfileData) => {
    if (!user) {
      throw new Error("Not authenticated");
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateProfileApi(user.id, data);

      await updateProfile({
        id: user.id,
        email: user.email || "",
        displayName: data.displayName,
        photoURL: data.photoURL,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        hasProfile: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createProfile,
    isLoading,
    error,
  };
}
