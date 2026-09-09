export interface FamilyMapMember {
	linkId: string;
	peerId: string;
	peerName: string;
	peerAvatar?: string;
	mapTrackingActive: boolean;
	locationVisible: boolean;
	inPerimeter: boolean;
	inGrace: boolean;
	latitude?: number;
	longitude?: number;
	locationUpdatedAt?: string;
	distanceM?: number;
}

export interface FamilyMapSnapshot {
	chefId: string;
	perimeterKm: number;
	members: FamilyMapMember[];
}
