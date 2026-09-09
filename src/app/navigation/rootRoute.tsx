import { createRootRoute } from '@tanstack/react-router';
import { RootLayout } from './layouts/RootLayout';

export const rootRoute = createRootRoute({
  component: RootLayout,
});
