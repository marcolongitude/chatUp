import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from 'styled-components/native';
import { useRouter, useLocation } from '@tanstack/react-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/app/providers/i18n';

export function Header() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const location = useLocation();

  // Logic to determine title and back button
  const getTitle = () => {
    if (location.pathname.startsWith('/chat')) return t('navigation.chat');
    if (location.pathname === '/main/conversations') return t('navigation.conversations');
    if (location.pathname === '/main/profile') return t('navigation.profile');
    if (location.pathname === '/main/settings') return t('navigation.settings');
    if (location.pathname === '/main/logout') return t('navigation.logout');
    return 'ChatUp';
  };

  const showBackButton = location.pathname.startsWith('/chat') || 
                       (location.pathname.startsWith('/auth') && location.pathname !== '/auth/login');

  return (
    <View style={[styles.header, { backgroundColor: theme.colors.background.secondary }]}>
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity onPress={() => router.history.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          {getTitle()}
        </Text>
      </View>
      <View style={styles.right} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  left: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
