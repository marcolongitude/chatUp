import { Image } from "expo-image";
import { KeyboardAvoidingView, ScrollView } from "react-native";
import styled from "styled-components/native";

export const FormContainer = styled(KeyboardAvoidingView)`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background.primary};
`;

export const ScrollContent = styled(ScrollView)`
  flex: 1;
`;

export const Form = styled.View`
  padding: ${(props) => props.theme.spacing.lg}px;
`;

export const LogoContainer = styled.View`
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  margin-top: ${(props) => props.theme.spacing.xs}px;
`;

export const LogoImage = styled(Image)`
  width: 200px;
  height: 100px;
`;

export const Title = styled.Text`
  font-size: ${(props) => props.theme.typography.fontSize["3xl"]}px;
  font-weight: ${(props) => props.theme.typography.fontWeight.extrabold};
  font-family: ${(props) => props.theme.typography.fontFamily.primary};
  color: ${(props) => props.theme.colors.text.primary};
  margin-bottom: ${(props) => props.theme.spacing.sm}px;
  letter-spacing: -0.5px;
  text-align: center;
`;

export const Subtitle = styled.Text`
  font-size: ${(props) => props.theme.typography.fontSize.base}px;
  font-family: ${(props) => props.theme.typography.fontFamily.secondary};
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: ${(props) => props.theme.spacing.xl}px;
  margin-top: ${(props) => props.theme.spacing.xs}px;
  line-height: ${(props) => props.theme.typography.fontSize.base * props.theme.typography.lineHeight.normal * 1.2}px;
  text-align: center;
  padding-horizontal: ${(props) => props.theme.spacing.md}px;
`;

export const ButtonContainer = styled.View`
  margin-top: 8px;
  margin-bottom: 24px;
`;

export const ErrorText = styled.Text`
  color: ${(props) => props.theme.colors.text.error};
  font-size: ${(props) => props.theme.typography.fontSize.sm}px;
  font-family: ${(props) => props.theme.typography.fontFamily.primary};
  margin-bottom: ${(props) => props.theme.spacing.md}px;
  text-align: center;
`;

export const FooterContainer = styled.View`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
  flex-wrap: wrap;
`;

export const FooterText = styled.Text`
  font-size: ${(props) => props.theme.typography.fontSize.sm}px;
  font-family: ${(props) => props.theme.typography.fontFamily.secondary};
  color: ${(props) => props.theme.colors.text.secondary};
`;
