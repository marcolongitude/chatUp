/**
 * Widget: busca no header (FSD).
 * Ícone no canto direito; ao clicar, input animado sobrepõe o título no header.
 * Overlay fica dentro dos limites do header para evitar clipping no Android.
 */

import React, { useState, useRef, useEffect } from "react";
import {
	View,
	TextInput,
	TouchableOpacity,
	Animated,
	StyleSheet,
	Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "styled-components/native";

export interface HeaderSearchWidgetProps {
	value?: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
}

export function HeaderSearchWidget({
	value: controlledValue,
	onChangeText,
	placeholder = "Search users by name or email...",
}: HeaderSearchWidgetProps) {
	const theme = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const [internalValue, setInternalValue] = useState("");
	const inputRef = useRef<TextInput>(null);
	const animValue = useRef(new Animated.Value(0)).current;

	const isControlled = controlledValue !== undefined;
	const value = isControlled ? controlledValue : internalValue;
	const setValue = isControlled ? onChangeText : (v: string) => { setInternalValue(v); onChangeText(v); };

	useEffect(() => {
		Animated.timing(animValue, {
			toValue: isOpen ? 1 : 0,
			duration: 200,
			useNativeDriver: false,
		}).start();
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100);
		} else {
			Keyboard.dismiss();
		}
	}, [isOpen, animValue]);

	const openSearch = () => setIsOpen(true);
	const closeSearch = () => {
		setIsOpen(false);
		setValue("");
	};

	const overlayOpacity = animValue.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});

	return (
		<View style={styles.wrapper}>
			<Animated.View
				pointerEvents={isOpen ? "auto" : "none"}
				style={[
					styles.overlay,
					{
						backgroundColor: theme.colors.background.secondary,
						borderColor: theme.colors.border.secondary,
						opacity: overlayOpacity,
					},
				]}
			>
				{isOpen && (
					<View style={styles.inputRow}>
						<Ionicons name="search" size={20} color={theme.colors.text.tertiary} />
						<TextInput
							ref={inputRef}
							style={[styles.input, { color: theme.colors.text.primary }]}
							placeholder={placeholder}
							placeholderTextColor={theme.colors.text.tertiary}
							value={value}
							onChangeText={setValue}
							autoCapitalize="none"
							autoCorrect={false}
							returnKeyType="search"
						/>
						<TouchableOpacity onPress={closeSearch} style={styles.closeButton} hitSlop={12}>
							<Ionicons name="close-circle" size={22} color={theme.colors.text.tertiary} />
						</TouchableOpacity>
					</View>
				)}
			</Animated.View>
			{!isOpen && (
				<TouchableOpacity
					onPress={openSearch}
					style={styles.iconButton}
					accessibilityLabel={placeholder}
					accessibilityRole="button"
				>
					<Ionicons name="search" size={24} color={theme.colors.text.primary} />
				</TouchableOpacity>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		minWidth: 44,
	},
	iconButton: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
	},
	overlay: {
		position: "absolute",
		left: 8,
		right: 52,
		top: 4,
		bottom: 4,
		borderRadius: 10,
		borderWidth: 1,
		justifyContent: "center",
		overflow: "hidden",
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		height: 40,
	},
	input: {
		flex: 1,
		fontSize: 16,
		marginLeft: 8,
		paddingVertical: 0,
	},
	closeButton: {
		padding: 4,
	},
});
