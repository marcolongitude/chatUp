/**
 * Formata um nome completo para um nome curto (nome + inicial do sobrenome ou apenas primeiro nome)
 */
export function formatShortName(fullName: string): string {
	if (!fullName) return "";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length <= 1) return fullName;

	const firstName = parts[0];
	const lastPart = parts[parts.length - 1];
	
    if (lastPart) {
        return `${firstName} ${lastPart[0]}.`;
    }
    return firstName;
}

/**
 * Filtro debounced para buscas
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null;
	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}
