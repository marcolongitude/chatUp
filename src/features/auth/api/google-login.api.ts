import { axiosInstance } from "@/shared/api";

import type { AuthResponse } from "../model/auth";

interface GoogleLoginPayload {
  idToken: string;
}

export async function googleLoginApi(payload: GoogleLoginPayload): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/google", payload);

  return {
    user: response.data.user,
    token: (response.data as { accessToken?: string }).accessToken ?? "",
  };
}
