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
}

/**
 * Status de envio (estilo WhatsApp):
 * - pending: relógio
 * - sent: check simples
 * - delivered: check duplo cinza
 * - read: check duplo azul
 * - failed: alerta
 */
export function MessageStatus({ status, isRead, isViewed }: MessageStatusProps) {
	const theme = useTheme();

	const resolved: MessageDeliveryStatus =
		status ??
		(isViewed || isRead ? "read" : "sent");

	if (resolved === "pending") {
		return (
			<StatusContainer>
				<Ionicons name="time-outline" size={16} color={theme.colors.text.tertiary} />
			</StatusContainer>
		);
	}

	if (resolved === "failed") {
		return (
			<StatusContainer>
				<Ionicons name="alert-circle-outline" size={16} color="#c0392b" />
			</StatusContainer>
		);
	}

	if (resolved === "sent") {
		return (
			<StatusContainer>
				<Ionicons name="checkmark" size={16} color={theme.colors.text.tertiary} />
			</StatusContainer>
		);
	}

	if (resolved === "delivered") {
		return (
			<StatusContainer>
				<Ionicons name="checkmark-done" size={16} color={theme.colors.text.tertiary} />
			</StatusContainer>
		);
	}

	return (
		<StatusContainer>
			<Ionicons name="checkmark-done" size={16} color={theme.colors.button.primary} />
		</StatusContainer>
	);
}
