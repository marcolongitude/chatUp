import { applyNearbyWsEvent } from "./apply-nearby-ws-event";
import { getNearbyStoreState, resetNearbyStore, replaceNearbySnapshot } from "./nearby-store";

describe("applyNearbyWsEvent", () => {
	beforeEach(() => {
		resetNearbyStore();
		replaceNearbySnapshot({
			version: 1,
			observerId: "me",
			perimeterKm: 1,
			family: [],
			discovery: [{ id: "d1", name: "Near", queue: "discovery" }],
			updatedAt: Date.now(),
		});
	});

	it("applies entered/left without wiping other contacts", () => {
		expect(
			applyNearbyWsEvent({
				type: "nearby.entered",
				data: {
					queue: "discovery",
					user: { id: "d2", name: "New", familyLink: false, distance: 80 },
				},
			})
		).toBe(true);

		let snap = getNearbyStoreState().snapshot!;
		expect(snap.discovery.map((c) => c.id).sort()).toEqual(["d1", "d2"]);

		expect(
			applyNearbyWsEvent({
				type: "nearby.left",
				data: { queue: "discovery", userId: "d1" },
			})
		).toBe(true);

		snap = getNearbyStoreState().snapshot!;
		expect(snap.discovery.map((c) => c.id)).toEqual(["d2"]);
	});

	it("routes family entered into family queue", () => {
		applyNearbyWsEvent({
			type: "nearby.entered",
			data: {
				queue: "family",
				user: { id: "f1", name: "Kid", familyLink: true, inGrace: true },
			},
		});
		const snap = getNearbyStoreState().snapshot!;
		expect(snap.family[0]?.id).toBe("f1");
		expect(snap.family[0]?.inGrace).toBe(true);
		expect(snap.discovery.find((c) => c.id === "f1")).toBeUndefined();
	});

	it("applies nearby.sync snapshot", () => {
		expect(
			applyNearbyWsEvent({
				type: "nearby.sync",
				data: {
					snapshot: {
						version: 99,
						observerId: "me",
						perimeterKm: 2,
						family: [{ id: "f9", name: "Fam", familyLink: true }],
						discovery: [{ id: "d9", name: "Disc", familyLink: false }],
					},
				},
			})
		).toBe(true);
		const snap = getNearbyStoreState().snapshot!;
		expect(snap.perimeterKm).toBe(2);
		expect(snap.family.map((c) => c.id)).toEqual(["f9"]);
		expect(snap.discovery.map((c) => c.id)).toEqual(["d9"]);
	});
});
