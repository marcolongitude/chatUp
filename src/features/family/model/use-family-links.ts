import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSession } from "@/features/auth";
import {
	acceptFamilyLinkApi,
	listFamilyLinksApi,
	requestFamilyLinkApi,
	revokeFamilyLinkApi,
	setFamilyLocationShareApi,
	setFamilyMapMonitorApi,
	setFamilyMapShareApi,
} from "../api/family.api";

export const familyLinksQueryKey = ["familyLinks"] as const;

export function useFamilyLinks() {
	const { isAuthenticated } = useAuthSession();
	const queryClient = useQueryClient();
	const [actionError, setActionError] = useState<string | null>(null);

	const query = useQuery({
		queryKey: familyLinksQueryKey,
		queryFn: listFamilyLinksApi,
		enabled: isAuthenticated,
		staleTime: 1000 * 30,
	});

	const invalidate = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: familyLinksQueryKey });
		void queryClient.invalidateQueries({ queryKey: ["nearbyUsers"] });
		void queryClient.invalidateQueries({ queryKey: ["familyMap"] });
	}, [queryClient]);

	const requestMutation = useMutation({
		mutationFn: requestFamilyLinkApi,
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const acceptMutation = useMutation({
		mutationFn: acceptFamilyLinkApi,
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const revokeMutation = useMutation({
		mutationFn: revokeFamilyLinkApi,
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const locationShareMutation = useMutation({
		mutationFn: ({ linkId, enabled }: { linkId: string; enabled: boolean }) =>
			setFamilyLocationShareApi(linkId, enabled),
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const mapShareMutation = useMutation({
		mutationFn: ({ linkId, enabled }: { linkId: string; enabled: boolean }) =>
			setFamilyMapShareApi(linkId, enabled),
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const mapMonitorMutation = useMutation({
		mutationFn: ({ linkId, enabled }: { linkId: string; enabled: boolean }) =>
			setFamilyMapMonitorApi(linkId, enabled),
		onSuccess: invalidate,
		onError: (err: Error) => setActionError(err.message),
	});

	const isFamilyChef = useMemo(
		() => (query.data ?? []).some((link) => link.status === "accepted" && link.iAmChef),
		[query.data],
	);

	return {
		links: query.data ?? [],
		isLoading: query.isLoading,
		isFamilyChef,
		error: query.error ? (query.error as Error).message : actionError,
		clearError: () => setActionError(null),
		requestLink: (peerId: string) => requestMutation.mutateAsync(peerId),
		acceptLink: (linkId: string) => acceptMutation.mutateAsync(linkId),
		revokeLink: (linkId: string) => revokeMutation.mutateAsync(linkId),
		setLocationShare: (linkId: string, enabled: boolean) =>
			locationShareMutation.mutateAsync({ linkId, enabled }),
		setMapShare: (linkId: string, enabled: boolean) =>
			mapShareMutation.mutateAsync({ linkId, enabled }),
		setMapMonitor: (linkId: string, enabled: boolean) =>
			mapMonitorMutation.mutateAsync({ linkId, enabled }),
		isBusy:
			requestMutation.isPending ||
			acceptMutation.isPending ||
			revokeMutation.isPending ||
			locationShareMutation.isPending ||
			mapShareMutation.isPending ||
			mapMonitorMutation.isPending,
	};
}
