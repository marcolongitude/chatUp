export interface RealtimeTelemetryEvent {
	stage:
		| "socket_connect"
		| "socket_reconnect"
		| "socket_disconnect"
		| "socket_message"
		| "message_load"
		| "message_decrypt"
		| "message_send";
	result: "success" | "error" | "info";
	durationMs?: number;
	attempt?: number;
	details?: Record<string, unknown>;
	errorCode?: string;
}

export function trackRealtimeEvent(event: RealtimeTelemetryEvent): void {
	if (__DEV__) {
		console.log("📡 [RealtimeTelemetry]", event);
	}
}

export function trackRealtimeError(
	context: Omit<RealtimeTelemetryEvent, "result">,
	error: unknown
): void {
	const normalizedError = error instanceof Error ? error.message : String(error);
	trackRealtimeEvent({
		...context,
		result: "error",
		errorCode: normalizedError,
	});
}
