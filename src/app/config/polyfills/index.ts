/**
 * Polyfills for common Node.js globals
 * Required for libraries like Electric SQL and Signal Protocol to work in React Native
 */

import React from 'react';

// Basic crypto placeholder (will be fully polyfilled in app/_layout.tsx with expo-crypto)
// We use react-native-quick-crypto for full WebCrypto support (SubtleCrypto) required by libsignal
try {
  const QuickCrypto = require('react-native-quick-crypto');
  global.crypto = QuickCrypto;
  (global as any).crypto.getRandomValues = QuickCrypto.getRandomValues;
  
  // Verify if SubtleCrypto is available
  if (global.crypto.subtle) {
    console.log('✅ react-native-quick-crypto polyfilled with SubtleCrypto support');
  } else {
    console.warn('⚠️ react-native-quick-crypto loaded but SubtleCrypto is missing!');
  }
} catch (e) {
  console.log('⚠️ react-native-quick-crypto not found, using basic fallback. Install it for Signal support.');
  console.log('Error:', e);
  if (typeof (global as any).crypto === 'undefined') {
    (global as any).crypto = {} as any;
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
