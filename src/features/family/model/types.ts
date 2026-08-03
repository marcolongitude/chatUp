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
	createdAt?: string;
	updatedAt?: string;
	acceptedAt?: string;
}
