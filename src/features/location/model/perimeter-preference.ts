import AsyncStorage from "@react-native-async-storage/async-storage";

export const PERIMETER_OPTIONS_KM = [1, 2, 3] as const;
export type PerimeterKm = (typeof PERIMETER_OPTIONS_KM)[number];

export const DEFAULT_PERIMETER_KM: PerimeterKm = 1;

const STORAGE_KEY = "@chatup:nearby_perimeter_km";

export function isPerimeterKm(value: unknown): value is PerimeterKm {
	return value === 1 || value === 2 || value === 3;
}

export async function getPerimeterKm(): Promise<PerimeterKm> {
	try {
		const raw = await AsyncStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_PERIMETER_KM;
		const parsed = Number(raw);
		return isPerimeterKm(parsed) ? parsed : DEFAULT_PERIMETER_KM;
	} catch {
		return DEFAULT_PERIMETER_KM;
	}
}

export async function setPerimeterKm(km: PerimeterKm): Promise<void> {
	await AsyncStorage.setItem(STORAGE_KEY, String(km));
}
