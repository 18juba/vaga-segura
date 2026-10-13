import { DEFAULT_REFERENCE_SALARY, FX_TO_BRL, PLACES, ROLES } from './config';
import { findAll, isNegated, toOriginal, type TextView } from './text';
import type { AgeRule, Cnpj, Contacts, Facts, Money, Place, Role } from './types';

// ───────────────────────────── dinheiro ─────────────────────────────

const MONEY_RE =
	/(r\$|us\$|u\$s|usd|eur|€|£|gbp|aed)?\s?(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s?(mil|k|mi|milhao|milhoes)\b)?(?:\s?(reais|dolares|dolar|euros?|libras?|dirhams?)\b)?/g;

const PAY_CONTEXT =
	/(salario|remuneracao|ganhe|ganha|ganhos|ganhar|receba|recebe|pagamos|renda|bolsa|comissao|diaria|faturamento|faturar|lucr)/;
const FEE_CONTEXT =
	/(taxa|pix|pague|pagar|pagamento d[ea]|deposit|transfer|custo|cobrad|cobramos|investimento|inscricao|matricula|uniforme|curso|exame|kit|cracha|reserv|valor de|mensalidade|caucao|adiantamento)/g;

function parseNumber(num: string, mult?: string): number {
	let n = num.replace(/\s/g, '');
	if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, '').replace(',', '.');
	else if (/\.\d{3}(\.|$)/.test(n)) n = n.replace(/\./g, '');
	else if (!/^\d+\.\d{1,2}$/.test(n)) n = n.replace(/[.,]/g, ''); // "1.5 mil" fica como está
	let value = Number.parseFloat(n);
	if (mult === 'mil' || mult === 'k') value *= 1000;
	if (mult && /^mi/.test(mult) && mult !== 'mil') value *= 1_000_000;
	return value;
}

function currencyOf(pre?: string, suf?: string): Money['currency'] {
	const t = `${pre ?? ''} ${suf ?? ''}`;
	if (/us\$|u\$s|usd|dolar/.test(t)) return 'USD';
	if (/€|eur/.test(t)) return 'EUR';
	if (/£|gbp|libra/.test(t)) return 'GBP';
	if (/aed|dirham/.test(t)) return 'AED';
	return 'BRL';
}

const PERIOD_FACTOR: Record<Money['period'], number> = {
	mes: 1,
	desconhecido: 1,
	semana: 4.33,
	dia: 22,
	hora: 176,
	ano: 1 / 12
};

function periodOf(before: string, after: string): Money['period'] {
	const a = after.slice(0, 32);
	if (/^\s*(\/\s*|por |ao |a cada |p\/\s*|pagos? |liquidos? |livres? |fixos? )*(mes|mensa)/.test(a))
		return 'mes';
	if (/^\s*(\/\s*|por |a cada |p\/\s*|pagos? |livres? )*(semana|semanal|semanais)/.test(a))
		return 'semana';
	if (
		/^\s*(\/\s*|por |a cada |p\/\s*|pagos? |livres? )*(dia|diaria|diarias|noite|plantao)\b/.test(a)
	)
		return 'dia';
	if (/^\s*(\/\s*|por |a cada |p\/\s*)*(hora|h\b)/.test(a)) return 'hora';
	if (/^\s*(\/\s*|por |ao |p\/\s*)*(ano|anual|anuais)/.test(a)) return 'ano';
	const b = before.slice(-28);
	if (/(diaria|por dia|por noite)\s*(de|:)?\s*$/.test(b)) return 'dia';
	if (/(semanal|por semana)\s*(de|:)?\s*$/.test(b)) return 'semana';
	if (/(mensal|por mes)\s*(de|:)?\s*$/.test(b)) return 'mes';
	return 'desconhecido';
}

export function extractMoney(view: TextView): Money[] {
	const out: Money[] = [];
	const t = view.plain;
	for (const m of t.matchAll(MONEY_RE)) {
		const [raw, pre, num, mult, suf] = m;
		if (!num) continue;
		const start = pre ? m.index : m.index + raw.indexOf(num);
		const end = m.index + raw.trimEnd().length;
		const before = t.slice(Math.max(0, start - 45), start);
		const after = t.slice(end, end + 40);
		const hasCurrency = Boolean(pre || suf);
		const ctxPay = PAY_CONTEXT.test(before.slice(-30));
		if (!hasCurrency) {
			// "15 mil por mês", "salário de 3.500" — sem símbolo, exige contexto de pagamento
			if (!ctxPay) continue;
			if (/^\s*(anos|h\b|horas|%|km|m2|metros|vagas|pessoas|kg|cm|dias|meses|x\b)/.test(after))
				continue;
		}
		const amount = parseNumber(num, mult);
		if (!Number.isFinite(amount) || amount <= 0) continue;
		if (!hasCurrency && amount < 300 && !mult) continue;
		const currency = currencyOf(pre, suf);
		const period = periodOf(before, after);
		const monthlyBRL = amount * FX_TO_BRL[currency] * PERIOD_FACTOR[period];

		// cobrança x remuneração: vence a palavra-chave mais próxima, na mesma frase
		const sentenceStart = Math.max(
			before.lastIndexOf('.'),
			before.lastIndexOf('\n'),
			before.lastIndexOf('!')
		);
		const ctx = before.slice(sentenceStart + 1);
		let feeAt = -1;
		for (const f of ctx.matchAll(FEE_CONTEXT)) feeAt = f.index;
		let payAt = -1;
		for (const p of ctx.matchAll(new RegExp(PAY_CONTEXT.source, 'g'))) payAt = p.index;
		const viaPixAfter = /^\s*(via|no|por|de)?\s*(pix|deposito|transferencia|boleto)/.test(after);
		const kind: Money['kind'] =
			feeAt > payAt || (viaPixAfter && payAt < 0) ? 'cobranca' : 'remuneracao';
		const upTo = /\b(ate|chegar a|pode chegar a)\s*$/.test(before.slice(-16));
		const negated = isNegated(t, start, end);
		const o = toOriginal(view.mapPlain, view.original, start, end);
		out.push({
			start: o.start,
			end: o.end,
			raw: view.original.slice(o.start, o.end),
			amount,
			currency,
			period,
			monthlyBRL,
			kind,
			upTo,
			negated
		});
	}
	return out;
}

// ───────────────────────────── idade ─────────────────────────────

const NOT_AGE_AFTER =
	/^\s*(de )?(experiencia|atuacao|mercado|casa|empresa|carreira|trabalho|servico|historia|tradicao|existencia|garantia)/;

export function extractAges(view: TextView, currentYear: number): AgeRule[] {
	const t = view.plain;
	const out: AgeRule[] = [];
	const push = (m: RegExpMatchArray, min?: number, max?: number) => {
		const end = m.index! + m[0].trimEnd().length;
		if (NOT_AGE_AFTER.test(t.slice(end, end + 30))) return;
		const valid = (n?: number) => n === undefined || (n >= 8 && n <= 90);
		if (!valid(min) || !valid(max) || (min === undefined && max === undefined)) return;
		if (min !== undefined && max !== undefined && min > max) return;
		const o = toOriginal(view.mapPlain, view.original, m.index!, end);
		if (out.some((a) => a.start <= o.start && a.end >= o.end)) return;
		for (let i = out.length - 1; i >= 0; i--)
			if (o.start <= out[i].start && o.end >= out[i].end) out.splice(i, 1);
		out.push({ start: o.start, end: o.end, raw: view.original.slice(o.start, o.end), min, max });
	};
	const n = (s?: string) => (s === undefined ? undefined : Number.parseInt(s, 10));

	for (const m of t.matchAll(
		/\b(?:entre |de |dos |das )?(\d{1,2})\s?(?:a|-|ate|e|aos)\s?(\d{1,2})\s?anos\b/g
	))
		push(m, n(m[1]), n(m[2]));
	for (const m of t.matchAll(
		/\b(?:a partir d[eo]s?|acima de|maiores de|maior de|minimo de|idade minima(?: de)?:?|com no minimo|no minimo)\s?(\d{1,2})\s?(?:anos)?\b/g
	))
		push(m, n(m[1]));
	for (const m of t.matchAll(
		/\b(?:ate|maximo de|idade maxima(?: de)?:?|menos de|abaixo de)\s?(\d{1,2})\s?anos\b/g
	))
		push(m, undefined, n(m[1]));
	for (const m of t.matchAll(/\b(\d{1,2})\s?anos\s?(?:ou mais|para cima|pra cima|em diante|\+)/g))
		push(m, n(m[1]));
	for (const m of t.matchAll(/\bidade:?\s?(\d{1,2})\b(?!\s?(?:a|-|ate)\s?\d)/g))
		push(m, n(m[1]), n(m[1]));
	for (const m of t.matchAll(
		/(?:^|[\s(])\+\s?(1[2-9]|2[01])\b|\b(1[2-9]|2[01])\s?\+(?=\s|$|[.,!])/g
	)) {
		const v = n(m[1] ?? m[2]);
		// "+18"/"16+" só conta perto de palavras de idade ou em anúncios com fotos/aparência
		if (
			/(anos|idade|garot|menin|moca|jove|adolescen|foto)/.test(
				t.slice(Math.max(0, m.index! - 40), m.index! + 40)
			)
		)
			push(m, v);
	}
	for (const m of t.matchAll(
		/\bnascid[ao]s?\s(?:em|a partir de|apos|depois de|entre|de)\s?((?:19|20)\d\d)(?:\s?(?:e|a|ate)\s?((?:19|20)\d\d))?/g
	)) {
		const y1 = n(m[1])!;
		const y2 = n(m[2]);
		const fromPhrase = /a partir de|apos|depois de/.test(m[0]);
		if (y2) push(m, currentYear - y2 - 1, currentYear - y1);
		else if (fromPhrase) push(m, undefined, currentYear - y1);
		else push(m, currentYear - y1 - 1, currentYear - y1);
	}
	return out.sort((a, b) => a.start - b.start);
}

// ───────────────────────────── CNPJ ─────────────────────────────

/** Valida CNPJ numérico ou alfanumérico (IN RFB 2.229/2024, a partir de jul/2026). */
export function validateCnpj(value: string): boolean {
	const v = value.toUpperCase().replace(/[^0-9A-Z]/g, '');
	if (!/^[0-9A-Z]{12}\d{2}$/.test(v)) return false;
	if (/^(\d)\1{13}$/.test(v)) return false;
	const vals = [...v].map((c) => c.charCodeAt(0) - 48);
	const dv = (len: number) => {
		let sum = 0;
		let w = 2;
		for (let i = len - 1; i >= 0; i--) {
			sum += vals[i] * w;
			w = w === 9 ? 2 : w + 1;
		}
		const r = sum % 11;
		return r < 2 ? 0 : 11 - r;
	};
	return dv(12) === vals[12] && dv(13) === vals[13];
}

export function extractCnpjs(view: TextView): Cnpj[] {
	const src = view.original;
	const out: Cnpj[] = [];
	const re =
		/(?<![0-9A-Za-z])([0-9A-Za-z]{2})\.?([0-9A-Za-z]{3})\.?([0-9A-Za-z]{3})\/?([0-9A-Za-z]{4})-?(\d{2})(?![0-9A-Za-z])/g;
	for (const m of src.matchAll(re)) {
		const raw = m[0];
		const digits = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
		const masked = /[./-]/.test(raw);
		const alnum = /[A-Z]/.test(digits);
		const labelled = /cnpj/i.test(src.slice(Math.max(0, m.index - 25), m.index));
		if (alnum && !labelled && !masked) continue;
		if (alnum && (digits.replace(/\D/g, '').length < 4 || (/[a-z]{4}/i.test(raw) && !labelled)))
			continue;
		if (!masked && !labelled && !/^\d{14}$/.test(digits)) continue;
		out.push({
			start: m.index,
			end: m.index + raw.length,
			raw,
			digits,
			valid: validateCnpj(digits),
			alphanumeric: alnum
		});
	}
	// "CNPJ 12.345.678/0001" — número rotulado como CNPJ mas com tamanho errado
	for (const m of src.matchAll(/cnpj\s*(?:n[º°o.]*)?\s*:?\s*([0-9][0-9./\s-]{6,24}[0-9])/gi)) {
		const raw = m[1];
		const start = m.index + m[0].indexOf(raw);
		if (out.some((c) => c.start <= start && c.end >= start)) continue;
		const digits = raw.replace(/\D/g, '');
		out.push({ start, end: start + raw.length, raw, digits, valid: false, alphanumeric: false });
	}
	return out.sort((a, b) => a.start - b.start);
}

// ───────────────────────────── contatos ─────────────────────────────

const FREE_MAIL =
	/^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|bol|uol|icloud|me|proton|protonmail|terra|ig|aol|yandex|mail|zoho|gmx)\./;
const SOCIAL =
	/(instagram|facebook|fb\.com|fb\.me|tiktok|t\.me|telegram|wa\.me|whatsapp|twitter|x\.com|kwai|linktr\.ee|youtube|threads\.net)/;
const JOB_BOARD =
	/(gupy|linkedin|vagas\.com|catho|infojobs|indeed|empregos\.com|sine|idt\.org|solides|kenoby|trabalhabrasil|bne\.com|99jobs|glassdoor|emprega|recrutei|pandape|vagas\.gov)/;
const SHORTENER =
	/(bit\.ly|tinyurl|cutt\.ly|is\.gd|t\.co\/|rb\.gy|shorturl|encurtador|abre\.ai|tiny\.cc)/;

export function extractContacts(view: TextView): Contacts {
	const src = view.original;
	const emails: Contacts['emails'] = [];
	const emailSpans: [number, number][] = [];
	for (const m of src.matchAll(/[a-z0-9._%+-]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/gi)) {
		const domain = m[1].toLowerCase();
		emails.push({ value: m[0], corporate: !FREE_MAIL.test(domain) });
		emailSpans.push([m.index, m.index + m[0].length]);
	}
	const urls: Contacts['urls'] = [];
	for (const m of src.matchAll(
		/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|br|net|org|io|app|me|ly|gl|co|site|online|store|info|biz|vip|xyz|top|ai|gd|cc)(?:\.[a-z]{2})?(?:\/[^\s)]*)?/gi
	)) {
		if (emailSpans.some(([s, e]) => m.index >= s && m.index < e)) continue;
		const v = m[0].toLowerCase();
		if (/^\d/.test(v)) continue;
		const kind = SHORTENER.test(v)
			? 'encurtador'
			: SOCIAL.test(v)
				? 'rede-social'
				: JOB_BOARD.test(v)
					? 'plataforma-vagas'
					: 'site';
		urls.push({ value: m[0], kind });
	}
	const phones: Contacts['phones'] = [];
	for (const m of src.matchAll(
		/(?:\+\s?(\d{1,3})[\s-]?)?\(?\b(\d{2})\)?[\s.-]?(9\s?\d{4}|[2-5]\d{3})[\s.-]?(\d{4})\b/g
	)) {
		const cc = m[1];
		phones.push({
			value: m[0].trim(),
			mobile: m[3].startsWith('9') && m[3].replace(/\s/g, '').length === 5,
			international: Boolean(cc && cc !== '55')
		});
	}
	for (const m of src.matchAll(/\+\s?(?!55)(\d{2,3})[\s-]?\d[\d\s-]{6,14}\d/g)) {
		if (phones.some((p) => p.value.includes(m[0].trim()) || m[0].includes(p.value))) continue;
		phones.push({ value: m[0].trim(), mobile: true, international: true });
	}

	const kw = view.keyword;
	const messaging: Contacts['messaging'] = [];
	for (const m of kw.matchAll(
		/\b(whats ?app|whats|wats|watts|zap ?zap|zap|wpp|uatsap|telegram|telegran|instagram|insta|messenger|facebook|tiktok|kwai|signal)\b|\b(?:no|pelo|via|chama no|chame no|me chama no) (privado|pv|inbox|direct|dm|reservado)\b/g
	)) {
		const o = toOriginal(view.mapKeyword, src, m.index, m.index + m[0].length);
		messaging.push({ ...o, channel: (m[1] ?? m[2]).replace(/\s/g, '') });
	}
	const address: Contacts['address'] = [];
	const t = view.plain;
	for (const m of t.matchAll(
		/\b(rua|r\.|av\.|avenida|travessa|tv\.|rodovia|alameda|praca|estrada|largo|quadra)\s+[a-z0-9 .'-]{2,45}?,?\s*(?:n[o.]?\s*)?\d{1,5}\b|\bcep:?\s?\d{5}-?\d{3}\b/g
	)) {
		const o = toOriginal(view.mapPlain, src, m.index, m.index + m[0].length);
		address.push({ ...o, raw: src.slice(o.start, o.end) });
	}
	return { emails, urls, phones, messaging, address };
}

// ───────────────────────────── lugares e funções ─────────────────────────────

export function extractPlaces(view: TextView): Place[] {
	const out: Place[] = [];
	const t = view.keyword;
	for (const def of PLACES) {
		for (const m of findAll(t, def.pattern)) {
			const s = m.index!;
			const e = s + m[0].length;
			if (isNegated(t, s, e, 24)) continue;
			// "São Paulo" pode ser só nome de rua/empresa: ignora "rua/av. São Paulo"
			if (
				/(rua|avenida|av\.|travessa|bairro|edificio|colegio|hospital|banco)\s+$/.test(
					t.slice(Math.max(0, s - 14), s)
				)
			)
				continue;
			const o = toOriginal(view.mapKeyword, view.original, s, e);
			out.push({
				...o,
				name: def.name,
				scope: def.scope,
				officialAlert: Boolean(def.officialAlert)
			});
		}
	}
	return out.sort((a, b) => a.start - b.start);
}

export function extractRoles(view: TextView): Role[] {
	const out: Role[] = [];
	for (const r of ROLES) {
		for (const m of findAll(view.keyword, r.pattern)) {
			const o = toOriginal(view.mapKeyword, view.original, m.index!, m.index! + m[0].length);
			out.push({ id: r.id, label: r.label, referenceSalary: r.ref, ...o });
		}
	}
	return out.sort((a, b) => a.start - b.start);
}

export function referenceSalary(roles: Role[]): number {
	// usa a função mais "barata" citada: o golpe costuma inflar salário de função simples
	if (!roles.length) return DEFAULT_REFERENCE_SALARY;
	return Math.min(...roles.map((r) => r.referenceSalary));
}

export function extractFacts(view: TextView, currentYear: number): Facts {
	const companyMarkers: Facts['companyMarkers'] = [];
	for (const m of view.plain.matchAll(
		/\b(ltda|s\/a|s\.a\.?|eireli|razao social|cia\.)(?=[\s,.;)]|$)/g
	)) {
		const o = toOriginal(view.mapPlain, view.original, m.index, m.index + m[0].length);
		companyMarkers.push({ ...o, raw: view.original.slice(o.start, o.end) });
	}
	return {
		money: extractMoney(view),
		ages: extractAges(view, currentYear),
		cnpjs: extractCnpjs(view),
		places: extractPlaces(view),
		contacts: extractContacts(view),
		roles: extractRoles(view),
		companyMarkers,
		apprenticeship:
			/\b(jovem aprendiz|menor aprendiz|programa (jovem )?aprendiz|aprendiz legal|lei (do )?aprendiz|lei 10\.?097|estagio|estagiari[ao]s?)\b/.test(
				view.keyword
			)
	};
}
