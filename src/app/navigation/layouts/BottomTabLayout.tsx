import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Outlet, Link, useLocation } from '@tanstack/react-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'styled-components/native';
import { useTranslation } from '@/app/providers/i18n';
import { Header } from '@/app/navigation/components/Header';

export function BottomTabLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const location = useLocation();

  const tabs = [
    { name: 'conversations', path: '/main/conversations', icon: 'chatbubbles' },
    { name: 'profile', path: '/main/profile', icon: 'person' },
    { name: 'settings', path: '/main/settings', icon: 'settings' },
    { name: 'logout', path: '/main/logout', icon: 'log-out' },
  ];

  // Hide bottom bar on specific routes if needed
  const isChat = location.pathname.startsWith('/chat');
  const showBottomBar = !isChat;

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Outlet />
      </View>
      {showBottomBar && (
        <View style={[styles.tabBar, { 
          backgroundColor: theme.colors.background.secondary,
          borderTopColor: theme.colors.border.secondary,
        }]}>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const color = isActive ? theme.colors.button.primary : theme.colors.text.tertiary;
            
            return (
              <Link
                key={tab.name}
                to={tab.path as any}
                style={styles.tabItem}
              >
                <Ionicons name={tab.icon as any} size={24} color={color} />
                <Text style={[styles.tabLabel, { color }]}>
                  {t(`navigation.${tab.name}`)}
                </Text>
              </Link>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
