import { describe, expect, it } from 'vitest';
import { analyzeVacancy, validateCnpj } from './index';
import { CORPUS } from './corpus';
import { buildView, isNegated } from './text';
import { extractAges, extractMoney } from './extract';

const ids = (text: string) => analyzeVacancy(text).signals.map((s) => s.signal.id);

describe('corpus rotulado', () => {
	for (const ad of CORPUS) {
		it(ad.name, () => {
			const a = analyzeVacancy(ad.text);
			const found = a.signals.map((s) => s.signal.id);
			const levels = Array.isArray(ad.level) ? ad.level : [ad.level];
			expect(levels, `nível ${a.level} (nota ${a.score}, sinais ${found.join(',')})`).toContain(
				a.level
			);
			for (const id of ad.has ?? []) expect(found, `deveria conter ${id}`).toContain(id);
			for (const id of ad.not ?? []) expect(found, `não deveria conter ${id}`).not.toContain(id);
		});
	}

	it('nenhum anúncio rotulado como Alto sai como Baixo (falso negativo grave)', () => {
		const misses = CORPUS.filter(
			(ad) => ad.level === 'alto' && analyzeVacancy(ad.text).level === 'baixo'
		);
		expect(misses.map((m) => m.name)).toEqual([]);
	});
});

describe('nota 10–90', () => {
	it('fica entre 10 e 90 e concorda com o nível', () => {
		for (const ad of CORPUS) {
			const a = analyzeVacancy(ad.text);
			expect(a.score).toBeGreaterThanOrEqual(10);
			expect(a.score).toBeLessThanOrEqual(90);
			if (a.level === 'baixo') expect(a.score).toBeLessThanOrEqual(36);
			if (a.level === 'atencao') expect(a.score).toBeGreaterThanOrEqual(37);
			if (a.level === 'atencao') expect(a.score).toBeLessThanOrEqual(63);
			if (a.level === 'alto') expect(a.score).toBeGreaterThanOrEqual(64);
		}
	});

	it('texto sem nenhum sinal recebe 10', () => {
		const a = analyzeVacancy(
			'Auxiliar administrativo – Alfa LTDA, CNPJ 11.222.333/0001-81. Salário R$ 2.200. Currículos em rh@alfa.com.br. Av. Beira Mar, 100.'
		);
		expect(a.rawPoints).toBe(0);
		expect(a.score).toBe(10);
	});

	it('soma de pesos segue a planilha', () => {
		const a = analyzeVacancy(CORPUS[0].text);
		expect(a.rawPoints).toBe(a.signals.reduce((s, r) => s + r.signal.weight, 0));
	});

	it('um único sinal crítico eleva para Alto (regra a)', () => {
		const a = analyzeVacancy(
			'Mande seu passaporte para a gente. Empresa Beta LTDA, CNPJ 11.222.333/0001-81, rh@beta.com.br.'
		);
		expect(a.signals.map((s) => s.signal.id)).toContain('S08');
		expect(a.level).toBe('alto');
		expect(a.escalations[0].rule).toBe('sinal-critico');
	});

	it('viagem paga + exposição pessoal eleva para Alto (regra b)', () => {
		const a = analyzeVacancy(
			'Passagem paga para Lisboa. Exigimos boa aparência. Empresa Gama LTDA, CNPJ 11.222.333/0001-81, rh@gama.pt.'
		);
		expect(a.escalations.map((e) => e.rule)).toContain('viagem-e-exposicao');
		expect(a.level).toBe('alto');
	});

	it('nunca diz que a vaga é segura', () => {
		for (const ad of CORPUS) expect(analyzeVacancy(ad.text).summary).not.toMatch(/segur/i);
	});
});

describe('evidências', () => {
	it('aponta o trecho exato do texto original, com acentos', () => {
		const text = 'Atenção!   Não precisa de experiência.\nEnvie fotos de corpo inteiro.';
		const a = analyzeVacancy(text);
		const s09 = a.signals.find((s) => s.signal.id === 'S09')!;
		const marked = (e: (typeof s09.evidence)[0]) =>
			e.parts.filter((p) => p.mark).map((p) => p.text);
		expect(marked(s09.evidence[0])).toEqual(['fotos de corpo inteiro']);
		expect(text.slice(s09.evidence[0].start, s09.evidence[0].end)).toBe('fotos de corpo inteiro');
		const s02 = a.signals.find((s) => s.signal.id === 'S02')!;
		expect(marked(s02.evidence[0])).toEqual(['Não precisa de experiência']);
	});

	it('agrupa trechos da mesma frase numa única citação', () => {
		const a = analyzeVacancy('Modelos para eventos em Dubai, passagem paga.');
		const s11 = a.signals.find((s) => s.signal.id === 'S11')!;
		expect(s11.evidence).toHaveLength(1);
		expect(s11.evidence[0].parts.filter((p) => p.mark).map((p) => p.text)).toEqual([
			'Modelos',
			'Dubai'
		]);
	});
});

describe('normalização e negação', () => {
	it('desofusca leetspeak e letras espaçadas', () => {
		expect(buildView('Env1e f o t o s de b1qu1n1').keyword).toContain('envie fotos de biquini');
	});
	it('desfaz letras estilizadas Unicode', () => {
		expect(buildView('𝗳𝗼𝘁𝗼𝘀 𝗱𝗲 𝗯𝗶𝗾𝘂𝗶𝗻𝗶').keyword).toBe('fotos de biquini');
	});
	it('remove caracteres invisíveis usados para burlar filtros', () => {
		expect(ids('Envie fo\u200Btos de bi\u00ADquíni')).toContain('S09');
	});
	it('não estraga e-mails nem valores', () => {
		const v = buildView('rh2026@empresa.com R$ 1.500');
		expect(v.keyword).toBe('rh2026@empresa.com r$ 1.500');
	});
	it('detecta negação antes e depois', () => {
		const t = 'nao cobramos taxa de inscricao';
		expect(isNegated(t, t.indexOf('taxa'), t.indexOf('taxa') + 4)).toBe(true);
		const t2 = 'taxa de inscricao: nao ha';
		expect(isNegated(t2, 0, 17)).toBe(true);
		const t3 = 'nao perca, envie a taxa de inscricao';
		expect(isNegated(t3, t3.indexOf('taxa'), t3.indexOf('taxa') + 4)).toBe(false);
	});
	it('ignora "não cobramos taxas"', () => {
		expect(ids('Não cobramos nenhuma taxa de cadastro.')).not.toContain('S18');
	});
});

describe('extratores', () => {
	const money = (t: string) => extractMoney(buildView(t))[0];
	it('lê formatos de salário', () => {
		expect(money('Salário de R$ 15 mil').amount).toBe(15000);
		expect(money('R$ 3.500,00 por mês').amount).toBe(3500);
		expect(money('ganhe 15k').amount).toBe(15000);
		expect(money('salário de 1,5 mil').amount).toBe(1500);
		expect(money('US$ 2.000 por mês').monthlyBRL).toBeGreaterThan(10000);
		expect(money('R$ 300 por dia').monthlyBRL).toBe(6600);
		expect(money('Taxa de R$ 150 via pix').kind).toBe('cobranca');
		expect(money('Salário de R$ 2.000').kind).toBe('remuneracao');
	});
	it('lê idades', () => {
		const ages = (t: string) => extractAges(buildView(t), 2026);
		expect(ages('moças de 18 a 25 anos')[0]).toMatchObject({ min: 18, max: 25 });
		expect(ages('a partir de 16 anos')[0]).toMatchObject({ min: 16 });
		expect(ages('nascidas a partir de 2010')[0]).toMatchObject({ max: 16 });
		expect(ages('5 anos de experiência')).toEqual([]);
	});
	it('valida CNPJ numérico e alfanumérico', () => {
		expect(validateCnpj('11.222.333/0001-81')).toBe(true);
		expect(validateCnpj('12.345.678/0001-00')).toBe(false);
		expect(validateCnpj('11.111.111/1111-11')).toBe(false);
		expect(validateCnpj('12.ABC.345/01DE-35')).toBe(true);
	});
});
