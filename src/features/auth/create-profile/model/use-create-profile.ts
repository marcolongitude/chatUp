import { useState } from "react";
import { authService } from "@/shared/api/auth.service";
import { useAuthSession } from "../../model/use-auth-session";
import type { CreateProfileData } from "../../model/types";

/**
 * Hook para a funcionalidade de Criação/Edição de Perfil
 */
export function useCreateProfile() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, updateProfile } = useAuthSession();

  const createProfile = async (data: CreateProfileData) => {
    if (!user) throw new Error("Not authenticated");
    
    setIsLoading(true);
    setError(null);
    try {
      await authService.updateProfile(user.id, data);
      
      const newProfile = {
        id: user.id,
        email: user.email || "",
        displayName: data.displayName,
        photoURL: data.photoURL,
        bio: data.bio,
        phoneNumber: data.phoneNumber,
        hasProfile: true
      };
      
      await updateProfile(newProfile);
    } catch (e: any) {
        const msg = e.message || "Failed to update profile";
        setError(msg);
        throw e;
    } finally {
        setIsLoading(false);
    }
  };

  return {
    createProfile,
    isLoading,
    error
  };
}
