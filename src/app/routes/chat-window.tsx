import React from "react";
import { useParams, useLocation } from "@tanstack/react-router";
import { ChatWindow } from "@/widgets/chat-window";

export function ChatWindowPage() {
	const location = useLocation();
	const params = useParams({ strict: false }) as { chatId?: string } | undefined;
	const chatId =
		params?.chatId ??
		(location.pathname.startsWith("/chat/")
			? location.pathname.replace(/^\/chat\//, "").split("/")[0]
			: undefined);

	if (!chatId) return null;

	return <ChatWindow contactId={chatId} />;
}
