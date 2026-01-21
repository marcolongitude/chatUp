import { Location } from '@/entities/user';

export interface Contact {
	id: string;
	name: string;
	avatar?: string;
	unreadCount: number;
	lastMessage?: string;
	lastMessageTime?: string;
}

export interface NearbyUser {
	id: string;
	name: string;
	avatar?: string;
	location: Location;
	distance: number; // em metros
}
