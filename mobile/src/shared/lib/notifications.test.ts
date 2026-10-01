const mockScheduleNotificationAsync = jest.fn(async () => "notif-1");
const mockGetPermissionsAsync = jest.fn(async () => ({ status: "granted" }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ status: "granted" }));
const mockSetNotificationChannelAsync = jest.fn(async () => undefined);
const mockCancelAllScheduledNotificationsAsync = jest.fn(async () => undefined);
const mockDismissAllNotificationsAsync = jest.fn(async () => undefined);

jest.mock("expo-notifications", () => ({
	setNotificationHandler: jest.fn(),
	getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
	requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
	scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
	setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
	cancelAllScheduledNotificationsAsync: (...args: unknown[]) =>
		mockCancelAllScheduledNotificationsAsync(...args),
	dismissAllNotificationsAsync: (...args: unknown[]) => mockDismissAllNotificationsAsync(...args),
	getLastNotificationResponseAsync: jest.fn(async () => null),
	addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
	AndroidImportance: { HIGH: 4 },
	AndroidNotificationPriority: { HIGH: "high" },
}));

import {
	clearPendingNotifications,
	configureNotifications,
	handleNewMessage,
	setCurrentChatSenderId,
} from "./notifications";

async function flushAsync(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

describe("notifications handleNewMessage", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockScheduleNotificationAsync.mockClear();
		clearPendingNotifications();
		setCurrentChatSenderId(null);
		configureNotifications({
			getUserName: async (id) => `User-${id.slice(0, 4)}`,
			getCopy: () => ({
				title: "ChatUp",
				fallbackSender: "Someone",
				single: (name, count) => `${count} from ${name}`,
				multiple: (messages, contacts) => `${messages}/${contacts}`,
			}),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		clearPendingNotifications();
	});

	it("does not notify for own messages", async () => {
		await handleNewMessage({ senderId: "me" }, "me");
		jest.advanceTimersByTime(1500);
		await flushAsync();
		expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
	});

	it("suppresses notification when that chat is open", async () => {
		setCurrentChatSenderId("peer-1");
		await handleNewMessage({ senderId: "peer-1" }, "me");
		jest.advanceTimersByTime(1500);
		await flushAsync();
		expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
	});

	it("schedules a local notification for incoming peer message", async () => {
		await handleNewMessage({ senderId: "peer-1" }, "me");
		jest.advanceTimersByTime(1100);
		await flushAsync();

		expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
		const arg = mockScheduleNotificationAsync.mock.calls[0][0] as {
			content: {
				title: string;
				body: string;
				data?: { type?: string; senderId?: string; senderName?: string };
			};
		};
		expect(arg.content.title).toBe("ChatUp");
		expect(arg.content.body).toContain("User-peer");
		expect(arg.content.data?.type).toBe("chat");
		expect(arg.content.data?.senderId).toBe("peer-1");
		expect(arg.content.data?.senderName).toContain("User-peer");
	});

	it("accumulates multiple messages from the same sender into one notification", async () => {
		await handleNewMessage({ senderId: "peer-1" }, "me");
		await handleNewMessage({ senderId: "peer-1" }, "me");
		jest.advanceTimersByTime(1100);
		await flushAsync();

		expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
		const arg = mockScheduleNotificationAsync.mock.calls[0][0] as { content: { body: string } };
		expect(arg.content.body).toContain("2 from");
	});
});
