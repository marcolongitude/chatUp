import { axiosInstance } from "@/shared/api";
import type { NearbyUser } from "@/entities/contact";

export interface FetchNearbyUsersParams {
  latitude: number;
  longitude: number;
  radius: number;
}

export async function fetchNearbyUsersApi(params: FetchNearbyUsersParams): Promise<NearbyUser[]> {
  const response = await axiosInstance.get<NearbyUser[]>("/location/nearby", {
    params,
  });

  return response.data;
}
