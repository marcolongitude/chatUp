import type { NearbyDeltaEvent, NearbySnapshot } from "./nearby-contract";
import { applyNearbyDelta } from "./nearby-reducer";

export interface NearbyStoreState {
	snapshot: NearbySnapshot | null;
	/** True while first snapshot for current observer is still loading. */
	isBootstrapping: boolean;
	/** True while a background refresh is in flight (UI keeps list). */
	isRefreshing: boolean;
	error: string | null;
	permissionGranted: boolean | null;
}

type Listener = () => void;

const initialState: NearbyStoreState = {
	snapshot: null,
	isBootstrapping: false,
	isRefreshing: false,
	error: null,
	permissionGranted: null,
};

let state: NearbyStoreState = { ...initialState };
const listeners = new Set<Listener>();

function emit(): void {
	listeners.forEach((l) => l());
}

function setState(patch: Partial<NearbyStoreState>): void {
	state = { ...state, ...patch };
	emit();
}

export function getNearbyStoreState(): NearbyStoreState {
	return state;
}

export function subscribeNearbyStore(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function resetNearbyStore(): void {
	state = { ...initialState };
	emit();
}

export function setNearbyBootstrapping(isBootstrapping: boolean): void {
	setState({ isBootstrapping });
}

export function setNearbyRefreshing(isRefreshing: boolean): void {
	setState({ isRefreshing });
}

export function setNearbyError(error: string | null): void {
	setState({ error });
}

export function setNearbyPermissionGranted(permissionGranted: boolean | null): void {
	setState({ permissionGranted });
}

export function replaceNearbySnapshot(snapshot: NearbySnapshot): void {
	setState({
		snapshot,
		isBootstrapping: false,
		isRefreshing: false,
		error: null,
	});
}

export function patchNearbyDelta(event: NearbyDeltaEvent): void {
	const base =
		state.snapshot ??
		({
			version: 0,
			observerId: "",
			perimeterKm: 1,
			family: [],
			discovery: [],
			updatedAt: Date.now(),
		} as NearbySnapshot);
	setState({
		snapshot: applyNearbyDelta(base, event),
		isBootstrapping: false,
		error: null,
	});
}
