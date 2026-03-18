import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
		shouldShowBanner: true,
		shouldShowList: true,
	}),
});

/** Minimal contract for a message that the notification system needs. */
interface NotifiableMessage {
	senderId: string;
}

interface NotificationConfig {
	getUserName: (userId: string) => Promise<string>;
}

interface PendingNotification {
	senderId: string;
	senderName: string;
	count: number;
}

let config: NotificationConfig | null = null;
const pendingNotifications = new Map<string, PendingNotification>();
let currentChatSenderId: string | null = null;
let notificationTimeout: NodeJS.Timeout | null = null;

/**
 * Inject domain-level dependencies so shared/lib stays free of higher-layer
 * imports.  Call once at app startup (e.g. from a provider in `app/`).
 */
export function configureNotifications(cfg: NotificationConfig): void {
	config = cfg;
}

export function setCurrentChatSenderId(senderId: string | null): void {
	currentChatSenderId = senderId;
}

async function resolveUserName(userId: string): Promise<string> {
	if (config?.getUserName) {
		try {
			return await config.getUserName(userId);
		} catch {
			return "User";
		}
	}
	return "User";
}

async function scheduleAccumulativeNotification(): Promise<void> {
	if (pendingNotifications.size === 0) return;
	const notifications: PendingNotification[] = Array.from(pendingNotifications.values());
	pendingNotifications.clear();

	if (notifications.length === 1) {
		const notification = notifications[0];
		await showNotification(notification.senderName, notification.count);
	} else {
		const totalMessages = notifications.reduce((sum, n) => sum + n.count, 0);
		await showNotification("Multiple contacts", totalMessages, notifications.length);
	}
}

async function showNotification(
	senderName: string,
	messageCount: number,
	contactCount?: number
): Promise<void> {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			const { status: newStatus } = await Notifications.requestPermissionsAsync();
			if (newStatus !== "granted") return;
		}

		let body: string;
		if (contactCount && contactCount > 1) {
			body = `${messageCount} messages from ${contactCount} people`;
		} else {
			body = `${messageCount} ${messageCount === 1 ? "message" : "messages"} from ${senderName}`;
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
			// @ts-ignore - groupId is valid in internal structure
			notificationConfig.content["groupId"] = contactCount ? "multiple" : senderName;
		}

		await Notifications.scheduleNotificationAsync(notificationConfig);
	} catch (error) {
		console.error("[Notification] Error showing notification:", error);
	}
}

export async function handleNewMessage(
	message: NotifiableMessage,
	currentUserId: string
): Promise<void> {
	if (message.senderId === currentUserId) return;
	if (currentChatSenderId === message.senderId) return;

	const senderName = await resolveUserName(message.senderId);
	const existing = pendingNotifications.get(message.senderId);
	if (existing) {
		existing.count += 1;
	} else {
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
					name: "Messages",
					description: "Message notifications",
					importance: Notifications.AndroidImportance.HIGH,
					sound: "default",
					vibrationPattern: [0, 250, 250, 250],
					lightColor: "#FF231F7C",
				});
			} catch {
				// channel creation may fail on older devices
			}
		}
		return true;
	} catch {
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
	} catch {
		// silent
	}
}
