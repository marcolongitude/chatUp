import { axiosInstance } from "@/shared/api";

import type { CreateProfileData } from "../model/auth";

export async function updateProfileApi(userId: string, data: Partial<CreateProfileData>): Promise<unknown> {
  const response = await axiosInstance.put(`/users/${userId}`, data);
  return response.data;
}
