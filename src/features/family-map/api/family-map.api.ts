import { axiosInstance } from "@/shared/api";
import type { FamilyMapSnapshot } from "../model/types";

export async function getFamilyMapApi(): Promise<FamilyMapSnapshot> {
	const response = await axiosInstance.get<FamilyMapSnapshot>("/family/map");
	return response.data;
}
