import { getStableStorage } from "@/shared/lib/crypto/stable/StableLibStorage";
import { axiosInstance as api } from "@/shared/api";
import { getOrCreateKeyPair } from "../crypto/keyManagement";

/**
 * Utilitário de debug para verificar o status das chaves Stablelib e servidor
 */
export async function checkStableKeysStatus(userId: string) {
    console.log(`🔍 [Debug] Checking Stablelib keys for user: ${userId}`);
    const storage = getStableStorage(userId);
    
    // 1. Check Local Identity
    const identity = await storage.getIdentity();
    const pubKeyBase64 = identity ? Buffer.from(identity.publicKey).toString('base64') : null;
    
    console.log("📝 [Debug] Stablelib Storage Status:");
    console.log(`   - Identity Key Present: ${!!identity}`);
    if (pubKeyBase64) {
        console.log(`   - Public Key (Preview): ${pubKeyBase64.substring(0, 20)}...`);
    }
    
    // 2. Check Server Status
    try {
        console.log("☁️ [Debug] Checking Server Status...");
        // Mantendo compatibilidade com endpoints atuais que esperam Signal
        const bundleRes = await api.get(`/keys/${userId}`);
        console.log(`   - Server Bundle Exists: ${!!bundleRes.data}`);
        console.log(`   - Server Bundle has Identity: ${!!bundleRes.data?.identityKey}`);
        
        if (pubKeyBase64 && bundleRes.data?.identityKey) {
            const match = bundleRes.data.identityKey === pubKeyBase64;
            console.log(match ? "✅ [Debug] Server and Local keys match." : "❌ [Debug] MISMATCH: Server key differs from local key!");
        }
        
    } catch (e: any) {
        console.error("❌ [Debug] Failed to query server:", e.message);
    }

    // 3. Check Legacy E2EE Keys
    try {
        console.log("🔐 [Debug] Checking Legacy E2EE Keys...");
        await getOrCreateKeyPair(userId);
        console.log("✅ [Debug] Legacy E2EE Keys Verified");
    } catch (e: any) {
        console.error("❌ [Debug] Failed to verify Legacy Keys:", e.message);
    }

    // 4. Force Backfill User Profile Public Key
    try {
        console.log("🔄 [Debug] Backfilling User Profile Public Key...");
        if (pubKeyBase64) {
             await api.put(`/users/${userId}`, { publicKey: pubKeyBase64 });
             console.log("✅ [Debug] User Profile Public Key Backfilled");
        }
    } catch (e: any) {
        console.error("❌ [Debug] Failed to backfill profile key:", e.message);
    }
}
