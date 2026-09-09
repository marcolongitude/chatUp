import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MESSAGES_CHANNEL_ID = "messages";

export type NotificationOpenTarget =
	| { type: "chat"; senderId: string; senderName?: string }
	| { type: "conversations" };

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

interface NotificationCopy {
	title: string;
	single: (senderName: string, count: number) => string;
	multiple: (messageCount: number, contactCount: number) => string;
	fallbackSender: string;
}

interface NotificationConfig {
	getUserName: (userId: string) => Promise<string>;
	getCopy?: () => NotificationCopy;
}

interface PendingNotification {
	senderId: string;
	senderName: string;
	count: number;
}

let config: NotificationConfig | null = null;
const pendingNotifications = new Map<string, PendingNotification>();
let currentChatSenderId: string | null = null;
let notificationTimeout: ReturnType<typeof setTimeout> | null = null;
let openHandler: ((target: NotificationOpenTarget) => void) | null = null;
let responseSubscription: { remove: () => void } | null = null;
let lastHandledResponseId: string | null = null;

const defaultCopy: NotificationCopy = {
	title: "ChatUp",
	fallbackSender: "User",
	single: (senderName, count) =>
		count === 1 ? `1 message from ${senderName}` : `${count} messages from ${senderName}`,
	multiple: (messageCount, contactCount) => `${messageCount} messages from ${contactCount} people`,
};

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

function resolveCopy(): NotificationCopy {
	return config?.getCopy?.() ?? defaultCopy;
}

async function resolveUserName(userId: string): Promise<string> {
	const fallback = resolveCopy().fallbackSender;
	if (config?.getUserName) {
		try {
			return await config.getUserName(userId);
		} catch {
			return fallback;
		}
	}
	return fallback;
}

function parseOpenTarget(data: Record<string, unknown> | undefined): NotificationOpenTarget | null {
	if (!data) return null;
	const type = typeof data.type === "string" ? data.type : undefined;
	const senderId = typeof data.senderId === "string" ? data.senderId.trim() : "";
	const senderName = typeof data.senderName === "string" ? data.senderName : undefined;

	if (type === "conversations" || data.multiple === true) {
		return { type: "conversations" };
	}
	if (senderId) {
		return { type: "chat", senderId, senderName };
	}
	return null;
}

function handleNotificationResponse(response: Notifications.NotificationResponse): void {
	const responseId = response.notification.request.identifier;
	if (responseId && responseId === lastHandledResponseId) {
		return;
	}
	const target = parseOpenTarget(
		response.notification.request.content.data as Record<string, unknown> | undefined
	);
	if (!target || !openHandler) return;
	lastHandledResponseId = responseId ?? null;
	openHandler(target);
}

/**
 * Register tap-to-open handler. Returns cleanup.
 * Handles cold start (last response) and warm taps.
 */
export function bindNotificationOpenHandler(
	handler: (target: NotificationOpenTarget) => void
): () => void {
	openHandler = handler;

	void Notifications.getLastNotificationResponseAsync().then((response) => {
		if (response) {
			handleNotificationResponse(response);
		}
	});

	if (responseSubscription) {
		responseSubscription.remove();
	}
	responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
		handleNotificationResponse(response);
	});

	return () => {
		if (openHandler === handler) {
			openHandler = null;
		}
		responseSubscription?.remove();
		responseSubscription = null;
	};
}

async function scheduleAccumulativeNotification(): Promise<void> {
	if (pendingNotifications.size === 0) return;
	const notifications: PendingNotification[] = Array.from(pendingNotifications.values());
	pendingNotifications.clear();

	if (notifications.length === 1) {
		const notification = notifications[0];
		await showNotification({
			senderName: notification.senderName,
			messageCount: notification.count,
			senderId: notification.senderId,
		});
	} else {
		const totalMessages = notifications.reduce((sum, n) => sum + n.count, 0);
		await showNotification({
			senderName: "multiple",
			messageCount: totalMessages,
			contactCount: notifications.length,
		});
	}
}

async function showNotification(args: {
	senderName: string;
	messageCount: number;
	contactCount?: number;
	senderId?: string;
}): Promise<void> {
	try {
		const { status } = await Notifications.getPermissionsAsync();
		if (status !== "granted") {
			const { status: newStatus } = await Notifications.requestPermissionsAsync();
			if (newStatus !== "granted") return;
		}

		const copy = resolveCopy();
		const isMultiple = Boolean(args.contactCount && args.contactCount > 1);
		const body = isMultiple
			? copy.multiple(args.messageCount, args.contactCount!)
			: copy.single(args.senderName, args.messageCount);

		const data: Record<string, unknown> = isMultiple
			? { type: "conversations", multiple: true }
			: {
					type: "chat",
					senderId: args.senderId,
					senderName: args.senderName,
				};

		await Notifications.scheduleNotificationAsync({
			content: {
				title: copy.title,
				body,
				sound: true,
				priority: Notifications.AndroidNotificationPriority.HIGH,
				data,
				...(Platform.OS === "android" ? { channelId: MESSAGES_CHANNEL_ID } : {}),
			},
			trigger: null,
		});
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
		void scheduleAccumulativeNotification();
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
				await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
					name: "Messages",
					description: "Message notifications",
					importance: Notifications.AndroidImportance.HIGH,
					sound: "default",
					vibrationPattern: [0, 250, 250, 250],
					lightColor: "#5b9bd5",
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

export async function getNotificationPermissionStatus(): Promise<{
	granted: boolean;
	canAskAgain: boolean;
	status: string;
}> {
	try {
		const result = await Notifications.getPermissionsAsync();
		return {
			granted: result.status === "granted",
			canAskAgain: result.canAskAgain,
			status: result.status,
		};
	} catch {
		return { granted: false, canAskAgain: true, status: "undetermined" };
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
