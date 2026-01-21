import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { useLocation } from "../../update-location/model/use-location";
import { NEARBY_RADIUS_METERS } from "../../update-location/lib/geolocation";
import { axiosInstance } from "@/shared/api";
import type { NearbyUser } from "@/entities/contact";

/**
 * Hook para buscar usuários próximos em tempo real
 */
export function useNearbyUsers() {
	const { user } = useAuth();
	const {
		location: userLocation,
		permissionStatus,
		isLoading: isLocationLoading,
		error: locationError,
		updateLocation
	} = useLocation();
	const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isLocationLoading) { setIsLoading(true); return; }
		if (!user) { setError("Não autenticado"); setIsLoading(false); return; }

		if (!permissionStatus?.granted) {
            // Pequeno delay para evitar flickering de erro
			const timer = setTimeout(() => {
				if (!permissionStatus?.granted) {
					setError("Sem permissão de localização");
					setIsLoading(false);
				}
			}, 2000);
			return () => clearTimeout(timer);
		}

		if (locationError) { setError(locationError); setIsLoading(false); return; }
		if (!userLocation) { setIsLoading(true); return; }

		setError(null);
		setIsLoading(true);

		const fetchNearby = async () => {
			try {
                // 1. Atualizar localização do usuário atual
                axiosInstance.put('/location', {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude
                }).catch(e => console.warn("Update location failed", e));

                // 2. Buscar usuários próximos
                const response = await axiosInstance.get<NearbyUser[]>('/location/nearby', {
                    params: {
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        radius: NEARBY_RADIUS_METERS / 1000
                    }
                });
                setNearbyUsers(response.data);
                setIsLoading(false);
			} catch (err: any) {
				setError("Erro ao buscar usuários próximos");
				setIsLoading(false);
			}
		};

		fetchNearby();

        const interval = setInterval(fetchNearby, 30000);
        return () => clearInterval(interval);
	}, [user?.id, userLocation, permissionStatus?.granted, isLocationLoading, locationError]);

	return {
		nearbyUsers,
		isLoading,
		error,
	};
}
