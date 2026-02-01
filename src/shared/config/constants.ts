export const CRYPTO = {
  // Algoritmos e tamanhos de chave
  PBKDF2_ITERATIONS: __DEV__ ? 5000 : 50000,
  PBKDF2_ITERATIONS_STORAGE: __DEV__ ? 10000 : 50000,
  SALT_LENGTH: 32, // 256 bits
  IV_LENGTH: 16, // 128 bits para CBC
  KEY_LENGTH: 32, // 256 bits para AES-256
  TAG_LENGTH: 16, // 128 bits para tag GCM
  HMAC_KEY_LENGTH: 32, // 256 bits para HMAC
  
  // Políticas de segurança
  MAX_MESSAGE_AGE_MS: 24 * 60 * 60 * 1000, // 24 horas
  MAX_FUTURE_OFFSET_MS: 5 * 60 * 1000, // 5 minutos (tolerância de relógio)
  
  // Cache Logic
  CACHE_TTL_MS: 30 * 60 * 1000,
  MAX_CACHE_SIZE: 50,
  MASTER_KEY_CACHE_TTL_MS: 60 * 60 * 1000,
  
  // Storage Keys & Prefixes
  STORAGE_KEY_MASTER_SALT_PREFIX: "master_salt_",
  STORAGE_KEY_ENCRYPTED_PREFIX: "encrypted_chat_key_",
  ENCRYPTED_PREFIX: "ENC:",
  SIGNAL_ENVELOPE_VERSION: 5
};
