export interface Message {
	id: string;
	chatId: string; // ID da conversa (combinação ordenada dos IDs dos usuários)
	senderId: string; // ID do usuário que enviou
	receiverId: string; // ID do usuário que recebeu
	text: string;
	timestamp: Date;
	read: boolean;
	viewedAt?: Date | any | null; // Timestamp do Firestore - quando a mensagem foi visualizada
	createdAt: any; // Timestamp do Firestore
	updatedAt?: any; // Timestamp do Firestore
}

export interface CreateMessageData {
	text: string;
	receiverId: string;
}
