import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Message } from "@/entities/message";

const KEY_PREFIX = "@chatup:messages:";

export async function listByContact(contactId: string): Promise<Message[]> {
	const raw = await AsyncStorage.getItem(`${KEY_PREFIX}${contactId}`);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as Message[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export async function saveByContact(contactId: string, messages: Message[]): Promise<void> {
	await AsyncStorage.setItem(`${KEY_PREFIX}${contactId}`, JSON.stringify(messages));
}
