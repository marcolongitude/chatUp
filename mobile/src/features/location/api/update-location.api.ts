import { axiosInstance } from "@/shared/api";

export async function updateLocationApi(latitude: number, longitude: number): Promise<void> {
  await axiosInstance.put("/location", {
    latitude,
    longitude,
  });
}
