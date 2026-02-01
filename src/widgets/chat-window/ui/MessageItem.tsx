import React from "react";
import { Message, MessageStatus } from "@/entities/message";
import { MessageBubble, MessageText, MessageFooter, MessageTime } from "./styled";

interface MessageItemProps {
	message: Message;
	isOwn: boolean;
}

export const MessageItem = React.memo(({ message, isOwn }: MessageItemProps) => {
	const formatTime = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
	};

	if (!message || !message.id || !message.text) return null;

	return (
		<MessageBubble isOwn={isOwn}>
			<MessageText isOwn={isOwn}>{message.text}</MessageText>
			<MessageFooter isOwn={isOwn}>
				<MessageTime isOwn={isOwn}>{formatTime(new Date(message.timestamp))}</MessageTime>
				{isOwn && (
					<MessageStatus 
						isRead={message.read} 
						isViewed={message.viewedAt !== null} 
					/>
				)}
			</MessageFooter>
		</MessageBubble>
	);
});
