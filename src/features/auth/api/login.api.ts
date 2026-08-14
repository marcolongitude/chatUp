import { axiosInstance } from "@/shared/api";

import type { AuthResponse, LoginCredentials } from "../model/auth";

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  const raw = response.data as {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
  };
  const token = raw.accessToken || raw.token || "";
  if (!token) {
    throw new Error("Login response missing accessToken");
  }

  return {
    user: response.data.user,
    token,
    refreshToken: raw.refreshToken,
  };
}
