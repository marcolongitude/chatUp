import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserProfile } from "./types";

const STORAGE_KEY_TOKEN = "auth.token";
const STORAGE_KEY_USER = "auth.user";

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
}

// Singleton state to be shared across auth features
let globalUser: AuthUser | null = null;
let globalUserProfile: UserProfile | null = null;
let globalIsLoading = true;
const listeners: Set<() => void> = new Set();

const notify = () => listeners.forEach(l => l());

/**
 * Hook de domínio para gerenciar e acessar a sessão do usuário.
 * Este estado é compartilhado entre todas as features de autenticação.
 */
export function useAuthSession() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  // Restore session once
  useEffect(() => {
    if (!globalIsLoading) return;

    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        const savedUserStr = await AsyncStorage.getItem(STORAGE_KEY_USER);

        if (token && savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          globalUser = {
            ...savedUser,
            getIdToken: async () => (await AsyncStorage.getItem(STORAGE_KEY_TOKEN)) || ""
          };
          
          globalUserProfile = {
             id: savedUser.id,
             email: savedUser.email || "",
             displayName: savedUser.displayName || "",
             hasProfile: true,
             photoURL: savedUser.photoURL,
          };
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      } finally {
        globalIsLoading = false;
        notify();
      }
    };

    restoreSession();
  }, []);

  const setSession = async (token: string, user: AuthUser, profile: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEY_TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }));
    
    globalUser = user;
    globalUserProfile = profile;
    notify();
  };

  const clearSession = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
    globalUser = null;
    globalUserProfile = null;
    notify();
  };

  const updateProfile = async (profile: UserProfile) => {
    globalUserProfile = profile;
    if (globalUser) {
      const updatedUser = { 
        ...globalUser, 
        displayName: profile.displayName, 
        photoURL: profile.photoURL || null 
      };
      globalUser = updatedUser;
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify({
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        photoURL: updatedUser.photoURL
      }));
    }
    notify();
  };

  return {
    user: globalUser,
    userProfile: globalUserProfile,
    isAuthenticated: !!globalUser,
    isLoading: globalIsLoading,
    setSession,
    clearSession,
    updateProfile
  };
}
