/**
 * Interface para os contatos (usuários com quem conversamos)
 */
export interface Contact {
	id: string;
	name: string;
	avatar?: string;
	status?: "online" | "offline";
	lastMessage?: string;
	lastMessageTime?: string;
	unreadCount?: number;
}

/**
 * Interface para usuários próximos (Nearby)
 */
export interface NearbyUser {
	id: string;
	name: string;
	avatar?: string;
	distance?: number;
	lastSeen?: string;
	latitude: number;
	longitude: number;
}
