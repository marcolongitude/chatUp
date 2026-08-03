import { deliveryFromFlags, deliveryStatusRank, isDeliveryAtLeast } from "./delivery-status";

describe("delivery-status", () => {
	it("maps API flags to delivery status", () => {
		expect(deliveryFromFlags(false, false)).toBe("sent");
		expect(deliveryFromFlags(true, false)).toBe("delivered");
		expect(deliveryFromFlags(true, true)).toBe("read");
		expect(deliveryFromFlags(false, true)).toBe("read");
	});

	it("ranks statuses for at-least assertions", () => {
		expect(deliveryStatusRank("pending")).toBeLessThan(deliveryStatusRank("sent"));
		expect(deliveryStatusRank("sent")).toBeLessThan(deliveryStatusRank("delivered"));
		expect(deliveryStatusRank("delivered")).toBeLessThan(deliveryStatusRank("read"));
	});

	it("isDeliveryAtLeast accepts equal or better", () => {
		expect(isDeliveryAtLeast("delivered", "sent")).toBe(true);
		expect(isDeliveryAtLeast("delivered", "delivered")).toBe(true);
		expect(isDeliveryAtLeast("sent", "delivered")).toBe(false);
		expect(isDeliveryAtLeast("read", "delivered")).toBe(true);
		expect(isDeliveryAtLeast("failed", "sent")).toBe(false);
		expect(isDeliveryAtLeast(undefined, "sent")).toBe(false);
	});
});
