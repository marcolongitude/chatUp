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

	const e2eKey = message.text;

	return (
		<MessageBubble isOwn={isOwn} testID={`e2e.message.row.${e2eKey}`}>
			<MessageText isOwn={isOwn}>{message.text}</MessageText>
			<MessageFooter isOwn={isOwn}>
				<MessageTime isOwn={isOwn}>{formatTime(new Date(message.timestamp))}</MessageTime>
				{isOwn && (
					<MessageStatus
						isOwn
						e2eKey={e2eKey}
						status={message.deliveryStatus}
						isRead={message.read}
						isViewed={message.viewedAt != null}
					/>
				)}
			</MessageFooter>
		</MessageBubble>
	);
});
