export * from './schema';
export * from './collections';

/**
 * Funções de limpeza para compatibilidade legada (SQLite Local)
 */
export async function clearAllMessages() {
    const { messagesCollection } = await import('./collections/messagesCollection');
    // Electric doesn't have a simple 'clear all' like SQLite, 
    // but we can try to wipe relevant data or just log for now
    console.log("[Database] Requesting clear all messages (not fully implemented for Electric)");
}

export async function clearChatMessages(chatId: string) {
    console.log(`[Database] Requesting clear chat ${chatId} (not fully implemented for Electric)`);
}
