import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Platform } from "react-native";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { Input, Button, Link } from "@/shared/ui";
import { useTranslation } from "@/app/providers/i18n";
import type { RegisterData } from "@/features/auth";
import {
	FormContainer,
	ScrollContent,
	Form,
	LogoContainer,
	LogoImage,
	Title,
	Subtitle,
	ButtonContainer,
	ErrorText,
	FooterContainer,
	FooterText,
} from "./styled";

interface SignUpFormProps {
	onSubmit: (data: RegisterData) => void;
	onSignIn: () => void;
	isLoading?: boolean;
	error?: string | null;
}

interface SignUpFormData extends RegisterData {
	confirmPassword: string;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, onSignIn, isLoading = false, error }) => {
	const theme = useTheme();
	const { t } = useTranslation();
	const {
		control,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<SignUpFormData>({
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	const password = watch("password");

	const handleFormSubmit = (data: SignUpFormData) => {
		const { confirmPassword, ...registerData } = data;
		onSubmit(registerData);
	};

	return (
		<FormContainer
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
		>
			<ScrollContent contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
				<Form>
					<LogoContainer>
						<LogoImage
							source={require("~/assets/logo-chatup.png")}
							contentFit="contain"
							cachePolicy="memory-disk"
							transition={200}
						/>
					</LogoContainer>
					<Title>{t("auth.createAccount")}</Title>
					<Subtitle>{t("auth.signUpSubtitle")}</Subtitle>

					{error && <ErrorText>{error}</ErrorText>}

					<Controller
						control={control}
						rules={{
							required: t("auth.nameRequired"),
							minLength: {
								value: 2,
								message: t("auth.nameMinLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.name")}
								placeholder={t("auth.namePlaceholder")}
								icon={<Ionicons name="person" size={20} color={theme.colors.icon.secondary} />}
								autoCapitalize="words"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.name?.message}
							/>
						)}
						name="name"
					/>

					<Controller
						control={control}
						rules={{
							required: t("auth.emailRequired"),
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: t("auth.emailInvalid"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.email")}
								placeholder={t("auth.emailPlaceholder")}
								icon={<Ionicons name="mail" size={20} color={theme.colors.icon.secondary} />}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.email?.message}
							/>
						)}
						name="email"
					/>

					<Controller
						control={control}
						rules={{
							required: t("auth.passwordRequired"),
							minLength: {
								value: 6,
								message: t("auth.passwordMinLength"),
							},
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.password")}
								placeholder={t("auth.passwordPlaceholder")}
								icon={<Ionicons name="lock-closed" size={20} color={theme.colors.icon.secondary} />}
								secureTextEntry
								showPasswordToggle
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.password?.message}
							/>
						)}
						name="password"
					/>

					<Controller
						control={control}
						rules={{
							required: t("auth.confirmPasswordRequired"),
							validate: (value) => value === password || t("auth.passwordsDoNotMatch"),
						}}
						render={({ field: { onChange, onBlur, value } }) => (
							<Input
								label={t("auth.confirmPassword")}
								placeholder={t("auth.confirmPasswordPlaceholder")}
								icon={<Ionicons name="lock-closed" size={20} color={theme.colors.icon.secondary} />}
								secureTextEntry
								showPasswordToggle
								autoCapitalize="none"
								autoCorrect={false}
								value={value}
								onChangeText={onChange}
								onBlur={onBlur}
								error={errors.confirmPassword?.message}
							/>
						)}
						name="confirmPassword"
					/>

					<ButtonContainer>
						<Button
							title={t("auth.signUp")}
							onPress={handleSubmit(handleFormSubmit)}
							variant="primary"
							loading={isLoading}
						/>
					</ButtonContainer>

					<FooterContainer>
						<FooterText>{t("auth.alreadyHaveAccount")}</FooterText>
						<Link onPress={onSignIn} variant="primary">
							{t("auth.login")}
						</Link>
					</FooterContainer>
				</Form>
			</ScrollContent>
		</FormContainer>
	);
};
