/**
 * API de logout - atualmente apenas limpa estado local.
 * Pode ser expandido para invalidar token no backend.
 */
export async function logoutApi(): Promise<void> {
	// Futuro: POST /auth/logout para invalidar refresh token no servidor
}
