import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { axiosInstance } from "@/shared/api";
import {
	DEFAULT_PERIMETER_KM,
	getPerimeterKm,
	setPerimeterKm,
	type PerimeterKm,
} from "./perimeter-preference";

export function usePerimeter() {
	const queryClient = useQueryClient();
	const [perimeterKm, setPerimeterState] = useState<PerimeterKm>(DEFAULT_PERIMETER_KM);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		let mounted = true;
		void getPerimeterKm().then((km) => {
			if (!mounted) return;
			setPerimeterState(km);
			setIsReady(true);
		});
		return () => {
			mounted = false;
		};
	}, []);

	const updatePerimeterKm = useCallback(
		async (km: PerimeterKm) => {
			await setPerimeterKm(km);
			setPerimeterState(km);
			await queryClient.invalidateQueries({ queryKey: ["nearbyUsers"] });

			// Best-effort sync to backend (requires migration 0005). Local preference always wins.
			try {
				const rawUser = await AsyncStorage.getItem("auth.user");
				const user = rawUser ? (JSON.parse(rawUser) as { id?: string }) : null;
				if (user?.id) {
					await axiosInstance.put(`/users/${user.id}`, { nearbyRadiusKm: km });
				}
			} catch {
				// Ignore until OPS applies 0005 / redeploys API.
			}
		},
		[queryClient]
	);

	return {
		perimeterKm,
		isReady,
		updatePerimeterKm,
	};
}
