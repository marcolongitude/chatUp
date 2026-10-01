import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "@/app/providers/i18n";
import { useAuthSession } from "@/features/auth";
import { userApi } from "@/entities/user";
import {
	configureNotifications,
	handleNewMessage,
	requestNotificationPermissions,
	cancelAllNotifications,
	bindNotificationOpenHandler,
} from "@/shared/lib/notifications";
import { subscribeSocket, disconnectSocket } from "@/shared/lib/realtime/socket";

/**
 * Keeps a session-scoped WebSocket alive while authenticated and turns
 * incoming `newMessage` events into local notifications when the user is
 * not currently viewing that chat.
 *
 * Tap on a single-sender notification opens `/chat/$chatId` for that sender.
 * Multi-sender notifications open the conversations list.
 */
export function RealtimeNotificationsBridge() {
	const { isAuthenticated, user } = useAuthSession();
	const { t } = useTranslation();
	const router = useRouter();

	useEffect(() => {
		configureNotifications({
			getUserName: async (userId) => {
				const profile = await userApi.getUserById(userId);
				return profile.displayName?.trim() || profile.email || t("notifications.fallbackSender");
			},
			getCopy: () => ({
				title: t("notifications.title"),
				fallbackSender: t("notifications.fallbackSender"),
				single: (senderName, count) =>
					count === 1
						? t("notifications.singleOne", { name: senderName })
						: t("notifications.singleMany", { name: senderName, count }),
				multiple: (messageCount, contactCount) =>
					t("notifications.multiple", { messages: messageCount, contacts: contactCount }),
			}),
		});
	}, [t]);

	useEffect(() => {
		if (!isAuthenticated) return;

		return bindNotificationOpenHandler((target) => {
			if (target.type === "conversations") {
				router.navigate({ to: "/main/conversations" });
				return;
			}
			void (async () => {
				let initialAvatar: string | undefined;
				try {
					const profile = await userApi.getUserById(target.senderId);
					initialAvatar = profile.photoURL || undefined;
				} catch {
					// Header will fall back to initials / fetch again.
				}
				router.navigate({
					to: "/chat/$chatId",
					params: { chatId: target.senderId },
					search: {
						initialName: target.senderName,
						initialAvatar,
					},
				} as never);
			})();
		});
	}, [isAuthenticated, router]);

	useEffect(() => {
		if (!isAuthenticated || !user?.id) {
			disconnectSocket();
			void cancelAllNotifications();
			return;
		}

		const userId = user.id;
		let unsubscribe: (() => void) | undefined;
		let cancelled = false;

		void (async () => {
			await requestNotificationPermissions();
			if (cancelled) return;

			const unsub = await subscribeSocket((event) => {
				if (event.type !== "newMessage") return;
				const row = event.data as { senderId?: string; receiverId?: string };
				const senderId = String(row.senderId ?? "");
				const receiverId = String(row.receiverId ?? "");
				if (!senderId || receiverId !== userId) return;
				void handleNewMessage({ senderId }, userId);
			});

			if (cancelled) {
				unsub();
				return;
			}
			unsubscribe = unsub;
		})();

		return () => {
			cancelled = true;
			unsubscribe?.();
		};
	}, [isAuthenticated, user?.id]);

	return null;
}
