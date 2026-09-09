/**
 * Configuração global para testes
 */
import '@testing-library/jest-native/extend-expect';

// Mock do AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock do NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

// Mock do TanStack Router
jest.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: jest.fn(),
    history: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    },
  }),
  useParams: () => ({}),
  useSearch: () => ({}),
  Link: ({ children }: any) => children,
  Outlet: ({ children }: any) => children,
  Navigate: ({ to }: any) => null,
  createRoute: jest.fn(() => ({
    addChildren: jest.fn(),
    update: jest.fn(),
  })),
  createRootRoute: jest.fn(() => ({
    addChildren: jest.fn(),
  })),
  createRouter: jest.fn(() => ({})),
}));

// Mock do SafeAreaProvider
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children }: any) => children,
    useSafeAreaInsets: () => inset,
  };
});

