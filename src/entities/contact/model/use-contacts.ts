import { useMemo } from 'react';
import type { NearbyUser, Contact } from '@/entities/contact';

/**
 * Hook para buscar informações de chat para uma lista de usuários
 * Retorna contatos com contagem de mensagens não lidas
 *
 * @param nearbyUsers - lista de usuários próximos
 * @param currentUserId - id do usuário autenticado (injetado pela camada superior)
 */
export function useContacts(nearbyUsers: NearbyUser[], currentUserId: string | undefined) {
	const unreadMessages: any[] = [];
	const messagesLoading = false;

	const contacts = useMemo(() => {
		if (!currentUserId || nearbyUsers.length === 0) {
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
	}, [currentUserId, nearbyUsers, unreadMessages]);

	return {
		contacts,
		isLoading: messagesLoading,
	};
}
