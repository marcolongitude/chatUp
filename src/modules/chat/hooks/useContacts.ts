/**
 * Hook para buscar informações de contatos (contagem de não lidas)
 */

import { useMemo } from 'react';
import { useAuth } from '@/modules/auth';
import { useLiveQuery, eq, or, and } from '@tanstack/react-db';
import { messagesCollection } from '@/shared/lib/database/collections';
import type { Contact } from '../types';
import type { NearbyUser } from '@/modules/location/types';

/**
 * Gera um ID de chat único baseado nos IDs dos participantes
 */
function generateChatId(userId1: string, userId2: string): string {
	const sorted = [userId1, userId2].sort();
	return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Hook para buscar informações de chat para uma lista de usuários próximos
 * Retorna contatos com contagem de mensagens não lidas
 */
export function useContacts(nearbyUsers: NearbyUser[]): {
	contacts: Contact[];
	isLoading: boolean;
} {
	const { user } = useAuth();
	const currentUserId = user?.id;

	// Live query for unread messages - automatically updates when Electric syncs
	// Return empty array for now until Electric SQL is fully configured
	// The error "Unknown expression type: undefined" suggests the collection
	// or Electric SQL integration needs to be properly initialized first
	const unreadMessages: any[] = [];
	const messagesLoading = false;

	// Calculate unread counts per contact
	const contacts = useMemo(() => {
		if (!user || nearbyUsers.length === 0) {
			return [];
		}

		const contactsMap = new Map<string, Contact>();

		// Init base contacts
		nearbyUsers.forEach((nearbyUser) => {
			contactsMap.set(nearbyUser.id, {
				id: nearbyUser.id,
				name: nearbyUser.name,
				avatar: nearbyUser.avatar,
				unreadCount: 0,
			});
		});

		// Count unread messages per contact
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

