import { axiosInstance } from "@/shared/api";

import type { AuthResponse } from "../model/auth";

interface GoogleLoginPayload {
  idToken: string;
}

export async function googleLoginApi(payload: GoogleLoginPayload): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/google", payload);

  const raw = response.data as {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
  };
  const token = raw.accessToken || raw.token || "";
  if (!token) {
    throw new Error("Google login response missing accessToken");
  }

  return {
    user: response.data.user,
    token,
    refreshToken: raw.refreshToken,
  };
}
