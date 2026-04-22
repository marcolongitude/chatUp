import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStableStorage } from "@/shared/lib/crypto/stable/StableLibStorage";
import { clearAllKeys } from "@/shared/lib/crypto";

/**
 * Utilitário DLX (Dangerous Data Deletion)
 * 
 * Limpa TODOS os dados locais da aplicação para resetar o estado.
 * Use com cuidado extremo.
 */
export async function hardResetApplication() {
    console.log("🧨 INICIANDO HARD RESET DA APLICAÇÃO 🧨");

    try {
        const rawUser = await AsyncStorage.getItem("auth.user");
        let parsedUser: { id?: string } | null = null;
        if (rawUser) {
            try {
                parsedUser = JSON.parse(rawUser) as { id?: string };
            } catch {
                parsedUser = null;
            }
        }
        const userId = parsedUser?.id ?? null;

        // 1. Limpar AsyncStorage (Tokens, Configurações)
        console.log("🧹 Limpando AsyncStorage...");
        await AsyncStorage.clear();
        console.log("✅ AsyncStorage limpo.");

        // 2. Limpar Chaves e Sessões (Stablelib e Legado)
        console.log("🧹 Limpando Chaves e Sessões...");
        await clearAllKeys();
        console.log("✅ Chaves e Sessões limpas.");

        // 3. Limpar storage local de sessões Stable (SQLite)
        // Usa userId quando disponível para remover identidade/sessões criptográficas locais.
        console.log("🧹 Limpando sessões locais Stable...");
        if (userId) {
            await getStableStorage(userId).clearAll();
            console.log("✅ Sessões locais Stable limpas.");
        } else {
            console.log("ℹ️ userId não encontrado, limpeza de sessões Stable ignorada.");
        }
        
        console.log("✅ Reset concluído. Reinicie o aplicativo.");
        return true;
    } catch (error) {
        console.error("❌ Falha no Hard Reset:", error);
        return false;
    }
}
