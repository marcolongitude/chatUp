import { Message } from '@/entities/message/model/types';

export interface Chat {
	id: string; // chatId
	participants: string[]; // IDs dos participantes [userId1, userId2] ordenados
	lastMessage?: Message;
	lastMessageTime?: Date;
	unreadCount?: number;
}
