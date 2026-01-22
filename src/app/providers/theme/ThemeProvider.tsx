import React from "react";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";
import { colors } from "./colors";
import { typography } from "./typography";

// Definir darkTheme localmente para evitar require cycle
const darkTheme = {
	colors,
	spacing: {
		xs: 4,
		sm: 8,
		md: 16,
		lg: 24,
		xl: 32,
		xxl: 40,
	},
	borderRadius: {
		xs: 4,
		sm: 8,
		md: 12,
		lg: 16,
		xl: 24,
	},
	typography,
};

interface ThemeProviderProps {
	children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	console.log("🔍 ThemeProvider: Renderizando...");
	return <StyledThemeProvider theme={darkTheme}>{children}</StyledThemeProvider>;
};
