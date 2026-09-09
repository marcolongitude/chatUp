import type { NearbyUser } from "@/entities/contact";
import type { NearbyContact, NearbyDeltaEvent, NearbyQueue, NearbySnapshot } from "./nearby-contract";
import { patchNearbyDelta } from "./nearby-store";

function asQueue(value: unknown): NearbyQueue {
	return value === "family" ? "family" : "discovery";
}

function mapWsUser(raw: Record<string, unknown>): NearbyUser {
	const location = raw.location as { latitude?: number; longitude?: number } | undefined;
	return {
		id: String(raw.id ?? ""),
		name: String(raw.name ?? ""),
		avatar: raw.avatar != null ? String(raw.avatar) : undefined,
		distance: typeof raw.distance === "number" ? raw.distance : undefined,
		locationVisible: Boolean(raw.locationVisible),
		inGrace: Boolean(raw.inGrace),
		familyLink: Boolean(raw.familyLink),
		latitude: location?.latitude,
		longitude: location?.longitude,
		location:
			location?.latitude != null && location?.longitude != null
				? { latitude: location.latitude, longitude: location.longitude }
				: undefined,
	};
}

function mapWsContact(raw: Record<string, unknown>, queue: NearbyQueue): NearbyContact {
	return { ...mapWsUser(raw), queue };
}

/** Aplica evento WS `nearby.*` na NearbyStore (mesmo motor do HTTP). */
export function applyNearbyWsEvent(
	event: { type: string; data: unknown },
	options?: { allowDiscovery?: boolean }
): boolean {
	const allowDiscovery = options?.allowDiscovery !== false;
	const data = (event.data ?? {}) as Record<string, unknown>;

	switch (event.type) {
		case "nearby.entered":
		case "nearby.updated": {
			const queue = asQueue(data.queue);
			if (!allowDiscovery && queue === "discovery") return false;
			const userRaw = data.user as Record<string, unknown> | undefined;
			if (!userRaw?.id) return false;
			const delta: NearbyDeltaEvent = {
				type: event.type,
				queue,
				user: mapWsUser(userRaw),
				version: typeof data.version === "number" ? data.version : undefined,
			};
			patchNearbyDelta(delta);
			return true;
		}
		case "nearby.left": {
			const userId = String(data.userId ?? "");
			if (!userId) return false;
			patchNearbyDelta({
				type: "nearby.left",
				queue: asQueue(data.queue),
				userId,
				version: typeof data.version === "number" ? data.version : undefined,
			});
			return true;
		}
		case "nearby.sync": {
			const raw = data.snapshot as Record<string, unknown> | undefined;
			if (!raw || !Array.isArray(raw.family) || !Array.isArray(raw.discovery)) {
				return false;
			}
			const discoveryRaw = allowDiscovery
				? (raw.discovery as Record<string, unknown>[])
				: [];
			const snapshot: Omit<NearbySnapshot, "updatedAt"> = {
				version: Number(raw.version ?? Date.now()),
				observerId: String(raw.observerId ?? ""),
				perimeterKm: Number(raw.perimeterKm ?? 1),
				family: (raw.family as Record<string, unknown>[]).map((c) => mapWsContact(c, "family")),
				discovery: discoveryRaw.map((c) => mapWsContact(c, "discovery")),
			};
			patchNearbyDelta({ type: "nearby.sync", snapshot });
			return true;
		}
		default:
			return false;
	}
}
