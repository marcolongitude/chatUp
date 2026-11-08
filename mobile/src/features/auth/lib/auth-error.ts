import axios from "axios";

/**
 * Maps an auth request failure to an i18n key.
 * Screens must translate the key; the raw Axios message is not user-facing.
 */
export function authFailureKey(err: unknown): string {
	if (axios.isAxiosError(err)) {
		if (!err.response || err.code === "ECONNABORTED" || err.message === "Network Error") {
			return "errors.network";
		}
		if (err.response.status === 401) {
			return "auth.invalidCredentials";
		}
	}

	if (err instanceof Error && /Network Error|timeout|ECONNABORTED/i.test(err.message)) {
		return "errors.network";
	}

	if (err instanceof Error && (err.message.startsWith("auth.") || err.message.startsWith("errors."))) {
		return err.message;
	}

	return "auth.error";
}
