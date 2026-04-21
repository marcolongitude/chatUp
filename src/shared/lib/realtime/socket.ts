import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/shared/api/axiosClient";

const STORAGE_KEY_TOKEN = "auth.token";

let socket: WebSocket | null = null;

export type SocketHandler = (event: { type: string; data: any }) => void;

function getWsBaseUrl(): string {
	const normalized = API_URL.replace(/\/$/, "");
	if (normalized.startsWith("https://")) {
		return normalized.replace("https://", "wss://");
	}
	return normalized.replace("http://", "ws://");
}

export async function connectSocket(onMessage: SocketHandler): Promise<WebSocket | null> {
	const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
	if (!token) return null;

	const wsUrl = `${getWsBaseUrl()}/ws?token=${encodeURIComponent(token)}`;
	const client = new WebSocket(wsUrl);
	client.onmessage = (event) => {
		try {
			const payload = JSON.parse(event.data);
			onMessage(payload);
		} catch (error) {
			console.error("[Realtime] Invalid WS payload:", error);
		}
	};
	socket = client;
	return client;
}

export function sendSocketEvent(type: string, data: Record<string, unknown>) {
	if (!socket || socket.readyState !== WebSocket.OPEN) return;
	socket.send(JSON.stringify({ type, data }));
}

export function disconnectSocket() {
	if (socket) {
		socket.close();
		socket = null;
	}
}
