/**
 * Interface core para as mensagens do sistema
 */
export type MessageDeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export interface Message {
	id: string;
	chatId: string;
	senderId: string;
	receiverId: string;
	text: string;
	timestamp: Date | number | string;
	read: boolean;
	viewedAt?: Date | number | null;
	createdAt?: Date | number | null;
	updatedAt?: Date | number | null;
	isLocal?: boolean;
	clientMsgId?: string;
	seqNum?: number;
	deliveryStatus?: MessageDeliveryStatus;
}

export interface CreateMessageData {
	receiverId: string;
	text: string;
}
