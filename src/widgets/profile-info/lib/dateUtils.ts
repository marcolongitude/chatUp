/**
 * Converte diferentes formatos de timestamp para Date
 */
export function timestampToDate(timestamp: any): Date | null {
	if (!timestamp) return null;
	if (timestamp instanceof Date) return timestamp;
	if (timestamp && typeof timestamp.toDate === "function") return timestamp.toDate();
	if (timestamp && typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000);
	if (typeof timestamp === "string") return new Date(timestamp);
	return null;
}

/**
 * Formata data de acordo com o locale
 */
export function formatDate(date: Date | null, locale: string): string {
	if (!date) return "";
	return date.toLocaleDateString(locale === "pt-BR" ? "pt-BR" : locale === "es" ? "es-ES" : "en-US", {
		day: "2-digit", 
        month: "long", 
        year: "numeric", 
        hour: "2-digit", 
        minute: "2-digit",
	});
}
