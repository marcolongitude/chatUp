export { StableLibSessionManager as StableCrypto } from './sessionManager';

// Exportações para compatibilidade de interface com o código que usava Signal
import { StableLibSessionManager } from './sessionManager';

export const bootstrapStableAccount = (userId: string) => StableLibSessionManager.bootstrap(userId);
export const ensureStableSession = (userId: string, contactId: string) => StableLibSessionManager.ensureSession(userId, contactId);
export const encryptWithStable = (userId: string, contactId: string, text: string) => StableLibSessionManager.encrypt(userId, contactId, text);
export const decryptWithStable = (userId: string, contactId: string, data: string) => StableLibSessionManager.decrypt(userId, contactId, data);
