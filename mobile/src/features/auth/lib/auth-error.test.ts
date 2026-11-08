import axios from "axios";

import { authFailureKey } from "./auth-error";

function axiosStatus(status: number, message: string): axios.AxiosError {
	return new axios.AxiosError(message, "ERR_BAD_REQUEST", undefined, undefined, {
		status,
		statusText: "",
		headers: {},
		config: {} as axios.InternalAxiosRequestConfig,
		data: {},
	});
}

describe("authFailureKey", () => {
	it("turns a 401 into a friendly login message key", () => {
		expect(authFailureKey(axiosStatus(401, "Request failed with status code 401"))).toBe(
			"auth.invalidCredentials"
		);
	});

	it("turns a dropped connection into the network message key", () => {
		expect(authFailureKey(new axios.AxiosError("Network Error", "ERR_NETWORK"))).toBe("errors.network");
	});

	it("hides other request failures behind a generic auth message", () => {
		expect(authFailureKey(axiosStatus(500, "Request failed with status code 500"))).toBe("auth.error");
	});
});
