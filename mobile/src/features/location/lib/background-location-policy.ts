/** Intervalo nativo entre fixes. 0 m de distância no Android: parado também atualiza. */
export const BG_LOCATION_TIME_INTERVAL_MS = 60_000;

/**
 * PUT periódico com o app em segundo plano.
 * O presence.ping do JS congela; sem isto location_updated_at estoura
 * LOCATION_STALE e o contato some da lista dos outros.
 */
export const BG_PUT_MIN_INTERVAL_MS = 90_000;

/** Movimento que justifica PUT antes do intervalo (saída/entrada de perímetro). */
export const BG_PUT_MIN_MOVE_M = 25;

/** Folga mínima entre PUTs por movimento, para não enxurrar andando. */
export const BG_PUT_MOVE_MIN_GAP_MS = 15_000;

export function shouldPushBackgroundLocation(params: {
	now: number;
	lastPushAt: number;
	movedMeters: number;
}): boolean {
	if (params.lastPushAt <= 0) return true;
	const elapsed = params.now - params.lastPushAt;
	if (elapsed >= BG_PUT_MIN_INTERVAL_MS) return true;
	if (params.movedMeters >= BG_PUT_MIN_MOVE_M && elapsed >= BG_PUT_MOVE_MIN_GAP_MS) return true;
	return false;
}
