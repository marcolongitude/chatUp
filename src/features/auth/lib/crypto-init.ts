import { bootstrapStableAccount, getOrCreateKeyPair } from "@/shared/lib/crypto";

export async function initializeCrypto(userId: string): Promise<void> {
  try {
    await getOrCreateKeyPair(userId);
    await bootstrapStableAccount(userId);
  } catch (error) {
    console.warn("[Auth] Crypto initialization failed", error);
  }
}
