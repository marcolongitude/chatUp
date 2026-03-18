import { axiosInstance } from "@/shared/api";

import type { AuthResponse, LoginCredentials } from "../model/auth";

export async function loginApi(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/login", {
    email: credentials.email,
    password: credentials.password,
  });

  return {
    user: response.data.user,
    token: (response.data as { accessToken?: string }).accessToken ?? "",
  };
}
