import { Alert, Linking, Platform } from "react-native";

export async function openLocationSettings(): Promise<void> {
	try {
		if (Platform.OS === "android") {
			await Linking.openSettings();
		} else {
			await Linking.openURL("app-settings:");
		}
	} catch {
		Alert.alert("Erro", "Não foi possível abrir as configurações.");
	}
}
