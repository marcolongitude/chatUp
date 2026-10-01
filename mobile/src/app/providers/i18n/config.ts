import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { ptBR, en, es } from "./locales";

const STORE_KEY = "settings.language";

const resources = {
	"pt-BR": { translation: ptBR },
	en: { translation: en },
	es: { translation: es },
};

export const initI18n = async () => {
    try {
        const savedLanguage = await AsyncStorage.getItem(STORE_KEY);
        const deviceLanguage = Localization.getLocales()[0]?.languageTag || "en";
        const language = savedLanguage || deviceLanguage;

        await i18n.use(initReactI18next).init({
            resources,
            lng: language,
            fallbackLng: "en",
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });
    } catch (error) {
        console.error("I18n initialization failed", error);
    }
};

export const saveLanguage = async (language: string) => {
    await AsyncStorage.setItem(STORE_KEY, language);
    await i18n.changeLanguage(language);
};

export default i18n;
