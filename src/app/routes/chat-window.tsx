import React from "react";
import { useParams } from "@tanstack/react-router";
import { ChatWindow } from "@/widgets/chat-window";

export function ChatWindowPage() {
	const { chatId } = useParams({ from: '/chat/$chatId' });

	if (!chatId) return null;

	return <ChatWindow contactId={chatId} />;
}
