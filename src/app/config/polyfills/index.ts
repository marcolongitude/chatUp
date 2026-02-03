/**
 * Polyfills mínimos para React Native (Electric SQL e utils que usam Buffer).
 * E2EE usa apenas @stablelib + expo-crypto (sem Buffer/process aqui).
 */
require("react-native-get-random-values");
require("react-native-url-polyfill/auto");

const { Buffer } = require("buffer");
(global as any).Buffer = Buffer;

const process = require("process");
(global as any).process = process;
if (!(global as any).process.nextTick) {
	(global as any).process.nextTick = (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0);
}
const util = require("util");
(global as any).util = util;

require("text-encoding");
if (typeof (global as any).TextEncoder === "undefined") {
	const TextEncoding = require("text-encoding");
	(global as any).TextEncoder = TextEncoding.TextEncoder;
	(global as any).TextDecoder = TextEncoding.TextDecoder;
}

if (typeof (global as any).Crypto === "undefined") {
	(global as any).Crypto = function Crypto() {};
}
if (typeof (global as any).SubtleCrypto === "undefined") {
	(global as any).SubtleCrypto = function SubtleCrypto() {};
}

try {
	const ExpoCrypto = require("expo-crypto");
	if (typeof (global as any).crypto === "undefined") {
		(global as any).crypto = {};
	}
	if (!(global as any).crypto.getRandomValues) {
		(global as any).crypto.getRandomValues = ExpoCrypto.getRandomValues;
	}
} catch {
	// expo-crypto opcional para getRandomValues
}

export default () => null;
