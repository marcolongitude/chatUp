import { createRoute, Navigate } from '@tanstack/react-router';
import { rootRoute } from './rootRoute';
import { LoginPage } from '@/app/routes/login';
import { SignUpPage } from '@/app/routes/signup';
import { CreateProfilePage } from '@/app/routes/create-profile';
import { ConversationsPage } from '@/app/routes/conversations';
import { ProfilePage } from '@/app/routes/profile';
import { SettingsPage } from '@/app/routes/settings';
import { LogoutPage } from '@/app/routes/logout';
import { ChatWindowPage } from '@/app/routes/chat-window';
import { BottomTabLayout } from '@/app/navigation/layouts/BottomTabLayout';

const IndexRedirect = () => <Navigate to="/main/conversations" />;

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
  component: LoginPage,
});

export const signupRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'signup',
  component: SignUpPage,
});

export const createProfileRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'create-profile',
  component: CreateProfilePage,
});

// App Layout Route (Pathless) - Provides Header to both tabs and chat
export const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  component: BottomTabLayout,
});

// Main Route Group (Tabs)
export const tabsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: 'main',
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
      logoutRoute,
    ]),
    chatRoute,
  ]),
]);
