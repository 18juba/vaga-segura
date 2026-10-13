/**
 * Vaga Segura — motor de detecção e pontuação de sinais de aliciamento em ofertas de emprego.
 *
 * Segue o método da planilha Vaga_Certa_Sinais_e_Pontuacao.xlsx:
 *  1. Detecção  — cada um dos 21 sinais é procurado no texto e, quando achado, vem com o trecho.
 *  2. Pontuação — soma dos pesos dos sinais presentes (fixa e transparente).
 *  3. Elevação  — sinal crítico, ou viagem paga (S05) + exposição pessoal (S09–S13) ⇒ Alto.
 *  4. Faixas    — Baixo < 4 ≤ Atenção < 8 ≤ Alto (configurável em config.ts).
 *  5. Resposta  — nível, nota 10–90, sinais com trechos e ação recomendada.
 *
 * Roda inteiro no navegador, sem rede: o texto da usuária não sai do aparelho.
 */
import { DEFAULT_OPTIONS, type EngineOptions } from './config';
import { DETECTOR_ORDER, DETECTORS, type DetectorContext } from './detectors';
import { extractFacts } from './extract';
import { classify, aggregate, summaryFor } from './score';
import { buildView } from './text';
import type { Analysis } from './types';

export function analyzeVacancy(text: string, options: Partial<EngineOptions> = {}): Analysis {
	const opts: EngineOptions = { ...DEFAULT_OPTIONS, ...options };
	const view = buildView(text);
	const facts = extractFacts(view, opts.currentYear);
	const ctx: DetectorContext = { view, kw: view.keyword, facts, hits: [] };
	for (const id of DETECTOR_ORDER) DETECTORS[id](ctx);

	const results = aggregate(text, ctx.hits, opts);
	const signals = results.filter((r) => r.status === 'presente');
	const review = results.filter((r) => r.status === 'conferir');
	const c = classify(results, opts);

	return {
		score: c.score,
		level: c.level,
		rawPoints: c.rawPoints,
		signals,
		review,
		criticalCount: c.criticalCount,
		escalations: c.escalations,
		action: c.action,
		summary: summaryFor(c.level, c.rawPoints, review.length),
		role: facts.roles[0]?.label ?? 'essa área profissional',
		facts
	};
}

export { BANDS, SIGNALS, SIGNAL_BY_ID, DEFAULT_OPTIONS, type EngineOptions } from './config';
export { validateCnpj } from './extract';
export type * from './types';
