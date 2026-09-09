import { axiosInstance } from "@/shared/api";

import type { AuthResponse, RegisterData } from "../model/auth";

export async function signupApi(data: RegisterData): Promise<AuthResponse> {
  const response = await axiosInstance.post<AuthResponse>("/auth/register", {
    email: data.email,
    password: data.password,
    displayName: data.name,
  });

  const payload = response.data as {
    id?: string;
    email?: string;
    displayName?: string;
  };

  return {
    user: {
      id: payload.id ?? "",
      email: payload.email ?? data.email,
      name: payload.displayName ?? data.name,
    },
    token: "",
  };
}
