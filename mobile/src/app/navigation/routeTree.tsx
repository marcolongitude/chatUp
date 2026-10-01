import React from 'react';
import { Outlet, createRoute, Navigate } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { LoginPage } from '@/app/routes/login';
import { SignUpPage } from '@/app/routes/signup';
import { CreateProfilePage } from '@/app/routes/create-profile';
import { ConversationsPage } from '@/app/routes/conversations';
import { ProfilePage } from '@/app/routes/profile';
import { SettingsPage } from '@/app/routes/settings';
import { LogoutPage } from '@/app/routes/logout';
import { ChatWindowPage } from '@/app/routes/chat-window';
import FamilyMapPage from '@/app/routes/family-map';
import { BottomTabLayout } from '@/app/navigation/layouts/BottomTabLayout';
import { AuthGate, useAuthSession } from '@/features/auth';

function IndexRedirect() {
  const { isAuthenticated, isLoading } = useAuthSession();
  if (isLoading) {
    return <AuthGate />;
  }
  if (isAuthenticated) {
    return <Navigate to="/main/conversations" />;
  }
  return <Navigate to="/auth/login" />;
}

function ProtectedAppLayout() {
  return (
    <AuthGate requireAuth>
      <BottomTabLayout />
    </AuthGate>
  );
}

// Index Route
export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRedirect,
});

// Auth Route Group
export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'auth',
});

export const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'login',
  component: function LoginRoute() {
    return (
      <AuthGate rejectAuth>
        <LoginPage />
      </AuthGate>
    );
  },
});

export const signupRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'signup',
  component: function SignUpRoute() {
    return (
      <AuthGate rejectAuth>
        <SignUpPage />
      </AuthGate>
    );
  },
});

export const createProfileRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'create-profile',
  component: function CreateProfileRoute() {
    return (
      <AuthGate requireAuth>
        <CreateProfilePage />
      </AuthGate>
    );
  },
});

// App Layout Route (Pathless) - Provides Header to both tabs and chat
export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  component: ProtectedAppLayout,
});

// Main Route Group (Tabs)
export const tabsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'main',
  component: function MainTabsOutlet() {
    return <Outlet />;
  },
});

// ... (conversationsRoute, profileRoute, etc. stay same but change getParentRoute)

export const conversationsRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: 'conversations',
  component: ConversationsPage,
});

export const profileRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: 'profile',
  component: ProfilePage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: 'settings',
  component: SettingsPage,
});

export const logoutRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: 'logout',
  component: LogoutPage,
});

export const familyMapRoute = createRoute({
  getParentRoute: () => tabsRoute,
  path: 'family-map',
  component: FamilyMapPage,
});

// Individual Chat Route
export const chatRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'chat/$chatId',
  component: ChatWindowPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      initialName: (search.initialName as string) || undefined,
      initialAvatar: (search.initialAvatar as string) || undefined,
    };
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute.addChildren([loginRoute, signupRoute, createProfileRoute]),
  appLayoutRoute.addChildren([
    tabsRoute.addChildren([
      conversationsRoute,
      profileRoute,
      settingsRoute,
      familyMapRoute,
      logoutRoute,
    ]),
    chatRoute,
  ]),
]);
