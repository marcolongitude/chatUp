import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/shared/api/axiosClient";
import { trackRealtimeEvent, trackRealtimeError } from "@/shared/lib/telemetry/realtime";

const STORAGE_KEY_TOKEN = "auth.token";
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 20000;

let socket: WebSocket | null = null;
const handlers = new Set<SocketHandler>();
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isConnecting = false;
let shouldReconnect = false;

export type SocketHandler = (event: { type: string; data: any }) => void;

function getWsBaseUrl(): string {
	const normalized = API_URL.replace(/\/$/, "");
	if (normalized.startsWith("https://")) {
		return normalized.replace("https://", "wss://");
	}
	return normalized.replace("http://", "ws://");
}

function clearReconnectTimer(): void {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}
}

function getReconnectDelayMs(attempt: number): number {
	const expBackoff = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
	const jitter = Math.floor(Math.random() * 400);
	return expBackoff + jitter;
}

function fanOut(payload: { type: string; data: any }): void {
	for (const handler of handlers) {
		try {
			handler(payload);
		} catch (error) {
			console.error("[Realtime] Socket handler error:", error);
			trackRealtimeError({ stage: "socket_message", details: { reason: "handler_error" } }, error);
		}
	}
}

async function openSocketConnection(): Promise<WebSocket | null> {
	if (isConnecting) return socket;

	const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
	if (!token) {
		trackRealtimeEvent({
			stage: "socket_connect",
			result: "info",
			details: { reason: "missing_token" },
		});
		return null;
	}

	isConnecting = true;
	const wsUrl = `${getWsBaseUrl()}/ws?token=${encodeURIComponent(token)}`;
	const client = new WebSocket(wsUrl);
	socket = client;

	client.onopen = () => {
		isConnecting = false;
		reconnectAttempts = 0;
		clearReconnectTimer();
		trackRealtimeEvent({
			stage: "socket_connect",
			result: "success",
			details: { wsUrl },
		});
	};

	client.onmessage = (event) => {
		try {
			const payload = JSON.parse(event.data);
			trackRealtimeEvent({
				stage: "socket_message",
				result: "info",
				details: { type: payload?.type ?? "unknown" },
			});
			fanOut(payload);
		} catch (error) {
			console.error("[Realtime] Invalid WS payload:", error);
			trackRealtimeError({ stage: "socket_message", details: { reason: "invalid_payload" } }, error);
		}
	};

	client.onerror = (event) => {
		trackRealtimeEvent({
			stage: "socket_connect",
			result: "error",
			details: { event },
		});
	};

	client.onclose = () => {
		isConnecting = false;
		if (socket === client) {
			socket = null;
		}

		if (!shouldReconnect || handlers.size === 0) {
			trackRealtimeEvent({
				stage: "socket_disconnect",
				result: "info",
				details: { reason: "manual_disconnect_or_no_handlers" },
			});
			return;
		}

		reconnectAttempts += 1;
		const delayMs = getReconnectDelayMs(reconnectAttempts);
		trackRealtimeEvent({
			stage: "socket_reconnect",
			result: "info",
			attempt: reconnectAttempts,
			details: { delayMs },
		});

		clearReconnectTimer();
		reconnectTimer = setTimeout(() => {
			void openSocketConnection();
		}, delayMs);
	};

	return client;
}

/**
 * Subscribe to realtime events. Keeps a single shared WS for the session.
 * Returns an unsubscribe function that does NOT close the socket if other
 * subscribers remain (chat UI + notification bridge).
 */
export async function subscribeSocket(onMessage: SocketHandler): Promise<() => void> {
	handlers.add(onMessage);
	shouldReconnect = true;

	if (!socket || (socket.readyState !== WebSocket.OPEN && socket.readyState !== WebSocket.CONNECTING)) {
		await openSocketConnection();
	}

	return () => {
		handlers.delete(onMessage);
		if (handlers.size === 0) {
			disconnectSocket();
		}
	};
}

/** @deprecated Prefer subscribeSocket — kept for call sites that still pass a single handler. */
export async function connectSocket(onMessage: SocketHandler): Promise<WebSocket | null> {
	await subscribeSocket(onMessage);
	return socket;
}

export function sendSocketEvent(type: string, data: Record<string, unknown>) {
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	socket.send(JSON.stringify({ type, data }));
}

export function disconnectSocket() {
	shouldReconnect = false;
	clearReconnectTimer();
	handlers.clear();
	if (socket) {
		socket.close();
		socket = null;
	}
	trackRealtimeEvent({ stage: "socket_disconnect", result: "success" });
}
