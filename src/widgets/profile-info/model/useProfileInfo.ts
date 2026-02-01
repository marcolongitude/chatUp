import { useState, useEffect, useMemo } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/features/auth";
import { useTranslation } from "@/app/providers/i18n";
import { clearAllLocalMessages } from "@/shared/lib/database/utils";
import { timestampToDate, formatDate } from "../lib/dateUtils";

export function useProfileInfo() {
	const { userProfile, user, isLoading, error, syncPhotoURL } = useAuth();
	const { t, currentLanguage } = useTranslation();
	const [imageLoaded, setImageLoaded] = useState(false);

	const photoURL = user?.photoURL || userProfile?.photoURL;
	const displayName = userProfile?.displayName || user?.displayName || t("profile.user");
	const avatarInitial = displayName.charAt(0).toUpperCase();

	useEffect(() => {
		if (user && user.photoURL && (!userProfile || !userProfile.photoURL)) {
			syncPhotoURL();
		}
	}, [user?.photoURL, userProfile?.photoURL, userProfile, syncPhotoURL]);

	const formattedCreatedAt = useMemo(() => 
		formatDate(timestampToDate(userProfile?.createdAt), currentLanguage), 
		[userProfile?.createdAt, currentLanguage]
	);

    const handleClearMessages = () => {
        Alert.alert(
            t("profile.clearMessagesTitle") || "Limpar Mensagens Locais", 
            t("profile.clearMessagesConfirm") || "Tem certeza?", 
            [
                { text: t("common.cancel") || "Cancelar", style: "cancel" },
                { 
                    text: t("common.clear") || "Limpar", 
                    style: "destructive", 
                    onPress: clearAllLocalMessages 
                },
            ]
        );
    };

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
        handleClearMessages,
        t,
        currentLanguage
	};
}
