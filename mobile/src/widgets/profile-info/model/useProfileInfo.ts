import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";
import { useTranslation } from "react-i18next";
import { axiosInstance } from "@/shared/api";
import { timestampToDate, formatDate } from "../lib/dateUtils";
import type { UserProfile } from "@/features/auth";

interface UserProfileResponse {
	id: string;
	email: string;
	displayName?: string;
	photoURL?: string;
	phoneNumber?: string;
	bio?: string;
	publicKey?: string;
	createdAt: string | Date;
	updatedAt: string | Date;
}

export function useProfileInfo() {
	const { user, isAuthenticated } = useAuth();
	const { t, i18n } = useTranslation();
	const currentLanguage = i18n.language;
	const [imageLoaded, setImageLoaded] = useState(false);

	// Buscar dados completos do usuário do PostgreSQL
	const {
		data: userProfileData,
		isLoading,
		error: queryError,
	} = useQuery<UserProfileResponse>({
		queryKey: ["userProfile", user?.id],
		queryFn: async () => {
			if (!user?.id) throw new Error("User ID not available");
			const response = await axiosInstance.get<UserProfileResponse>(`/users/${user.id}`);
			return response.data;
		},
		enabled: !!user?.id && isAuthenticated,
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Converter dados da API para UserProfile
	const userProfile: UserProfile | null = useMemo(() => {
		if (!userProfileData) return null;
		return {
			id: userProfileData.id,
			email: userProfileData.email,
			displayName: userProfileData.displayName || "",
			hasProfile: true,
			photoURL: userProfileData.photoURL,
			phoneNumber: userProfileData.phoneNumber,
			bio: userProfileData.bio,
			createdAt: userProfileData.createdAt,
			updatedAt: userProfileData.updatedAt,
		};
	}, [userProfileData]);

	const photoURL = userProfile?.photoURL || user?.photoURL;
	const displayName = userProfile?.displayName || user?.displayName || t("profile.user");
	const avatarInitial = displayName.charAt(0).toUpperCase();

	const formattedCreatedAt = useMemo(() => 
		formatDate(timestampToDate(userProfile?.createdAt), currentLanguage), 
		[userProfile?.createdAt, currentLanguage]
	);

	const formattedUpdatedAt = useMemo(() => 
		formatDate(timestampToDate(userProfile?.updatedAt), currentLanguage), 
		[userProfile?.updatedAt, currentLanguage]
	);

	const error = queryError ? (queryError as Error).message : null;

	return {
		userProfile,
		isLoading,
		error,
		photoURL,
		displayName,
		avatarInitial,
		imageLoaded,
		setImageLoaded,
		formattedCreatedAt,
		formattedUpdatedAt,
        t,
        currentLanguage
	};
}
