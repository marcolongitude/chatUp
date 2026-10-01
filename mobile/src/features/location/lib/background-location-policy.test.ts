import {
	BG_PUT_MIN_INTERVAL_MS,
	BG_PUT_MIN_MOVE_M,
	BG_PUT_MOVE_MIN_GAP_MS,
	shouldPushBackgroundLocation,
} from "./background-location-policy";

describe("shouldPushBackgroundLocation", () => {
	it("sends the first fix so a backgrounded user stays on the contact list", () => {
		expect(
			shouldPushBackgroundLocation({ now: 1_000, lastPushAt: 0, movedMeters: 0 })
		).toBe(true);
	});

	it("keeps a stationary user fresh after the heartbeat interval", () => {
		expect(
			shouldPushBackgroundLocation({
				now: 10_000 + BG_PUT_MIN_INTERVAL_MS,
				lastPushAt: 10_000,
				movedMeters: 1,
			})
		).toBe(true);
	});

	it("does not PUT while still inside the interval and barely moving", () => {
		expect(
			shouldPushBackgroundLocation({
				now: 30_000,
				lastPushAt: 10_000,
				movedMeters: 3,
			})
		).toBe(false);
	});

	it("PUTs early when the user moves enough to cross the perimeter", () => {
		expect(
			shouldPushBackgroundLocation({
				now: BG_PUT_MOVE_MIN_GAP_MS,
				lastPushAt: 0,
				movedMeters: BG_PUT_MIN_MOVE_M,
			})
		).toBe(true);
		expect(
			shouldPushBackgroundLocation({
				now: 20_000 + BG_PUT_MOVE_MIN_GAP_MS,
				lastPushAt: 20_000,
				movedMeters: BG_PUT_MIN_MOVE_M,
			})
		).toBe(true);
	});
});
