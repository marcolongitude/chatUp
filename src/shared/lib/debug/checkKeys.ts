import { getSignalStorage } from "@/shared/lib/crypto/signal/SignalStorage";
import { axiosInstance as api } from "@/shared/api";
import { getOrCreateKeyPair } from "../crypto/keyManagement";

export async function checkSignalKeysStatus(userId: string) {
    console.log(`🔍 [Debug] Checking keys for user: ${userId}`);
    const storage = getSignalStorage(userId);
    
    // 1. Check Local Identity
    const identity = await storage.getIdentityKeyPair();
    const regId = await storage.getLocalRegistrationId();
    
    console.log("📝 [Debug] Local Storage Status:");
    console.log(`   - Identity Key Present: ${!!identity}`);
    console.log(`   - Registration ID: ${regId ?? "MISSING"}`);
    
    // 2. Check Pre-Keys
    const signedId = await storage.getLastSignedPreKeyId();
    const preKeyId = await storage.getLastPreKeyId();
    console.log(`   - Last Signed PreKey ID: ${signedId}`);
    console.log(`   - Last PreKey ID: ${preKeyId}`);
    
    // 3. Check Server Status
    try {
        console.log("☁️ [Debug] Checking Server Status...");
        const countRes = await api.get('/keys/count/me');
        console.log(`   - Server PreKey Count: ${countRes.data.count ?? "Unknown"}`);
        
        const bundleRes = await api.get(`/keys/${userId}`);
        console.log(`   - Server Bundle Exists: ${!!bundleRes.data}`);
        console.log(`   - Server Bundle has Identity: ${!!bundleRes.data?.identityKey}`);
        console.log(`   - Server Bundle has SignedPreKey: ${!!bundleRes.data?.signedPreKey}`);
        
        if (bundleRes.data?.registrationId !== regId) {
             console.error(`❌ [Debug] MISMATCH: Server Registration ID (${bundleRes.data?.registrationId}) != Local (${regId})`);
             console.error("   This means the server has keys from a DIFFERENT installation/reset. You must rotate keys.");
        } else {
             console.log("✅ [Debug] Registration IDs match.");
        }
        
    } catch (e: any) {
        console.error("❌ [Debug] Failed to query server:", e.message);
    }

    // 4. Check Legacy E2EE Keys (Force Repair)
    try {
        console.log("🔐 [Debug] Checking Legacy E2EE Keys...");
        await getOrCreateKeyPair(userId);
        console.log("✅ [Debug] Legacy E2EE Keys Verified (and repaired if needed)");
    } catch (e: any) {
        console.error("❌ [Debug] Failed to verify Legacy Keys:", e.message);
    }

    // 5. Force Backfill User Profile Public Key (Sync keys -> users table)
    try {
        console.log("🔄 [Debug] Backfilling User Profile Public Key...");
        // Get key from storage to be sure
        const identity = await storage.getIdentityKeyPair();
        if (identity) {
             const pubKeyBase64 = require("@/shared/lib/crypto/utils").arrayBufferToBase64(identity.pubKey);
             await api.put(`/users/${userId}`, { publicKey: pubKeyBase64 });
             console.log("✅ [Debug] User Profile Public Key Backfilled (users table updated)");
        } else {
             console.warn("⚠️ [Debug] No local identity key found to backfill.");
        }
    } catch (e: any) {
        console.error("❌ [Debug] Failed to backfill profile key:", e.message);
    }
}
