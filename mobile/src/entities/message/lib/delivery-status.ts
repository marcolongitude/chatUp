import type { MessageDeliveryStatus } from "../model/types";

export function deliveryFromFlags(isDelivered: boolean, isRead: boolean): MessageDeliveryStatus {
	if (isRead) return "read";
	if (isDelivered) return "delivered";
	return "sent";
}

/** Rank for assertions: later statuses imply earlier ones succeeded. */
export function deliveryStatusRank(status: MessageDeliveryStatus): number {
	switch (status) {
		case "pending":
			return 0;
		case "sent":
			return 1;
		case "delivered":
			return 2;
		case "read":
			return 3;
		case "failed":
			return -1;
		default:
			return -1;
	}
}

export function isDeliveryAtLeast(
	actual: MessageDeliveryStatus | undefined,
	minimum: "sent" | "delivered" | "read"
): boolean {
	if (!actual || actual === "failed") return false;
	return deliveryStatusRank(actual) >= deliveryStatusRank(minimum);
}
