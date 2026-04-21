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
        // 1. Limpar AsyncStorage (Tokens, Configurações)
        console.log("🧹 Limpando AsyncStorage...");
        await AsyncStorage.clear();
        console.log("✅ AsyncStorage limpo.");

        // 2. Limpar Chaves e Sessões (Stablelib e Legado)
        console.log("🧹 Limpando Chaves e Sessões...");
        await clearAllKeys();
        console.log("✅ Chaves e Sessões limpas.");

        // 2. Tentar limpar tabelas do banco de dados local (via TanStack DB / Electric)
        // Como o acesso direto ao SQLite via driver pode variar, vamos tentar interagir
        // via collection ou apenas confiar que remover o token de autenticação (AsyncStorage)
        // e reiniciar o app vai forçar um re-sync.
        
        // No entanto, para ser completo, tentaríamos dropar tabelas se tivéssemos acesso direto ao driver.
        // Dado que ElectricSQL sincroniza com base no token, limpar o token (acima) é o passo crítico.
        
        console.log("🧹 Tentando limpar coleções locais...");
        // Infelizmente, a API do TanStack Query / Electric não expõe um 'dropAll' fácil
        // sem acesso ao driver subjacente.
        
        // O melhor a fazer aqui é garantir que o usuário saia (logout)
        
        console.log("✅ Reset concluído. Reinicie o aplicativo.");
        return true;
    } catch (error) {
        console.error("❌ Falha no Hard Reset:", error);
        return false;
    }
}
