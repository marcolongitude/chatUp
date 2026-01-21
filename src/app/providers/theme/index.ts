import { colors } from './colors';
import { typography } from './typography';

export const darkTheme = {
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

export type Theme = typeof darkTheme;
export * from './ThemeProvider';
