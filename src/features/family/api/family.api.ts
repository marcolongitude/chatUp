import { axiosInstance } from "@/shared/api";
import type { FamilyLink } from "../model/types";

export async function listFamilyLinksApi(): Promise<FamilyLink[]> {
	const response = await axiosInstance.get<FamilyLink[]>("/family/links");
	return response.data;
}

export async function requestFamilyLinkApi(peerId: string): Promise<FamilyLink> {
	const response = await axiosInstance.post<FamilyLink>("/family/links", { peerId });
	return response.data;
}

export async function acceptFamilyLinkApi(linkId: string): Promise<FamilyLink> {
	const response = await axiosInstance.post<FamilyLink>(`/family/links/${linkId}/accept`);
	return response.data;
}

export async function revokeFamilyLinkApi(linkId: string): Promise<void> {
	await axiosInstance.post(`/family/links/${linkId}/revoke`);
}

export async function setFamilyLocationShareApi(linkId: string, enabled: boolean): Promise<FamilyLink> {
	const response = await axiosInstance.patch<FamilyLink>(`/family/links/${linkId}/location-share`, {
		enabled,
	});
	return response.data;
}
