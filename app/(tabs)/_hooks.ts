import { useRouter } from "expo-router";
import { useLocation } from "@/features/location";
import { useNearbyUsers } from "@/features/location";
import { useContacts } from "@/entities/contact";
import { useAuth } from "@/features/auth";
import { ensureSignalSession } from "@/shared/lib/crypto";
import type { Contact } from "@/entities/message";

interface UseConversationsReturn {
	contacts: Contact[];
	isLoading: boolean;
	error: string | null;
	isLocationPermissionError: boolean;
	openSettings: () => Promise<void>;
	handleContactPress: (contactId: string, name?: string, avatar?: string) => void;
}

export function useConversations(): UseConversationsReturn {
	const router = useRouter();
	const { user } = useAuth();

	// Hook de localização para acessar openSettings
	const { openSettings, permissionStatus } = useLocation();

	// Buscar usuários próximos
	const { nearbyUsers, isLoading: isLoadingNearby, error: nearbyError } = useNearbyUsers();

	// Buscar informações de chat para os usuários próximos
	const { contacts, isLoading: isLoadingContacts } = useContacts(nearbyUsers);

	const isLoading = isLoadingNearby || isLoadingContacts;

	// Verificar se o erro é relacionado a permissão de localização
	const isLocationPermissionError = Boolean(
		nearbyError &&
			(nearbyError.includes("localização") ||
				nearbyError.includes("permissão") ||
				nearbyError.includes("Localização") ||
				!permissionStatus?.granted)
	);

	const handleContactPress = (contactId: string, name?: string, avatar?: string) => {
		console.log("Navegando para chat do contato:", contactId);

		// Pré-estabelecer sessão ANTES de navegar para o chat
		if (user) {
			ensureSignalSession(user.id, contactId).catch(() => {
				// Ignorar erros - é apenas otimização
			});
		}

		// Adicionar params na URL para evitar fetch desnecessário (e erro 404)
		const params: any = { contactId };
		if (name) params.initialName = name;
		if (avatar) params.initialAvatar = avatar;

		// Tentar o primeiro caminho (usando push com pathname + params)
		try {
			router.push({
				pathname: `/(tabs)/chat/${contactId}`,
				params
			} as any);
		} catch (error) {
			console.error("Erro ao navegar com caminho 1:", error);
			// Fallback (menos ideal pois perde params complexos)
			router.push(`/(tabs)/chat/${contactId}` as any);
		}
	};

	return {
		contacts,
		isLoading,
		error: nearbyError,
		isLocationPermissionError,
		openSettings,
		handleContactPress,
	};
}
