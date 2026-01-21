import { useMemo } from 'react';
// Provisoriamente importando useAuth de modules até fase 4
import { useAuth } from '@/modules/auth';
import { messagesCollection } from '@/shared/lib/database/collections';
// NearbyUser virá de features later, por enquanto importando de onde estiver
import type { NearbyUser } from '@/modules/location/types';
import type { Contact } from './types';

/**
 * Hook para buscar informações de chat para uma lista de usuários
 * Retorna contatos com contagem de mensagens não lidas
 */
export function useContacts(nearbyUsers: NearbyUser[]) {
	const { user } = useAuth();
	const currentUserId = user?.id;

	// No momento a contagem de não lidas está simplificada
	// Em uma versão futura usaríamos useLiveQuery aqui
	const unreadMessages: any[] = [];
	const messagesLoading = false;

	const contacts = useMemo(() => {
		if (!user || nearbyUsers.length === 0) {
			return [];
		}

		const contactsMap = new Map<string, Contact>();

		nearbyUsers.forEach((nearbyUser) => {
			contactsMap.set(nearbyUser.id, {
				id: nearbyUser.id,
				name: nearbyUser.name,
				avatar: nearbyUser.avatar,
				unreadCount: 0,
			});
		});

		if (unreadMessages) {
			unreadMessages.forEach((msg) => {
				if (msg.receiver_id === currentUserId && !msg.is_read) {
					const senderId = msg.sender_id;
					const contact = contactsMap.get(senderId);
					if (contact) {
						contact.unreadCount = (contact.unreadCount || 0) + 1;
					}
				}
			});
		}

		return Array.from(contactsMap.values());
	}, [user, nearbyUsers, unreadMessages, currentUserId]);

	return {
		contacts,
		isLoading: messagesLoading,
	};
}
