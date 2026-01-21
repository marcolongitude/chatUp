import React, { useEffect } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { ChatWindow } from "@/widgets/chat-window";
import { mockContacts } from "@/entities/contact";

/**
 * Página de Chat Individual
 * Camada: Pages (FSD)
 */
export default function ChatPage() {
	const { contactId, initialName } = useLocalSearchParams<{ contactId: string, initialName?: string }>();
	const navigation = useNavigation();

	// Configurar o título do header com base no contato
	useEffect(() => {
		const contact = mockContacts.find((c) => c.id === contactId);
		const title = initialName || contact?.name || "Chat";
		
		navigation.setOptions({
			headerTitle: title,
		});
	}, [contactId, initialName]);

	if (!contactId) return null;

	return <ChatWindow contactId={contactId} />;
}
