import { SCORE_RANGES, SIGNAL_BY_ID, type EngineOptions } from './config';
import { makeQuotes } from './text';
import type { Analysis, Escalation, Hit, Level, SignalId, SignalResult } from './types';

/**
 * Junta os trechos de cada sinal. Trechos sobrepostos contam uma vez (vale o mais forte);
 * trechos independentes reforçam um ao outro (OU probabilístico: 1 − Π(1 − c)).
 */
export function aggregate(original: string, hits: Hit[], opts: EngineOptions): SignalResult[] {
	const byId = new Map<SignalId, Hit[]>();
	for (const h of hits) byId.set(h.id, [...(byId.get(h.id) ?? []), h]);
	const results: SignalResult[] = [];
	for (const [id, list] of byId) {
		const sorted = [...list].sort((a, b) => b.confidence - a.confidence);
		const kept: Hit[] = [];
		for (const h of sorted) {
			const overlaps =
				h.start >= 0 && kept.some((k) => k.start >= 0 && h.start < k.end && k.start < h.end);
			const duplicateAbsence = h.start < 0 && kept.some((k) => k.start < 0 && k.note === h.note);
			if (!overlaps && !duplicateAbsence) kept.push(h);
		}
		const confidence = Math.min(0.99, 1 - kept.reduce((p, h) => p * (1 - h.confidence), 1));
		if (confidence < opts.reviewThreshold) continue;
		const signal = SIGNAL_BY_ID[id];
		const status = confidence >= opts.presentThreshold ? 'presente' : 'conferir';
		const evidence = makeQuotes(
			original,
			kept.filter((h) => h.start >= 0)
		);
		const notes = [...new Set(kept.map((h) => h.note).filter((n): n is string => Boolean(n)))];
		results.push({
			signal,
			status,
			confidence: Math.round(confidence * 100) / 100,
			points: status === 'presente' ? signal.weight : 0,
			evidence,
			notes
		});
	}
	return results.sort(
		(a, b) =>
			Number(b.signal.critical) - Number(a.signal.critical) ||
			b.points - a.points ||
			b.confidence - a.confidence ||
			a.signal.id.localeCompare(b.signal.id)
	);
}

/** Aba "Método", passos 2 a 4. */
export function classify(results: SignalResult[], opts: EngineOptions) {
	const present = results.filter((r) => r.status === 'presente');
	const rawPoints = present.reduce((s, r) => s + r.points, 0);
	const critical = present.filter((r) => r.signal.critical);
	const exposure = present.filter((r) => r.signal.category === 'Exposição pessoal');
	const travel = present.find((r) => r.signal.id === 'S05');

	const escalations: Escalation[] = [];
	if (critical.length)
		escalations.push({
			rule: 'sinal-critico',
			label:
				critical.length === 1
					? 'Há um sinal crítico, que sozinho já classifica a vaga como risco alto.'
					: `Há ${critical.length} sinais críticos; cada um sozinho já classifica a vaga como risco alto.`,
			signals: critical.map((r) => r.signal.id)
		});
	if (travel && exposure.length)
		escalations.push({
			rule: 'viagem-e-exposicao',
			label: 'Viagem paga junto com pedido de exposição pessoal: o padrão clássico de aliciamento.',
			signals: ['S05', ...exposure.map((r) => r.signal.id)]
		});

	const bands = [...opts.bands].sort((a, b) => a.min - b.min);
	const band = [...bands].reverse().find((b) => rawPoints >= b.min) ?? bands[0];
	const level: Level = escalations.length ? 'alto' : band.level;
	const action = bands.find((b) => b.level === level)!.action;

	return {
		rawPoints,
		level,
		action,
		escalations,
		criticalCount: critical.length,
		score: toScore(
			rawPoints,
			level,
			critical.length,
			escalations.some((e) => e.rule === 'viagem-e-exposicao'),
			opts
		)
	};
}

/**
 * Converte a soma de pesos em nota 10–90 sem nunca contradizer o nível:
 *   Baixo   → 10–36   (proporcional à soma dentro da faixa)
 *   Atenção → 37–63
 *   Alto    → 64–90   (curva que satura: cada sinal a mais pesa um pouco menos)
 */
export function toScore(
	raw: number,
	level: Level,
	critical: number,
	combo: boolean,
	opts: EngineOptions
): number {
	const bands = [...opts.bands].sort((a, b) => a.min - b.min);
	const attention = bands.find((b) => b.level === 'atencao')!.min;
	const high = bands.find((b) => b.level === 'alto')!.min;
	const [lo, hi] = SCORE_RANGES[level];
	const span = hi - lo;
	let pos: number;
	if (level === 'baixo') pos = Math.min(raw / attention, 0.99);
	else if (level === 'atencao') pos = Math.min((raw - attention) / (high - attention), 0.99);
	else {
		const intensity =
			Math.max(0, raw - high) + critical * opts.criticalBoost + (combo ? opts.comboBoost : 0);
		pos = 1 - Math.exp(-intensity / 12);
	}
	return Math.round(lo + span * Math.max(0, pos));
}

export function summaryFor(level: Level, rawPoints: number, reviewCount: number): string {
	if (level === 'alto')
		return 'Encontramos sinais fortes de aliciamento ou golpe. Pause a conversa e procure orientação antes de responder.';
	if (level === 'atencao')
		return 'Há sinais de alerta que precisam ser confirmados. Não envie documentos, fotos nem dinheiro antes de checar.';
	// o Método proíbe dizer que a vaga é "segura"
	if (rawPoints === 0 && reviewCount === 0)
		return 'Não encontramos sinais relevantes neste texto. Ainda assim, confira os dados da empresa antes de seguir.';
	return 'Encontramos poucos sinais, abaixo do nível de alerta. Confira os pontos abaixo antes de seguir.';
}

export type Classified = ReturnType<typeof classify>;
export type { Analysis };
