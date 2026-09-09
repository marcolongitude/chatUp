import { nextBackoffMs } from "./outbox";

describe("outbox backoff", () => {
	it("grows exponentially and caps at 60s", () => {
		expect(nextBackoffMs(0)).toBe(1000);
		expect(nextBackoffMs(1)).toBe(2000);
		expect(nextBackoffMs(2)).toBe(4000);
		expect(nextBackoffMs(10)).toBe(60_000);
	});
});
