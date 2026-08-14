interface EncryptionTelemetryEvent {
	stage: "session" | "encrypt" | "decrypt";
	result: "success" | "error";
	errorCode?: string;
	userId: string;
	chatId?: string;
	receiverId?: string;
	durationMs?: number;
}

interface CryptoHealthSnapshot {
	encryptSuccess: number;
	encryptError: number;
	decryptSuccess: number;
	decryptError: number;
	lastErrorCode?: string;
	lastErrorAt?: string;
}

const health: CryptoHealthSnapshot = {
	encryptSuccess: 0,
	encryptError: 0,
	decryptSuccess: 0,
	decryptError: 0,
};

export function trackEncryptionEvent(event: EncryptionTelemetryEvent): void {
	if (event.stage === "encrypt") {
		if (event.result === "success") health.encryptSuccess += 1;
		else health.encryptError += 1;
	}
	if (event.stage === "decrypt") {
		if (event.result === "success") health.decryptSuccess += 1;
		else {
			health.decryptError += 1;
			health.lastErrorCode = event.errorCode;
			health.lastErrorAt = new Date().toISOString();
		}
	}

	if (__DEV__) {
		console.log("[Telemetry/Crypto]", event);
	}

	// Hook point for future remote export (Grafana/OTel) — never include plaintext.
	if (event.result === "error" && typeof globalThis !== "undefined") {
		(globalThis as { __chatupCryptoHealth?: CryptoHealthSnapshot }).__chatupCryptoHealth = {
			...health,
		};
	}
}

export function trackEncryptionError(context: Omit<EncryptionTelemetryEvent, "result">, error: unknown): void {
	const normalizedError = error instanceof Error ? error.message : String(error);
	trackEncryptionEvent({
		...context,
		result: "error",
		errorCode: normalizedError.slice(0, 200),
	});
}

/** In-memory counters for debugging / future dashboards (no plaintext). */
export function getCryptoHealthSnapshot(): CryptoHealthSnapshot {
	return { ...health };
}
