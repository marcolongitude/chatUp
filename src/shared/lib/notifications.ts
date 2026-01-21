import * as Notifications from "expo-notifications";
import { Platform, AppState } from "react-native";
import { userService } from "@/shared/api/user.service";
import type { UserProfile } from "@/features/auth";
import type { Message } from "@/entities/message";

/**
 * Configuração de notificações
 */
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
	}),
});

interface PendingNotification {
	senderId: string;
	senderName: string;
	count: number;
}

const userNameCache = new Map<string, string>();
const pendingNotifications = new Map<string, PendingNotification>();
let currentChatSenderId: string | null = null;
let notificationTimeout: NodeJS.Timeout | null = null;

function getFirstName(fullName: string): string {
	if (!fullName) return "Usuário";
	const parts = fullName.trim().split(/\s+/);
	return parts[0] || "Usuário";
}

async function getUserName(userId: string): Promise<string> {
	if (userNameCache.has(userId)) return userNameCache.get(userId)!;
	try {
		const userData = await userService.getUserById(userId);
		if (userData) {
			const firstName = getFirstName(userData.displayName || "Usuário");
			userNameCache.set(userId, firstName);
			return firstName;
		}
	} catch (error) {
		console.error("❌ Erro ao buscar nome do usuário:", error);
	}
	userNameCache.set(userId, "Usuário");
	return "Usuário";
}

export function clearUserNameCache(): void { userNameCache.clear(); }
export function setCurrentChatSenderId(senderId: string | null): void { currentChatSenderId = senderId; }

async function scheduleAccumulativeNotification(): Promise<void> {
	if (pendingNotifications.size === 0) return;
	const notifications: PendingNotification[] = Array.from(pendingNotifications.values());
	pendingNotifications.clear();

	if (notifications.length === 1) {
		const notification = notifications[0];
		await showNotification(notification.senderName, notification.count);
	} else {
		const totalMessages = notifications.reduce((sum, n) => sum + n.count, 0);
		await showNotification("Várias pessoas", totalMessages, notifications.length);
	}
}

async function showNotification(senderName: string, messageCount: number, contactCount?: number): Promise<void> {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			const { status: newStatus } = await Notifications.requestPermissionsAsync();
			if (newStatus !== "granted") return;
		}

		let body: string;
		if (contactCount && contactCount > 1) {
			body = `${messageCount} mensagens de ${contactCount} pessoas`;
		} else {
			body = `${messageCount} ${messageCount === 1 ? "mensagem" : "mensagens"} de ${senderName}`;
		}

		const notificationConfig: Notifications.NotificationRequestInput = {
			content: {
				title: "ChatUp",
				body,
				sound: true,
				priority: Notifications.AndroidNotificationPriority.HIGH,
				data: { senderId: contactCount ? undefined : senderName },
			},
			trigger: null,
		};

		if (Platform.OS === "android") {
            // @ts-ignore - groupId is valid in internal structure but might not be in the direct type export
			notificationConfig.content['groupId'] = contactCount ? "multiple" : senderName;
		}

		await Notifications.scheduleNotificationAsync(notificationConfig);
	} catch (error) {
		console.error("❌ [Notificação] Erro ao mostrar notificação:", error);
	}
}

export async function handleNewMessage(message: Message, currentUserId: string): Promise<void> {
	if (message.senderId === currentUserId) return;
	if (currentChatSenderId === message.senderId) return;

	const senderName = await getUserName(message.senderId);
	const existing = pendingNotifications.get(message.senderId);
	if (existing) { existing.count += 1; }
	else {
		pendingNotifications.set(message.senderId, {
			senderId: message.senderId,
			senderName,
			count: 1,
		});
	}

	if (notificationTimeout) clearTimeout(notificationTimeout);
	notificationTimeout = setTimeout(() => {
		scheduleAccumulativeNotification();
		notificationTimeout = null;
	}, 1000);
}

export async function requestNotificationPermissions(): Promise<boolean> {
	try {
		const { status: es } = await Notifications.getPermissionsAsync();
		let fs = es;
		if (es !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			fs = status;
		}
		if (fs !== "granted") return false;

		if (Platform.OS === "android") {
			try {
				await Notifications.setNotificationChannelAsync("messages", {
					name: "Mensagens",
					description: "Notificações de mensagens",
					importance: Notifications.AndroidImportance.HIGH,
					sound: 'default',
					vibrationPattern: [0, 250, 250, 250],
					lightColor: "#FF231F7C",
				});
			} catch (e) {}
		}
		return true;
	} catch (e) {
		return false;
	}
}

export function clearPendingNotifications(): void {
	pendingNotifications.clear();
	if (notificationTimeout) {
		clearTimeout(notificationTimeout);
		notificationTimeout = null;
	}
}

export async function cancelAllNotifications(): Promise<void> {
	try {
		await Notifications.cancelAllScheduledNotificationsAsync();
		await Notifications.dismissAllNotificationsAsync();
		clearPendingNotifications();
	} catch (e) {}
}
