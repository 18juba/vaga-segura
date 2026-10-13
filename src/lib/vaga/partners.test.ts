import { describe, expect, it } from 'vitest';
import { PARTNER_VACANCIES, partnerVacanciesFor } from './partners';

describe('vagas de parceiros', () => {
	it('toda vaga de parceiro tem os campos essenciais preenchidos', () => {
		for (const v of PARTNER_VACANCIES) {
			expect(v.title).toBeTruthy();
			expect(v.company).toBeTruthy();
			expect(v.location).toBeTruthy();
			expect(v.salary).toBeTruthy();
		}
	});

	it('recomenda vagas da mesma categoria reconhecida', () => {
		const recs = partnerVacanciesFor('transporte');
		expect(recs.length).toBeGreaterThan(0);
		for (const rec of recs) expect(rec.category).toBe('transporte');
	});

	it('cai para uma categoria padrão quando não há parceiros na área', () => {
		const recs = partnerVacanciesFor('categoria-inexistente');
		expect(recs.length).toBeGreaterThan(0);
		for (const rec of recs) expect(rec.category).toBe('atendimento e comércio');
	});

	it('cai para a categoria padrão quando nenhuma função é reconhecida', () => {
		const recs = partnerVacanciesFor(undefined);
		expect(recs.length).toBeGreaterThan(0);
	});
});
