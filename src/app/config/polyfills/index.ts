/**
 * Polyfills for common Node.js globals
 * Required for libraries like Electric SQL and Signal Protocol to work in React Native
 * 
 * IMPORTANTE: Este arquivo DEVE ser executado ANTES de qualquer código que use crypto.subtle
 */

// Log imediato para verificar se arquivo está sendo executado
console.log('🔍 [Polyfills] ARQUIVO POLYFILLS CARREGADO - Iniciando configuração...');

import React from 'react';

// Basic crypto placeholder (will be fully polyfilled in app/_layout.tsx with expo-crypto)
// We use react-native-quick-crypto for full WebCrypto support (SubtleCrypto) required by libsignal
console.log('🔍 [Polyfills] Iniciando configuração de crypto...');

// Função para configurar crypto.subtle de forma robusta
// IMPORTANTE: Esta função deve ser chamada de forma segura para não quebrar o app
function setupCryptoSubtle() {
  try {
    console.log('🔍 [Polyfills] Tentando carregar react-native-quick-crypto...');
    
    // Carregar o módulo de forma segura usando require dentro da função
    // Isso evita crash se o módulo nativo não estiver disponível
    let QuickCrypto;
    try {
      // Usar require dinâmico para evitar crash no top-level
      // Se o módulo nativo não estiver disponível, o require lançará um erro
      // que será capturado pelo try-catch
      QuickCrypto = require('react-native-quick-crypto');
    } catch (requireError: any) {
      // Erro ao carregar módulo nativo
      const errorMsg = requireError?.message || String(requireError);
      
      // Verificar se é erro de NitroModules
      if (errorMsg.includes('NitroModules') || errorMsg.includes('TurboModule') || errorMsg.includes('Turbo/Native-Module')) {
        console.error('❌ [Polyfills] NitroModules não está disponível!');
        console.error('❌ [Polyfills] O app precisa ser reconstruído após habilitar TurboModules.');
        console.error('❌ [Polyfills] Execute: cd android && ./gradlew clean && cd .. && npm run android');
      } else {
        console.warn('⚠️ [Polyfills] Falha ao carregar react-native-quick-crypto:', errorMsg);
        if (requireError?.stack) {
          console.warn('⚠️ [Polyfills] Stack:', requireError.stack.substring(0, 300));
        }
      }
      return false;
    }
    
    // Verificar se QuickCrypto foi carregado
    if (!QuickCrypto) {
      console.error('❌ [Polyfills] QuickCrypto é null ou undefined após require!');
      return false;
    }
    
    console.log('🔍 [Polyfills] QuickCrypto carregado:', {
      hasSubtle: !!QuickCrypto.subtle,
      hasGetRandomValues: !!QuickCrypto.getRandomValues,
      keys: Object.keys(QuickCrypto).slice(0, 10)
    });
    
    // Verificar se QuickCrypto tem subtle
    if (!QuickCrypto.subtle) {
      console.error('❌ [Polyfills] QuickCrypto.subtle é undefined!');
      console.error('❌ [Polyfills] QuickCrypto keys:', Object.keys(QuickCrypto));
      console.error('❌ [Polyfills] Isso geralmente significa que TurboModules não está funcionando.');
      console.error('❌ [Polyfills] Verifique se newArchEnabled=true está em android/gradle.properties');
      console.error('❌ [Polyfills] E se o app foi reconstruído após habilitar a nova arquitetura.');
      return false;
    }
    
    // Preservar crypto existente se houver
    const existingCrypto = (global as any).crypto;
    console.log('🔍 [Polyfills] Crypto existente:', existingCrypto ? Object.keys(existingCrypto).slice(0, 5) : 'none');
    
    // IMPORTANTE: Atribuir QuickCrypto diretamente ao global.crypto
    // Isso garante que todas as propriedades, incluindo subtle, sejam preservadas
    (global as any).crypto = QuickCrypto;
    
    // Verificação adicional: garantir que subtle está presente
    if (!(global as any).crypto.subtle) {
      console.error('❌ [Polyfills] crypto.subtle ainda está undefined após atribuição!');
      // Tentar atribuir explicitamente
      (global as any).crypto.subtle = QuickCrypto.subtle;
    }
    
    // Garantir getRandomValues
    if (!(global as any).crypto.getRandomValues) {
      (global as any).crypto.getRandomValues = QuickCrypto.getRandomValues;
    }
    
    // Preservar outras propriedades do crypto existente (se houver)
    if (existingCrypto && typeof existingCrypto === 'object') {
      Object.keys(existingCrypto).forEach(key => {
        if (key !== 'subtle' && key !== 'getRandomValues' && !(global as any).crypto[key]) {
          (global as any).crypto[key] = existingCrypto[key];
        }
      });
    }
    
    // Verificar se SubtleCrypto está disponível
    if ((global as any).crypto.subtle) {
      console.log('✅ [Polyfills] react-native-quick-crypto polyfilled with SubtleCrypto support');
      // Verificar se importKey está disponível
      if ((global as any).crypto.subtle.importKey) {
        console.log('✅ [Polyfills] crypto.subtle.importKey está disponível');
      } else {
        console.error('❌ [Polyfills] crypto.subtle.importKey não está disponível!');
        console.error('❌ [Polyfills] crypto.subtle keys:', Object.keys((global as any).crypto.subtle || {}));
      }
    } else {
      console.error('❌ [Polyfills] crypto.subtle não está disponível após configuração!');
      throw new Error('crypto.subtle is undefined after QuickCrypto setup');
    }
    
    // Verificação final: garantir que está acessível globalmente
    // IMPORTANTE: libsignal-protocol-typescript usa globalThis.crypto
    if (typeof global !== 'undefined') {
      (global as any).crypto = (global as any).crypto;
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).crypto = (global as any).crypto;
    }
    
    // Verificação final: garantir que crypto.subtle está disponível em globalThis
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto) {
      if (!(globalThis as any).crypto.subtle) {
        console.warn('⚠️ [Polyfills] globalThis.crypto.subtle não está presente, atribuindo...');
        (globalThis as any).crypto.subtle = (global as any).crypto.subtle;
      }
      // Verificar novamente
      if ((globalThis as any).crypto.subtle && (globalThis as any).crypto.subtle.importKey) {
        console.log('✅ [Polyfills] globalThis.crypto.subtle.importKey está disponível');
      } else {
        console.error('❌ [Polyfills] globalThis.crypto.subtle.importKey NÃO está disponível!');
      }
    }
    
    return true;
  } catch (e: any) {
    console.error('❌ [Polyfills] Erro ao configurar react-native-quick-crypto:', e?.message || e);
    console.error('❌ [Polyfills] Stack:', e?.stack);
    console.error('❌ [Polyfills] Signal Protocol não funcionará sem crypto.subtle!');
    console.error('❌ [Polyfills] SOLUÇÃO: Reconstrua o app Android com TurboModules habilitado:');
    console.error('❌ [Polyfills]   1. cd android && ./gradlew clean');
    console.error('❌ [Polyfills]   2. cd android && ./gradlew assembleDebug');
    console.error('❌ [Polyfills]   3. npm run android');
    return false;
  }
}

// Executar configuração de forma segura
// IMPORTANTE: Se o módulo nativo não estiver disponível, não deve quebrar o app
let cryptoSetupSuccess = false;
try {
  cryptoSetupSuccess = setupCryptoSubtle();
} catch (e: any) {
  // Capturar qualquer erro não tratado para evitar crash do app
  console.error('❌ [Polyfills] Erro crítico ao configurar crypto:', e?.message || e);
  console.error('❌ [Polyfills] O app continuará, mas Signal Protocol não funcionará.');
  cryptoSetupSuccess = false;
}

// Se falhou, inicializar crypto básico para evitar erros de "crypto is undefined"
if (!cryptoSetupSuccess) {
  if (typeof (global as any).crypto === 'undefined') {
    (global as any).crypto = {} as any;
  }
  // Adicionar getRandomValues básico se não existir (usando expo-crypto)
  if (!(global as any).crypto.getRandomValues) {
    try {
      const ExpoCrypto = require('expo-crypto');
      (global as any).crypto.getRandomValues = (array: any) => {
        // Fallback básico usando expo-crypto
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
    } catch (e) {
      // Se até expo-crypto falhar, usar Math.random como último recurso
      (global as any).crypto.getRandomValues = (array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
    }
  }
}

// Global self and window for library compatibility
if (typeof (global as any).self === 'undefined') {
  (global as any).self = global;
}
if (typeof (global as any).window === 'undefined') {
  (global as any).window = global;
}

import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import EventEmitter from 'events';
import process from 'process';
import util from 'util';
import 'text-encoding';

// Global Buffer
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Global process
if (typeof global.process === 'undefined') {
  global.process = process;
} else {
  // Merge process if it exists but is incomplete
  const actualProcess = require('process');
  Object.assign(global.process, actualProcess);
}

// Add nextTick if missing (required by many Node libs)
if (typeof global.process.nextTick === 'undefined') {
  (global.process as any).nextTick = (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0);
}

// Global EventEmitter (some libraries expect this)
if (typeof (global as any).EventEmitter === 'undefined') {
  (global as any).EventEmitter = EventEmitter;
}

// Global TextEncoder and TextDecoder
// Note: We use the text-encoding package but wrap TextDecoder to support utf-16le (required by libsignal)
const TextEncoding = require('text-encoding');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoding.TextEncoder;
}

const OriginalTextDecoder = TextEncoding.TextDecoder;

class Utf16CapableTextDecoder {
  private _decoder: any = null;
  private _encoding: string;
  
  public readonly fatal: boolean = false;
  public readonly ignoreBOM: boolean = false;

  constructor(label = "utf-8", options: any = {}) {
    const normalized = label.toLowerCase().replace(/[^a-z0-9]/g, "");
    this._encoding = label.toLowerCase(); // Keep original-ish for property
    
    this.fatal = !!options.fatal;
    this.ignoreBOM = !!options.ignoreBOM;

    if (normalized !== "utf16le" && normalized !== "utf16be" && normalized !== "ucs2") {
      this._decoder = new OriginalTextDecoder(label, options);
    }
  }

  get encoding() {
    return this._encoding;
  }

  decode(input: any, options = {}) {
    // If input is null/undefined, return empty string (standard behavior)
    if (!input) return "";

    const normalized = this._encoding.replace(/[^a-z0-9]/g, "");
    
    if (normalized === "utf16le" || normalized === "utf16be" || normalized === "ucs2") {
      // Logic for UTF-16 via Buffer
      const buffer = Buffer.from(
        input.buffer || input,
        input.byteOffset || 0,
        input.byteLength || input.length || 0
      );
      const enc = (normalized === "ucs2") ? "ucs2" : "utf16le";
      return buffer.toString(enc as any);
    }
    
    if (this._decoder) {
      return this._decoder.decode(input, options);
    }
    
    return Buffer.from(input).toString('utf8');
  }
}

global.TextDecoder = Utf16CapableTextDecoder as any;
(globalThis as any).TextDecoder = global.TextDecoder;

// Patch util.inherits immediately as well
const originalInherits = util.inherits;
(util as any).inherits = function(ctor: any, superCtor: any) {
  if (superCtor === undefined || superCtor === null) {
    console.warn(`[Polyfill] util.inherits: superCtor is ${superCtor} for ${ctor?.name || 'anonymous'}. Falling back to Object.`);
    return originalInherits(ctor, Object);
  }
  return originalInherits(ctor, superCtor);
};


console.log('✅ Node.js polyfills initialized');

// Default export para evitar que Expo Router trate este arquivo como rota
// Este arquivo não deve ser usado como rota, apenas como polyfill
// Retorna um componente vazio caso Expo Router tente renderizá-lo
const PolyfillsRoute = () => {
	return null;
};

export default PolyfillsRoute;

// Exportar função para recarregar crypto se necessário (útil após rebuild)
export function reloadCrypto() {
  if (typeof (global as any).crypto !== 'undefined') {
    delete (global as any).crypto;
  }
  if (typeof (globalThis as any).crypto !== 'undefined') {
    delete (globalThis as any).crypto;
  }
  return setupCryptoSubtle();
}
