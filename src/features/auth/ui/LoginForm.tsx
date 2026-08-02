import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled, { useTheme } from "styled-components/native";

import type { LoginCredentials } from "../model/auth";
import { Button, Input, Link } from "@/shared/ui";

const logoImage = require("~/assets/logo-chatup.png");

interface LoginFormProps {
  onSubmit: (data: LoginCredentials) => void;
  onForgotPassword: () => void;
  onSignUp?: () => void;
  onGoogleSignIn?: () => void;
  onFacebookSignIn?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const FormContainer = styled(KeyboardAvoidingView)`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background.primary};
`;

const ScrollContent = styled(ScrollView)`
  flex: 1;
`;

const Form = styled.View`
  padding: ${(props) => props.theme.spacing.lg}px;
`;

const LogoContainer = styled.View`
  align-items: center;
  justify-content: center;
  margin-bottom: ${(props) => props.theme.spacing.xl}px;
  margin-top: ${(props) => props.theme.spacing.md}px;
  background-color: transparent;
`;

const LogoImage = styled(Image)`
  width: 280px;
  height: 70px;
  background-color: transparent;
`;

const ButtonContainer = styled.View`
  margin-top: 8px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SocialButton = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.background.input};
  border-radius: ${(props) => props.theme.borderRadius.md}px;
  padding: ${(props) => props.theme.spacing.md}px;
  margin-top: ${(props) => props.theme.spacing.md}px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const SocialButtonText = styled.Text`
  font-size: ${(props) => props.theme.typography.fontSize.base}px;
  font-weight: ${(props) => props.theme.typography.fontWeight.semibold};
  font-family: ${(props) => props.theme.typography.fontFamily.primary};
  color: ${(props) => props.theme.colors.text.primary};
  margin-left: ${(props) => props.theme.spacing.md}px;
`;

const SocialIconContainer = styled.View`
  width: 20px;
  height: 20px;
  justify-content: center;
  align-items: center;
`;

const ForgotPasswordContainer = styled.View`
  align-items: flex-end;
  margin-top: 8px;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
`;

const FooterContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: ${(props) => props.theme.spacing.md}px;
`;

const FooterText = styled.Text`
  font-size: ${(props) => props.theme.typography.fontSize.sm}px;
  font-family: ${(props) => props.theme.typography.fontFamily.secondary};
  color: ${(props) => props.theme.colors.text.secondary};
`;

const ErrorText = styled.Text`
  color: ${(props) => props.theme.colors.status.error};
  font-size: ${(props) => props.theme.typography.fontSize.sm}px;
  font-family: ${(props) => props.theme.typography.fontFamily.primary};
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  text-align: center;
`;

export function LoginForm({
  onSubmit,
  onForgotPassword,
  onSignUp,
  onGoogleSignIn,
  isLoading = false,
  error,
}: LoginFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = (data: LoginCredentials) => {
    onSubmit(data);
  };

  return (
    <FormContainer behavior={Platform.OS === "ios" ? "padding" : "padding"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : insets.top + 20}>
      <ScrollContent
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Platform.OS === "android" ? insets.bottom + 100 : insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Form>
          <LogoContainer>
            <LogoImage source={logoImage} contentFit="contain" cachePolicy="memory-disk" />
          </LogoContainer>

          {error && <ErrorText>{error}</ErrorText>}

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
                testID="e2e.login.email"
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
                testID="e2e.login.password"
              />
            )}
            name="password"
          />

          <ButtonContainer>
            <Button
              title={t("auth.login")}
              onPress={handleSubmit(handleFormSubmit)}
              variant="primary"
              loading={isLoading}
              testID="e2e.login.submit"
            />
          </ButtonContainer>

          <ForgotPasswordContainer>
            <Link onPress={onForgotPassword} variant="primary">
              {t("auth.forgotPassword")}
            </Link>
          </ForgotPasswordContainer>

          <SocialButton activeOpacity={0.7} onPress={onGoogleSignIn || (() => undefined)} disabled={!onGoogleSignIn}>
            <SocialIconContainer>
              <Ionicons name="logo-google" size={20} color={theme.colors.icon.primary} />
            </SocialIconContainer>
            <SocialButtonText>{t("auth.continueWithGoogle")}</SocialButtonText>
          </SocialButton>

          <FooterContainer>
            <FooterText>{t("auth.dontHaveAccount")}</FooterText>
            <Link onPress={onSignUp || (() => undefined)} variant="primary">
              {t("auth.signUp")}
            </Link>
          </FooterContainer>
        </Form>
      </ScrollContent>
    </FormContainer>
  );
}
