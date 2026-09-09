import { createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from './routeTree';

const history = createMemoryHistory({
  initialEntries: ['/'],
});

export const router = createRouter({
  routeTree,
  history,
  defaultPreload: 'intent',
  // RN: keep false (a function is truthy and still enables DOM scroll setup).
  scrollRestoration: false,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
