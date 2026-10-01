export type FamilyLinkStatus = "pending" | "accepted" | "revoked";

export interface FamilyLink {
	id: string;
	peerId: string;
	peerName: string;
	peerAvatar?: string;
	status: FamilyLinkStatus;
	requestedBy: string;
	myLocationShare: boolean;
	peerLocationShare: boolean;
	locationShareActive: boolean;
	myMapShare: boolean;
	peerMapShare: boolean;
	myMapMonitor: boolean;
	peerMapMonitor: boolean;
	mapTrackingActive: boolean;
	iAmChef: boolean;
	createdAt?: string;
	updatedAt?: string;
	acceptedAt?: string;
}
