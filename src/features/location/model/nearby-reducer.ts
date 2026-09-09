import type { NearbyUser } from "@/entities/contact";
import {
	resolveNearbyQueue,
	type NearbyContact,
	type NearbyDeltaEvent,
	type NearbyQueue,
	type NearbySnapshot,
} from "./nearby-contract";

function toContact(user: NearbyUser, queue: NearbyQueue): NearbyContact {
	return { ...user, queue };
}

function upsert(list: NearbyContact[], user: NearbyContact): NearbyContact[] {
	const idx = list.findIndex((c) => c.id === user.id);
	if (idx === -1) return [...list, user];
	const next = list.slice();
	next[idx] = { ...next[idx], ...user };
	return next;
}

function remove(list: NearbyContact[], userId: string): NearbyContact[] {
	return list.filter((c) => c.id !== userId);
}

/** Particiona resposta HTTP flat em filas family / discovery (sem duplicar). */
export function partitionNearbyUsers(users: NearbyUser[]): {
	family: NearbyContact[];
	discovery: NearbyContact[];
} {
	const family: NearbyContact[] = [];
	const discovery: NearbyContact[] = [];
	const seen = new Set<string>();

	for (const user of users) {
		if (!user.id || seen.has(user.id)) continue;
		seen.add(user.id);
		const queue = resolveNearbyQueue(user);
		const contact = toContact(user, queue);
		if (queue === "family") family.push(contact);
		else discovery.push(contact);
	}

	return { family, discovery };
}

export function buildNearbySnapshot(params: {
	observerId: string;
	perimeterKm: number;
	users: NearbyUser[];
	version?: number;
}): NearbySnapshot {
	const { family, discovery } = partitionNearbyUsers(params.users);
	return {
		version: params.version ?? Date.now(),
		observerId: params.observerId,
		perimeterKm: params.perimeterKm,
		family,
		discovery,
		updatedAt: Date.now(),
	};
}

export function applyNearbyDelta(snapshot: NearbySnapshot, event: NearbyDeltaEvent): NearbySnapshot {
	if (event.type === "nearby.sync") {
		return {
			...event.snapshot,
			updatedAt: Date.now(),
		};
	}

	const version = event.version ?? snapshot.version + 1;
	let family = snapshot.family;
	let discovery = snapshot.discovery;

	const queue = event.queue;
	const other: NearbyQueue = queue === "family" ? "discovery" : "family";

	if (event.type === "nearby.left") {
		if (queue === "family") family = remove(family, event.userId);
		else discovery = remove(discovery, event.userId);
		return { ...snapshot, family, discovery, version, updatedAt: Date.now() };
	}

	const contact = toContact(event.user, queue);
	// Contato não deve aparecer nas duas filas.
	if (other === "family") family = remove(family, contact.id);
	else discovery = remove(discovery, contact.id);

	if (queue === "family") {
		family = event.type === "nearby.entered" || event.type === "nearby.updated" ? upsert(family, contact) : family;
	} else {
		discovery =
			event.type === "nearby.entered" || event.type === "nearby.updated" ? upsert(discovery, contact) : discovery;
	}

	return { ...snapshot, family, discovery, version, updatedAt: Date.now() };
}
