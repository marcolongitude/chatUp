import { createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree';

const history = createMemoryHistory({
  initialEntries: ['/'],
});

export const router = createRouter({
  routeTree,
  history,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
