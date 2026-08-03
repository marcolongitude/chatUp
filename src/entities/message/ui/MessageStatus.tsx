import React from "react";
import { Ionicons } from "@expo/vector-icons";
import styled, { useTheme } from "styled-components/native";
import type { MessageDeliveryStatus } from "../model/types";

const StatusContainer = styled.View`
	margin-left: 4px;
	align-items: center;
	justify-content: center;
`;

interface MessageStatusProps {
	status?: MessageDeliveryStatus;
	isRead?: boolean;
	isViewed?: boolean;
	/** Own bubbles sit on primary blue — need on-primary icon colors. */
	isOwn?: boolean;
	/** Stable key for e2e (message text token or id). */
	e2eKey?: string;
}

/**
 * Status de envio (estilo WhatsApp):
 * - pending: relógio
 * - sent: check simples
 * - delivered: check duplo
 * - read: check duplo em destaque
 * - failed: alerta
 */
export function MessageStatus({
	status,
	isRead,
	isViewed,
	isOwn = false,
	e2eKey,
}: MessageStatusProps) {
	const theme = useTheme();

	const resolved: MessageDeliveryStatus =
		status ?? (isViewed || isRead ? "read" : "sent");

	const muted = isOwn ? "rgba(255,255,255,0.85)" : theme.colors.text.tertiary;
	const read = isOwn ? "#FFE082" : theme.colors.status.info;
	const failed = theme.colors.status.error;
	const keyPart = (e2eKey || "unknown").slice(0, 48);
	const testID = `e2e.message.status.${keyPart}.${resolved}`;

	if (resolved === "pending") {
		return (
			<StatusContainer testID={testID} accessibilityLabel={testID}>
				<Ionicons name="time-outline" size={16} color={muted} />
			</StatusContainer>
		);
	}

	if (resolved === "failed") {
		return (
			<StatusContainer testID={testID} accessibilityLabel={testID}>
				<Ionicons name="alert-circle-outline" size={16} color={failed} />
			</StatusContainer>
		);
	}

	if (resolved === "sent") {
		return (
			<StatusContainer testID={testID} accessibilityLabel={testID}>
				<Ionicons name="checkmark" size={16} color={muted} />
			</StatusContainer>
		);
	}

	if (resolved === "delivered") {
		return (
			<StatusContainer testID={testID} accessibilityLabel={testID}>
				<Ionicons name="checkmark-done" size={16} color={muted} />
			</StatusContainer>
		);
	}

	return (
		<StatusContainer testID={testID} accessibilityLabel={testID}>
			<Ionicons name="checkmark-done" size={16} color={read} />
		</StatusContainer>
	);
}
