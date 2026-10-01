/**
 * Contrato da lista nearby (HTTP snapshot hoje; deltas WS no próximo passo).
 *
 * Filas:
 * - family: vínculos aceitos (geo ou grace); regras de share/grace
 * - discovery: usuários dentro do raio km, sem vínculo família
 */

import type { NearbyUser } from "@/entities/contact";

export type NearbyQueue = "family" | "discovery";

export type NearbyContact = NearbyUser & {
	queue: NearbyQueue;
};

export interface NearbySnapshot {
	version: number;
	observerId: string;
	perimeterKm: number;
	family: NearbyContact[];
	discovery: NearbyContact[];
	updatedAt: number;
}

/** Eventos WS planejados — mesmo motor `applyNearbyDelta`. */
export type NearbyDeltaEvent =
	| {
			type: "nearby.entered";
			queue: NearbyQueue;
			user: NearbyUser;
			version?: number;
	  }
	| {
			type: "nearby.left";
			queue: NearbyQueue;
			userId: string;
			version?: number;
	  }
	| {
			type: "nearby.updated";
			queue: NearbyQueue;
			user: NearbyUser;
			version?: number;
	  }
	| {
			type: "nearby.sync";
			snapshot: Omit<NearbySnapshot, "updatedAt">;
	  };

export function resolveNearbyQueue(user: NearbyUser): NearbyQueue {
	return user.familyLink ? "family" : "discovery";
}
