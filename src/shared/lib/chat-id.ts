/**
 * Generates a deterministic chat ID from two participant IDs.
 */
export function generateChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
