import { axiosInstance } from "@/shared/api";

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

export async function refreshApi(refreshToken: string): Promise<RefreshResponse> {
  const response = await axiosInstance.post<RefreshResponse>(
    "/auth/refresh",
    { refreshToken },
    { headers: { "X-Skip-Auth-Refresh": "1" } }
  );
  return response.data;
}
