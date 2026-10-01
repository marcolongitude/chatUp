import { applyNearbyDelta, buildNearbySnapshot, partitionNearbyUsers } from "./nearby-reducer";
import type { NearbyUser } from "@/entities/contact";

const discoveryPeer: NearbyUser = {
	id: "d1",
	name: "Near",
	familyLink: false,
	distance: 200,
};

const familyInside: NearbyUser = {
	id: "f1",
	name: "Kid",
	familyLink: true,
	inGrace: false,
	locationVisible: false,
};

const familyGrace: NearbyUser = {
	id: "f2",
	name: "Grace",
	familyLink: true,
	inGrace: true,
	locationVisible: false,
};

describe("partitionNearbyUsers", () => {
	it("splits family vs discovery without duplicates", () => {
		const { family, discovery } = partitionNearbyUsers([discoveryPeer, familyInside, familyGrace, discoveryPeer]);
		expect(family.map((c) => c.id).sort()).toEqual(["f1", "f2"]);
		expect(discovery.map((c) => c.id)).toEqual(["d1"]);
		expect(family.every((c) => c.queue === "family")).toBe(true);
		expect(discovery.every((c) => c.queue === "discovery")).toBe(true);
	});
});

describe("applyNearbyDelta", () => {
	const snapshot = buildNearbySnapshot({
		observerId: "me",
		perimeterKm: 1,
		users: [discoveryPeer, familyInside],
	});

	it("enters discovery without touching family", () => {
		const next = applyNearbyDelta(snapshot, {
			type: "nearby.entered",
			queue: "discovery",
			user: { id: "d2", name: "New", familyLink: false },
		});
		expect(next.discovery.map((c) => c.id)).toEqual(["d1", "d2"]);
		expect(next.family.map((c) => c.id)).toEqual(["f1"]);
	});

	it("leaves discovery keeping family intact", () => {
		const next = applyNearbyDelta(snapshot, {
			type: "nearby.left",
			queue: "discovery",
			userId: "d1",
		});
		expect(next.discovery).toEqual([]);
		expect(next.family.map((c) => c.id)).toEqual(["f1"]);
	});

	it("moves contact between queues on updated", () => {
		const next = applyNearbyDelta(snapshot, {
			type: "nearby.updated",
			queue: "family",
			user: { id: "d1", name: "Near", familyLink: true, inGrace: true },
		});
		expect(next.discovery.find((c) => c.id === "d1")).toBeUndefined();
		expect(next.family.find((c) => c.id === "d1")?.inGrace).toBe(true);
	});
});
