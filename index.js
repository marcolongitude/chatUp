// 1. Trava de segurança para Crypto (evita erro de prototype em libs legacy)
if (typeof global.Crypto === 'undefined') {
  global.Crypto = function Crypto() {};
}
if (typeof global.SubtleCrypto === 'undefined') {
  global.SubtleCrypto = function SubtleCrypto() {};
}

// 2. Quick Crypto nativo (PBKDF2/AES) — deve rodar antes dos polyfills que tocam em crypto
try {
  const { install } = require('react-native-quick-crypto');
  install();
} catch {
  // Indisponível no Expo Go; fallback JS em crypto.ts
}

// 3. Carregar Polyfills (Buffer, URL, getRandomValues)
require('./src/app/config/polyfills/index');

// TanStack Router scroll helpers assume DOM; no-op on React Native/Hermes.
(() => {
  const noopScrollTo = function scrollTo() {};
  const g = typeof globalThis !== 'undefined' ? globalThis : global;
  try {
    Object.defineProperty(g, 'scrollTo', {
      value: noopScrollTo,
      writable: true,
      configurable: true,
    });
  } catch {
    g.scrollTo = noopScrollTo;
  }
  if (typeof global !== 'undefined' && global !== g) {
    global.scrollTo = noopScrollTo;
  }
})();


// 4. Registrar App (árvore montada em App.tsx para garantir mesmo React/contexto)
require('react-native-gesture-handler');
const { registerRootComponent } = require('expo');
const { App } = require('./src/app/App');

registerRootComponent(App);
