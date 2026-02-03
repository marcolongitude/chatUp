// 1. Trava de segurança para Crypto (evita erro de prototype em libs legacy)
if (typeof global.Crypto === 'undefined') {
  global.Crypto = function Crypto() {};
}
if (typeof global.SubtleCrypto === 'undefined') {
  global.SubtleCrypto = function SubtleCrypto() {};
}

// 2. Carregar Polyfills (Buffer, URL, getRandomValues)
require('./src/app/config/polyfills/index');

// 3. Registrar App (árvore montada em App.tsx para garantir mesmo React/contexto)
require('react-native-gesture-handler');
const { registerRootComponent } = require('expo');
const { App } = require('./src/app/App');

registerRootComponent(App);
