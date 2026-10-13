import type { Evidence } from './types';

/**
 * Visão normalizada de um texto, com mapa de cada caractere para a posição no original.
 * Assim os detectores trabalham em texto "limpo" e o resultado ainda aponta o trecho exato
 * do anúncio que a usuária colou.
 */
export interface TextView {
	original: string;
	/** Minúsculas, sem acento, NFKD (desfaz letras "estilizadas" 𝐟𝐨𝐭𝐨, ｆｕｌｌｗｉｄｔｈ, etc.). */
	plain: string;
	/** `plain` + desofuscação: l3et (b1qu1n1 → biquini) e letras espaçadas (f o t o → foto). */
	keyword: string;
	/** keyword[i] veio de original[mapKeyword[i]]. */
	mapKeyword: number[];
	mapPlain: number[];
}

// hífen suave, zero-width space/joiner/non-joiner, marcas de direção, word joiner, BOM
const ZERO_WIDTH = new RegExp('[\\u00AD\\u200B-\\u200F\\u2060\\uFEFF]');
const LEET: Record<string, string> = {
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'7': 't',
	'@': 'a'
};

export function buildView(original: string): TextView {
	const chars: string[] = [];
	const map: number[] = [];
	let i = 0;
	for (const ch of original) {
		const at = i;
		i += ch.length;
		if (ZERO_WIDTH.test(ch)) continue;
		if (ch === '\n' || ch === '\r') {
			if (chars.at(-1) === ' ') {
				chars[chars.length - 1] = '\n';
			} else if (chars.at(-1) !== '\n') {
				chars.push('\n');
				map.push(at);
			}
			continue;
		}
		if (/\s/.test(ch)) {
			if (chars.length && chars.at(-1) !== ' ' && chars.at(-1) !== '\n') {
				chars.push(' ');
				map.push(at);
			}
			continue;
		}
		const norm = ch
			.normalize('NFKD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			// aspas e travessões tipográficos
			.replace(/[‘’‛′]/g, "'")
			.replace(/[“”„″]/g, '"')
			.replace(/[‐-―−]/g, '-');
		for (const c of norm) {
			chars.push(c);
			map.push(at);
		}
	}
	const plain = chars.join('');

	// Desofuscação de tokens que misturam letras e dígitos (b1qu1n1, p1x, wh4ts).
	const kw = [...chars];
	for (const m of plain.matchAll(/[a-z][a-z0-9@]*[0-9@][a-z0-9@]*/g)) {
		const tok = m[0];
		const letters = tok.replace(/[^a-z]/g, '').length;
		if (letters < 2) continue;
		if (
			tok.includes('@') &&
			/^\.[a-z]/.test(plain.slice(m.index + tok.length, m.index + tok.length + 2))
		)
			continue; // e-mail
		if (/^[a-z]{1,3}\d+$/.test(tok)) continue; // códigos como "s05", "mp3", "rj2"
		for (let k = 0; k < tok.length; k++) {
			const r = LEET[tok[k]];
			if (r) kw[m.index + k] = r;
		}
	}

	// Letras espaçadas: "f o t o s", "p.i.x", "w-h-a-t-s"
	const kwStr = kw.join('');
	const drop = new Set<number>();
	for (const m of kwStr.matchAll(/\b[a-z](?:[ .\-_*][a-z]){2,}\b/g)) {
		for (let k = 1; k < m[0].length; k += 2) drop.add(m.index + k);
	}
	const keywordChars: string[] = [];
	const mapKeyword: number[] = [];
	for (let k = 0; k < kw.length; k++) {
		if (drop.has(k)) continue;
		keywordChars.push(kw[k]);
		mapKeyword.push(map[k]);
	}

	return { original, plain, keyword: keywordChars.join(''), mapKeyword, mapPlain: map };
}

/** Converte um intervalo [start,end) de uma visão para posições no texto original. */
export function toOriginal(map: number[], original: string, start: number, end: number) {
	const s = map[Math.min(start, map.length - 1)] ?? 0;
	const lastIdx = Math.min(end, map.length) - 1;
	const lastOrig = map[lastIdx] ?? s;
	// avança até o fim do caractere original (pares substitutos, letras compostas)
	const cp = original.codePointAt(lastOrig) ?? 0;
	const e = lastOrig + (cp > 0xffff ? 2 : 1);
	return { start: s, end: Math.max(e, s + 1) };
}

const SENTENCE_END = /[.!?;\n]/;

function isSentenceBreak(text: string, i: number) {
	const c = text[i];
	if (!SENTENCE_END.test(c)) return false;
	// não quebra em "15.000", "R$ 1.500,00", "e-mail.com"
	if (c === '.' && /\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) return false;
	if (c === '.' && /\S/.test(text[i + 1] ?? ' ') && /\S/.test(text[i - 1] ?? ' ')) return false;
	return true;
}

function sentenceWindow(original: string, start: number, end: number, maxLen: number) {
	let s = start;
	while (s > 0 && !isSentenceBreak(original, s - 1) && start - s < maxLen / 2) s--;
	let e = end;
	while (e < original.length && !isSentenceBreak(original, e) && e - end < maxLen / 2) e++;
	if (e < original.length && /[.!?]/.test(original[e])) e++;
	return { s, e };
}

/**
 * Recorta as frases que contêm os trechos (até ~maxLen caracteres cada) e destaca os
 * trechos. Trechos que caem na mesma frase são agrupados numa só citação.
 */
export function makeQuotes(
	original: string,
	spans: { start: number; end: number }[],
	maxQuotes = 3,
	maxLen = 170
): Evidence[] {
	const sorted = [...spans].sort((a, b) => a.start - b.start);
	const quotes: Evidence[] = [];
	for (let i = 0; i < sorted.length && quotes.length < maxQuotes;) {
		const { s, e } = sentenceWindow(original, sorted[i].start, sorted[i].end, maxLen);
		const group: { start: number; end: number }[] = [];
		while (i < sorted.length && sorted[i].start >= s && sorted[i].end <= e) {
			const last = group.at(-1);
			if (last && sorted[i].start < last.end) last.end = Math.max(last.end, sorted[i].end);
			else group.push({ ...sorted[i] });
			i++;
		}
		if (!group.length) {
			i++;
			continue;
		}
		const parts: Evidence['parts'] = [];
		let cursor = s;
		for (const g of group) {
			if (g.start > cursor) parts.push({ text: original.slice(cursor, g.start), mark: false });
			parts.push({ text: original.slice(g.start, g.end), mark: true });
			cursor = g.end;
		}
		if (e > cursor) parts.push({ text: original.slice(cursor, e), mark: false });
		const first = parts[0];
		const lastPart = parts[parts.length - 1];
		if (!first.mark) {
			first.text = first.text.replace(/^\s+/, '');
			if (s > 0 && !isSentenceBreak(original, s - 1))
				first.text = '…' + first.text.replace(/^\S*\s/, '');
		}
		if (!lastPart.mark) {
			lastPart.text = lastPart.text.replace(/\s+$/, '');
			if (e < original.length && !isSentenceBreak(original, e - 1))
				lastPart.text = lastPart.text.replace(/\s\S*$/, '') + '…';
		}
		quotes.push({
			start: group[0].start,
			end: group.at(-1)!.end,
			parts: parts.filter((p) => p.text)
		});
	}
	return quotes;
}

/** Fronteiras de oração usadas pela negação. */
const CLAUSE_BREAK =
	/[.!?;\n]|\b(mas|porem|contudo|entretanto|todavia|exceto|apenas|so que|somente|porque)\b/g;
const NEGATORS =
	/\b(nao|nunca|jamais|nenhum|nenhuma|sem|nem|isento|isenta|isentos|gratuit[oa]s?|gratis|proibid[oa]s?|evite|cuidado com|desconfie|jamais|zero)\b/g;
/** Frases que alertam sobre golpes em vez de oferecer a vaga. */
const WARNING_LEAD =
	/^\s*(cuidado|desconfie|alerta|evite|nunca|jamais|golpe|fique atent[ao]|atencao[:,]? (desconfie|cuidado|golpe))\b/;
/** Verbos de pedido que "quebram" uma negação anterior: "não perca, envie fotos". */
const ACTION_BREAK =
	/\b(envie|mande|manda|pague|faca|deposite|traga|perca|chame|clique|garanta|transfira)\b/;

/**
 * Verdadeiro se o trecho em [start,…) estiver sob negação na mesma oração.
 * "não cobramos taxa" → true; "não perca: taxa de R$ 50" → false.
 */
export function isNegated(text: string, start: number, end: number, window = 48): boolean {
	const from = Math.max(0, start - window);
	let left = text.slice(from, start);
	let lastBreak = -1;
	for (const m of left.matchAll(CLAUSE_BREAK)) lastBreak = m.index + m[0].length;
	if (lastBreak >= 0) left = left.slice(lastBreak);
	let neg: RegExpExecArray | null = null;
	for (const m of left.matchAll(NEGATORS)) neg = m as RegExpExecArray;
	if (neg) {
		const between = left.slice(neg.index + neg[0].length);
		if (!ACTION_BREAK.test(between)) return true;
	}
	// frase de alerta: "Cuidado: desconfie de vagas que pedem fotos…", "Nunca entregue…"
	let sStart = start;
	while (sStart > 0 && !isSentenceBreak(text, sStart - 1)) sStart--;
	const sentencePrefix = text.slice(sStart, start);
	if (
		WARNING_LEAD.test(sentencePrefix) &&
		!ACTION_BREAK.test(sentencePrefix.replace(WARNING_LEAD, ''))
	)
		return true;
	// negação posposta: "taxa de inscrição: não há", "taxas? nenhuma", "sem custo"
	const right = text.slice(end, end + 28);
	const cut = right.search(/[.!?;\n]/);
	const tail = cut >= 0 ? right.slice(0, cut) : right;
	return /^\W{0,3}(\b(e|eh|sao|e totalmente|e 100%)\s)?(nao (ha|existe|tem|cobramos|e cobrad)|nenhum|zero|gratuit|gratis|isent|sem custo)/.test(
		tail
	);
}

/** Frase (no texto normalizado) que contém a posição. */
export function sentenceAt(
	text: string,
	pos: number
): { start: number; end: number; text: string } {
	let s = pos;
	while (s > 0 && !isSentenceBreak(text, s - 1)) s--;
	let e = pos;
	while (e < text.length && !isSentenceBreak(text, e)) e++;
	return { start: s, end: e, text: text.slice(s, e) };
}

/** Todas as ocorrências de um regex (força a flag g). */
export function findAll(text: string, re: RegExp): RegExpMatchArray[] {
	const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
	return [...text.matchAll(new RegExp(re.source, flags))];
}

/** Existe algum match de `b` a no máximo `dist` caracteres de [start,end)? */
export function near(text: string, start: number, end: number, re: RegExp, dist: number): boolean {
	const s = Math.max(0, start - dist);
	return new RegExp(re.source).test(text.slice(s, Math.min(text.length, end + dist)));
}
