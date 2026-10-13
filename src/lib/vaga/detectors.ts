import { EXPOSURE_ROLES } from './config';
import { referenceSalary } from './extract';
import { findAll, isNegated, near, toOriginal, type TextView } from './text';
import type { Facts, Hit, SignalId } from './types';

export interface DetectorContext {
	view: TextView;
	/** Texto normalizado + desofuscado, onde os padrões rodam. */
	kw: string;
	facts: Facts;
	hits: Hit[];
}

type ScanOpts = { negatable?: boolean; note?: string; window?: number };

function scan(
	ctx: DetectorContext,
	id: SignalId,
	re: RegExp,
	confidence: number,
	opts: ScanOpts = {}
) {
	const { negatable = true, note, window } = opts;
	let found = 0;
	for (const m of findAll(ctx.kw, re)) {
		const s = m.index!;
		const e = s + m[0].length;
		if (negatable && isNegated(ctx.kw, s, e, window)) continue;
		const o = toOriginal(ctx.view.mapKeyword, ctx.view.original, s, e);
		ctx.hits.push({ id, confidence, start: o.start, end: o.end, note });
		found++;
	}
	return found;
}

function hit(
	ctx: DetectorContext,
	id: SignalId,
	confidence: number,
	span?: { start: number; end: number },
	note?: string
) {
	ctx.hits.push({ id, confidence, start: span?.start ?? -1, end: span?.end ?? -1, note });
}

/** Texto original (normalizado) ao redor de um hit — hits guardam posições do original. */
function around(
	ctx: DetectorContext,
	h: { start: number; end: number },
	before: number,
	after: number
) {
	return ctx.view.original
		.slice(Math.max(0, h.start - before), Math.max(0, h.end + after))
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase();
}

const brl = (n: number) =>
	n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// ─── S01 Salário muito acima do mercado ───
function s01(ctx: DetectorContext) {
	const { facts } = ctx;
	const ref = referenceSalary(facts.roles);
	const role = facts.roles.length
		? facts.roles.reduce((a, b) => (a.referenceSalary <= b.referenceSalary ? a : b))
		: undefined;
	const demanding =
		/(\d+ anos de experiencia|experiencia (comprovada|minima|de \d)|superior completo|graduacao em|pos-graduacao|mestrado|ingles (fluente|avancado)|certificacao|crea|coren|crm|oab)/.test(
			ctx.kw
		);
	for (const m of facts.money) {
		if (m.kind !== 'remuneracao') continue;
		const ratio = m.monthlyBRL / ref;
		let c = ratio >= 3 ? 0.9 : ratio >= 2.2 ? 0.7 : ratio >= 1.8 && m.upTo ? 0.5 : 0;
		if (!c) continue;
		if (demanding) c -= 0.3;
		const conv =
			m.currency !== 'BRL' || (m.period !== 'mes' && m.period !== 'desconhecido')
				? ` (≈ ${brl(m.monthlyBRL)}/mês)`
				: '';
		hit(
			ctx,
			'S01',
			c,
			m,
			`${m.raw}${conv} é cerca de ${ratio.toFixed(1).replace('.', ',')}× a referência de ${brl(ref)} para ${role ? `a função “${ctx.view.original.slice(role.start, role.end)}”` : 'uma função de entrada'}.`
		);
	}
	scan(
		ctx,
		'S01',
		/\b(salario|ganhos?|remuneracao|renda) (altissim[oa]|muito alt[oa]|absurd[oa]|incrive(l|is)|irrecusave(l|is))|\bganhe muito\b|\bdinheiro facil\b|\bfique ric[oa]\b|\bmude de vida\b|\bindependencia financeira\b|\bganhos? de ate\b|\brenda de ate\b/,
		0.6
	);
	scan(ctx, 'S01', /\bganh(a|e|am|ar) muito( bem| dinheiro)?\b/, 0.5);
	scan(ctx, 'S01', /\b(excelente|otim[oa]|alt[oa]) (salario|remuneracao)\b/, 0.35);
}

// ─── S02 Não exige experiência ───
function s02(ctx: DetectorContext) {
	const o = { negatable: false };
	scan(
		ctx,
		'S02',
		/\b(nao|sem) (precisa|precisamos|exige|exigimos|requer|necessita|e necessari[ao]|e precis[oa]|e obrigatori[ao])( ter)?( de)? (experiencia|qualificacao|estudo|escolaridade|curriculo|formacao|pratica|nada)\b/,
		0.85,
		o
	);
	scan(ctx, 'S02', /\bsem (nenhuma )?experiencia\b/, 0.85, o);
	scan(
		ctx,
		'S02',
		/\bexperiencia (nao (e )?(necessaria|obrigatoria|exigida|precisa)|dispensavel|desnecessaria)\b/,
		0.85,
		o
	);
	scan(
		ctx,
		'S02',
		/\b(qualquer (pessoa|um|uma)|nao precisa saber nada|nao precisa ter estudo|nao importa (a )?experiencia)\b/,
		0.75,
		o
	);
	scan(
		ctx,
		'S02',
		/\b((nos|a gente|nos mesmos) (te )?(treinamos|ensinamos|capacitamos)|treinamento (completo|gratuito|incluso|por nossa conta)|a gente te ensina)\b/,
		0.6
	);
	scan(ctx, 'S02', /\bprimeiro emprego\b/, 0.35);
}

// ─── S03 Urgência ───
function s03(ctx: DetectorContext) {
	scan(ctx, 'S03', /\burgente(mente)?\b|\burgencia\b/, 0.7);
	scan(
		ctx,
		'S03',
		/\b(so|somente|apenas|valid[ao]|ultimo dia|vagas?( abertas)?)( so| somente)? ate (hoje|amanha|esta semana|essa semana|meia[- ]noite)\b|\b(so|somente) (hoje|amanha)\b/,
		0.9
	);
	scan(
		ctx,
		'S03',
		/\b(ultimas|poucas|restam|so restam|apenas) (\d+ )?vagas\b|\bvagas limitadas\b/,
		0.75
	);
	scan(
		ctx,
		'S03',
		/\b(embarque|viagem|partida) (imediat[oa]|ja|amanha|na proxima semana|em \d+ dias|essa semana|esta semana|ainda este mes|marcad[oa] para)\b/,
		0.9
	);
	scan(
		ctx,
		'S03',
		/\b(decida|responda|confirme|garanta|corre|corra)\b.{0,12}\b(ja|agora|logo|hoje|rapido|sua vaga|a vaga)\b|\bgarantir (a|sua) vaga\b|\bnao perca (essa|esta|a) (chance|oportunidade|vaga)\b|\bquem chegar primeiro\b|\bprimeir[oa]s \d+ (que|a) (responder|chamar|mandar)\b/,
		0.8,
		{ negatable: false }
	);
	scan(
		ctx,
		'S03',
		/\bprazo (ate|de) (hoje|\d+ ?h(oras)?)\b|\b\d+ ?h(oras)? para (responder|confirmar|decidir)\b/,
		0.8
	);
	scan(ctx, 'S03', /\b(inicio imediato|comeca amanha|comecar amanha)\b/, 0.35);
}

// ─── S04 Função vaga ───
function s04(ctx: DetectorContext) {
	scan(
		ctx,
		'S04',
		/\b(detalhes|mais informacoes|maiores informacoes|informacoes|explico( melhor)?|conto (tudo|mais)|te explico|saiba mais|sobre a vaga)\s(so |somente |apenas )?(no|pelo|via|por|em) (privado|pv|inbox|direct|dm|whats ?app|whats|zap|telegram|reservado)\b/,
		0.85
	);
	scan(
		ctx,
		'S04',
		/\b(nao (posso|podemos) (dar detalhes|falar (mais|aqui)|explicar (aqui|por aqui))|so explico pessoalmente|chama que (eu )?(explico|te conto))\b/,
		0.85,
		{ negatable: false }
	);
	scan(
		ctx,
		'S04',
		/\b(trabalho (facil|simples e bem pago|leve)|renda extra garantida|servicos diversos|funcoes diversas|casa de familia|acompanhar (empresarios|executivos|clientes|turistas)|trabalho de acompanhante)\b/,
		0.6
	);
	scan(ctx, 'S04', /\b(vagas?|trabalhos?|trabalhar) (em|para|com) eventos\b/, 0.45);
	const { facts, kw } = ctx;
	const describesWork =
		/(atividades|responsabilidades|funcoes|atribuicoes|requisitos|descricao da vaga|voce (vai|ira) (atuar|trabalhar|fazer|cuidar|atender)|sera responsavel|atuar (com|em|no|na)|rotina de)/.test(
			kw
		);
	if (!facts.roles.length && !describesWork && (facts.money.length || facts.places.length)) {
		hit(
			ctx,
			'S04',
			0.45,
			undefined,
			'O texto fala de pagamento ou viagem, mas não diz qual é o trabalho.'
		);
	}
}

const PAID = String.raw`(paga|pagas|pago|pagos|por nossa conta|por conta da (empresa|agencia|casa)|inclusa|inclusas|incluso|inclusos|gratis|gratuita|gratuitas|custeada|custeadas|garantid[ao]s?|bancad[ao]s?|e nossa|fica por nossa conta|ja inclus[ao]s?)\b`;

// ─── S05 Viagem paga para outro estado/país ───
function s05(ctx: DetectorContext) {
	const before = ctx.hits.length;
	scan(
		ctx,
		'S05',
		new RegExp(
			String.raw`\b(passage(m|ns)( aereas?)?|viagem|voo|ida)( e (hospedagem|moradia|alimentacao|estadia|alojamento|visto))? (de ida )?${PAID}`
		),
		0.65
	);
	scan(
		ctx,
		'S05',
		new RegExp(
			String.raw`\b(hospedagem|moradia|alojamento|estadia|acomodacao)( e (passage(m|ns)|alimentacao|visto|viagem))? ${PAID}`
		),
		0.4
	);
	scan(
		ctx,
		'S05',
		/\b(pagamos|custeamos|bancamos|oferecemos|damos|a empresa paga|a empresa custeia|nos pagamos|a agencia paga)( a| sua| as| tua| o| seu)? (passage(m|ns)|viagem|hospedagem|ida|voo|estadia|visto)\b/,
		0.7
	);
	scan(
		ctx,
		'S05',
		/\b(com|incluindo|inclui) (passage(m|ns)|viagem) (e|\+) (hospedagem|alimentacao|moradia|estadia)\b/,
		0.7
	);
	const travelHits = ctx.hits.slice(before);
	const far = ctx.facts.places.filter((p) => p.scope === 'exterior' || p.scope === 'outro-estado');
	if (travelHits.length && far.length) {
		// a combinação viagem paga + destino fora é o sinal completo da planilha
		hit(ctx, 'S05', 0.9, far[0], `Destino: ${far[0].name}.`);
	}
}

// ─── S06 Destino com alerta oficial ───
function s06(ctx: DetectorContext) {
	for (const p of ctx.facts.places.filter((x) => x.officialAlert)) {
		hit(
			ctx,
			'S06',
			0.9,
			p,
			`${p.name} está no alerta do Itamaraty sobre falsas ofertas de emprego.`
		);
	}
}

// ─── S07 Dívida ───
function s07(ctx: DetectorContext) {
	const legitDeduction =
		/(inss|vale[- ]transporte|\bvt\b|impostos?|fgts|irrf|plano de saude|faltas|contribuicao sindical)/;
	const n0 = ctx.hits.length;
	scan(
		ctx,
		'S07',
		/\b(passage(m|ns)|viagem|hospedage(m|ns)|moradia|alojamento|alimentacao|despesas|custos|visto|documentacao|transporte|uniforme|equipamento|estadia|comida)s? (sera |serao |e |sao |vai ser |vao ser |fica |ficam )?(descontad[ao]s?|abatid[ao]s?|debitad[ao]s?|cobrad[ao]s? depois)\b/,
		0.9
	);
	scan(
		ctx,
		'S07',
		/\b(desconta(mos|do|da|r|remos)?|abate(mos|r)?|debita(mos)?) (do|no|dos|nos|em|de) (seu |teu |primeiro |1o )?(salario|pagamento|ganhos|comiss(ao|oes))\b/,
		0.85
	);
	scan(
		ctx,
		'S07',
		/\b(paga|pagar|pagara|devolve|devolver|acerta|acertar|quita|quitar|desconta|descontar|repoe|repor)\b.{0,32}\b(primeiro|1o|primeiros) (salarios?|pagamentos?|mes|meses)\b/,
		0.9
	);
	scan(
		ctx,
		'S07',
		/\b(adiantamos|emprestamos|pagamos agora|a empresa adianta|a gente adianta)\b.{0,45}\b(devolve|paga depois|desconta|acerta depois|reembols|abate)/,
		0.9
	);
	scan(
		ctx,
		'S07',
		/\b(trabalhar|trabalha|trabalhando) (ate|para|pra) (pagar|quitar|cobrir)\b|\bdivida (com a empresa|com a agencia|da viagem|da passagem)\b|\bficar devendo\b/,
		0.95
	);
	scan(ctx, 'S07', /\bdivida\b/, 0.45);
	// descontos legais (INSS, VT) não são servidão por dívida
	for (let i = ctx.hits.length - 1; i >= n0; i--) {
		const h = ctx.hits[i];
		const near40 = around(ctx, h, 40, 40);
		if (legitDeduction.test(near40) && !/passage|viage|moradi|hosped|aloja/.test(near40))
			ctx.hits.splice(i, 1);
	}
	// a empresa "adianta" a viagem → também é viagem paga pela empresa (S05)
	if (ctx.hits.slice(n0).some((h) => /passage|viage|voo/.test(around(ctx, h, 20, 20)))) {
		hit(ctx, 'S05', 0.6, undefined, 'A empresa adianta a viagem e cobra depois.');
	}
}

// ─── S08 Retenção de documentos ───
function s08(ctx: DetectorContext) {
	scan(
		ctx,
		'S08',
		/\b(mande|envie|entregue|deixe|traga|passe|manda|deixa|entrega|envia|enviar|mandar|entregar)\b.{0,25}\b(o |seu |teu |os |seus )?(passaporte|documentos originais|rg original|carteira de trabalho original|documentos? (pessoais )?originais)\b/,
		0.85
	);
	scan(
		ctx,
		'S08',
		/\b(passaporte|documentos|rg|carteira de trabalho)s? (fica|ficam|ficara|ficarao|vai ficar|vao ficar|sera guardad[oa]|serao guardad[oa]s|fica guardad[oa]|ficam guardad[oa]s|fica retid[oa]|ficam retid[oa]s|fica com|ficam com|ficara com)\b/,
		0.9
	);
	scan(
		ctx,
		'S08',
		/\b(ficamos|guardamos|seguramos|retemos|recolhemos|ficaremos)( com)? (o |os |seu |seus |teu )?(passaporte|documentos)\b/,
		0.95
	);
	scan(
		ctx,
		'S08',
		/\b(nos|a gente|a empresa|a agencia) (cuida|cuidamos|resolve|resolvemos|providencia|providenciamos|tira|tiramos|faz|fazemos)( de| do| da| dos| o| a| os)? (seu |sua |teu )?(visto|passaporte|documentacao|documentos)\b/,
		0.55
	);
	scan(ctx, 'S08', /\b(foto|copia|scan|imagem|digitalizacao)( do| de)( seu)? passaporte\b/, 0.45);
}

// ─── S09 Fotos de corpo / sensuais ───
const PHOTO = String.raw`(fotos?|selfies?|videos?|book|ensaio|imagens?|registros?)`;
const BODY = String.raw`(corpo inteiro|de corpo|do corpo|corpo todo|biquini|biquinis|maio|lingerie|roupas? intimas?|calcinha|sutia|sensua(l|is)|sexy|ousad[ao]s?|nua|nuas|pelad[ao]s?|sem roupa|de costas|de lado|intimas?|provocantes?|de shortinho|trajes? de banho|roupa de praia|de top)`;
function s09(ctx: DetectorContext) {
	scan(ctx, 'S09', new RegExp(String.raw`\b${PHOTO}\b.{0,40}\b${BODY}\b`), 0.95);
	scan(ctx, 'S09', new RegExp(String.raw`\b${BODY}\b.{0,25}\b${PHOTO}\b`), 0.9);
	scan(ctx, 'S09', /\b(nudes|pack|conteudo adulto|conteudo intimo)\b/, 0.95);
	// "envie fotos" sem dizer quais: comum em vaga de modelo, mas merece conferência
	if (EXPOSURE_ROLES.test(ctx.kw))
		scan(ctx, 'S09', /\b(envie|mande|manda|envia)( \d+)? (suas |umas |algumas )?fotos\b/, 0.4);
}

// ─── S10 Aparência, idade, medidas ───
function s10(ctx: DetectorContext) {
	for (const a of ctx.facts.ages) {
		if (a.max === undefined || a.max > 40) continue;
		// faixa etária do Jovem Aprendiz (14–24) é exigência legal, não seleção por aparência
		if (ctx.facts.apprenticeship)
			hit(ctx, 'S10', 0.3, a, 'Faixa etária de programa de aprendizagem.');
		else
			hit(
				ctx,
				'S10',
				a.min !== undefined && a.min < 18 ? 0.6 : 0.75,
				a,
				'Restringe a idade das candidatas.'
			);
	}
	scan(ctx, 'S10', /\bboa aparencia\b/, 0.7);
	scan(
		ctx,
		'S10',
		/\b(bonit[ao]s|lind[ao]s|atraentes?|gatas|sarad[ao]s?|corpo (bonito|definido|em forma|escultural|bem feito)|magr[ao]s|magrinhas?|esbelt[ao]s?|curvilineas?|seios|bumbum|cintura fina|bem dotad[ao]s?)\b/,
		0.8
	);
	scan(
		ctx,
		'S10',
		/\b(altura (minima|de|acima)|acima de 1[.,]\d\d|1[.,][5-8]\d ?m\b|manequim \d{2}|peso (maximo|ate|entre)|medidas|busto|quadril|ate \d{2} ?kg)\b/,
		0.85
	);
	scan(ctx, 'S10', /\b(loiras?|morenas?|ruivas?|olhos claros|pele clara|mulatas?)\b/, 0.8);
	scan(ctx, 'S10', /\b(mocas|garotas|meninas|novas e bonitas|mulheres jovens)\b/, 0.6);
	scan(ctx, 'S10', /\bjovens\b/, 0.3);
}

// ─── S11 Modelo/dançarina/hostess/massagista no exterior ───
function s11(ctx: DetectorContext) {
	const roles = findAll(ctx.kw, EXPOSURE_ROLES).filter(
		(m) => !isNegated(ctx.kw, m.index!, m.index! + m[0].length)
	);
	if (!roles.length) return;
	const r = roles[0];
	const span = toOriginal(ctx.view.mapKeyword, ctx.view.original, r.index!, r.index! + r[0].length);
	const abroad = ctx.facts.places.find((p) => p.scope === 'exterior');
	const domestic = ctx.facts.places.find((p) => p.scope === 'outro-estado');
	if (abroad) {
		hit(ctx, 'S11', 0.9, span, `Função de “${r[0]}” com destino: ${abroad.name}.`);
		hit(ctx, 'S11', 0.9, abroad);
	} else if (domestic) hit(ctx, 'S11', 0.55, span, `Função de “${r[0]}” em outro estado.`);
	else if (/acompanhante|programa|dama de companhia|stripper|gogo/.test(r[0]))
		hit(ctx, 'S11', 0.45, span);
	else hit(ctx, 'S11', 0.3, span, 'Função frequentemente usada como fachada; confira o destino.');
}

// ─── S12 Sigilo / isolamento ───
function s12(ctx: DetectorContext) {
	const o = { negatable: false };
	scan(
		ctx,
		'S12',
		/\b(nao|nem) (conte|comente|fale|diga|avise|mostre|conta|comenta|fala|mostra|contar|comentar|falar|mostrar)\b.{0,30}\b(ninguem|familia|pais|mae|pai|namorad[oa]|marido|parentes|amig[oa]s|colegas|policia)\b/,
		0.9,
		o
	);
	scan(
		ctx,
		'S12',
		/\b(mantenha|manter|fique|guarde|guardar|seja)( isso| tudo)? (em )?(segredo|sigilo|discreta|discreto|entre nos)\b|\b(segredo|sigilo) (absoluto|total)\b|\bso entre nos\b|\bnosso segredo\b/,
		0.85,
		o
	);
	scan(
		ctx,
		'S12',
		/\b(apague|apaga|delete|deleta|apagar) (as |esta |essa |a |nossas? )?(mensage(m|ns)|conversas?|historico)\b/,
		0.8,
		o
	);
	scan(
		ctx,
		'S12',
		/\b(sem (os )?(pais|familia) saber(em)?|sem autorizacao dos pais|nao precisa (de )?autorizacao dos pais|sem avisar (ninguem|a familia|seus pais))\b/,
		0.9,
		o
	);
	const n0 = ctx.hits.length;
	scan(ctx, 'S12', /\b(sigil(o|osa|oso)|confidencial|discricao)\b/, 0.45);
	for (let i = ctx.hits.length - 1; i >= n0; i--) {
		const h = ctx.hits[i];
		if (
			/(dados|informacoes|curriculo|lgpd|candidatura|privacidade|processo seletivo)/.test(
				around(ctx, h, 45, 45)
			)
		)
			ctx.hits.splice(i, 1);
	}
}

// ─── S13 Menores de 18 ───
function s13(ctx: DetectorContext) {
	const appr = ctx.facts.apprenticeship;
	const base = (c: number) => (appr ? Math.min(c, 0.35) : c);
	const apprNote = appr
		? 'Menciona aprendizagem/estágio, que admite adolescentes — confira se é programa oficial.'
		: undefined;
	for (const a of ctx.facts.ages) {
		const minor = (a.min !== undefined && a.min < 18) || (a.max !== undefined && a.max < 18);
		if (minor) hit(ctx, 'S13', base(0.9), a, apprNote ?? 'Aceita pessoas com menos de 18 anos.');
	}
	scan(
		ctx,
		'S13',
		/\b(aceitamos|aceita|aceito|pode ser|podem ser|tambem|inclusive|ok|sem problema|serve)\b.{0,20}\b(menor(es)?( de idade)?|de menor)\b|\b(menor(es)? de idade|de menor)\b.{0,25}\b(aceit|pode|podem|ok|tambem|sem problema|bem[- ]vind|serve)/,
		base(0.9),
		{ note: apprNote }
	);
	scan(ctx, 'S13', /\b(adolescentes?|de menor)\b/, base(0.6), { note: apprNote });
	scan(ctx, 'S13', /\bmenor(es)? de idade\b/, 0.35);
	scan(
		ctx,
		'S13',
		/\b(de|com|tem|tenha|tiver|tendo) (1[0-7]) anos\b(?! de (experiencia|empresa|mercado|casa|atuacao))/,
		base(0.85),
		{ note: apprNote }
	);
	scan(
		ctx,
		'S13',
		/\b(sem autorizacao dos pais|nao precisa (de )?autorizacao dos pais|sem os pais saberem)\b/,
		0.95,
		{ negatable: false }
	);
}

// ─── S14 Sem CNPJ / empresa não identificada ───
function s14(ctx: DetectorContext) {
	const { facts } = ctx;
	scan(
		ctx,
		'S14',
		/\b(nao|sem) (informamos|informa|divulgamos|divulga|temos|tem|possui|possuimos|passamos|fornecemos) (o |nosso )?cnpj\b|\bcnpj (so|somente|apenas) (depois|apos|na contratacao|pessoalmente)\b/,
		0.95,
		{ negatable: false }
	);
	if (facts.cnpjs.length || ctx.hits.some((h) => h.id === 'S14')) return;
	let c = 0.75;
	const notes: string[] = [];
	if (facts.companyMarkers.length) {
		c -= 0.2;
		notes.push(`cita razão social (“${facts.companyMarkers[0].raw}”)`);
	}
	const formal =
		facts.contacts.emails.some((e) => e.corporate) ||
		facts.contacts.urls.some((u) => u.kind === 'site' || u.kind === 'plataforma-vagas');
	if (formal) {
		c -= 0.2;
		notes.push('tem site ou e-mail próprio');
	}
	if (facts.contacts.address.length) c -= 0.1;
	hit(
		ctx,
		'S14',
		Math.max(c, 0.3),
		undefined,
		`Nenhum CNPJ encontrado no texto${notes.length ? ` (mas ${notes.join(' e ')})` : ''}.`
	);
}

// ─── S15 CNPJ inválido ───
function s15(ctx: DetectorContext) {
	for (const c of ctx.facts.cnpjs) {
		if (c.valid) continue;
		const why =
			c.digits.length === 11
				? 'tem 11 dígitos — parece um CPF, não um CNPJ'
				: c.digits.length !== 14
					? `tem ${c.digits.length} caracteres (o CNPJ tem 14)`
					: 'os dígitos verificadores não conferem';
		hit(ctx, 'S15', 0.95, c, `CNPJ ${c.raw}: ${why}.`);
	}
}

// ─── S16 Contato só por mensagem/rede social ───
function s16(ctx: DetectorContext) {
	const k = ctx.facts.contacts;
	const informal =
		k.messaging.length +
		k.phones.filter((p) => p.mobile).length +
		k.urls.filter((u) => u.kind === 'rede-social' || u.kind === 'encurtador').length;
	if (!informal) return;
	const formal =
		k.emails.some((e) => e.corporate) ||
		k.urls.some((u) => u.kind === 'site' || u.kind === 'plataforma-vagas') ||
		k.address.length > 0 ||
		k.phones.some((p) => !p.mobile);
	const only =
		/\b(somente|so|apenas|exclusivamente|unicamente)\b.{0,20}\b(pelo|por|no|via)\b.{0,6}\b(whats|zap|wpp|telegram|insta|direct|dm|privado|pv|inbox)/.test(
			ctx.kw
		);
	const span = k.messaging[0];
	const channels = [...new Set(k.messaging.map((m) => m.channel))].join(', ');
	if (!formal) {
		hit(
			ctx,
			'S16',
			only ? 0.9 : k.emails.length ? 0.6 : 0.85,
			span,
			`Canais encontrados: ${channels || 'telefone celular'}; nenhum e-mail corporativo, site ou endereço.`
		);
	} else if (only) {
		hit(ctx, 'S16', 0.7, span, 'Pede contato exclusivamente por mensagem privada.');
	}
	const intl = k.phones.find((p) => p.international);
	if (intl) hit(ctx, 'S16', 0.5, undefined, `Telefone estrangeiro para contato: ${intl.value}.`);
}

// ─── S17 Intermediário informal ───
function s17(ctx: DetectorContext) {
	scan(ctx, 'S17', /\b(agenciador(a|es|as)?|aliciador(a)?|intermediari[ao]s?|olheir[ao]s?)\b/, 0.8);
	scan(
		ctx,
		'S17',
		/\b(minha|meu|uma|um) (prima|primo|amiga|amigo|tia|tio|irma|irmao|conhecida|conhecido|vizinha|vizinho|colega|cunhada|madrinha|sobrinha)\b.{0,40}\b(ja )?(trabalha|trabalhou|foi|esta|mora|vive|indicou|indica|conseguiu|arrumou|ganha)\b/,
		0.85
	);
	scan(
		ctx,
		'S17',
		/\b(conheco|conhecemos) (o|a) (dono|dona|patrao|patroa|gerente|contratante)\b|\b(eu )?te indico\b|\bposso te indicar\b|\barrumo (uma )?vaga\b|\bconsigo (uma )?vaga (pra|para) (voce|vc)\b|\btenho um contato (la|no exterior|fora)\b/,
		0.7
	);
	scan(ctx, 'S17', /\bindicacao de (uma |um )?(amiga|amigo|conhecida|conhecido)\b/, 0.75);
}

// ─── S18 Taxa antecipada ───
function s18(ctx: DetectorContext) {
	for (const m of ctx.facts.money) {
		if (m.kind === 'cobranca' && !m.negated) hit(ctx, 'S18', 0.9, m, `Cobrança de ${m.raw}.`);
	}
	scan(
		ctx,
		'S18',
		/\b(taxa|valor|custo|pagamento|investimento)( de| da| do)? (inscricao|cadastro|cadastramento|matricula|reserva|documentacao|uniforme|curso|treinamento|exames?|cracha|kit|material|seguro|visto|ativacao|adesao|processamento|agenciamento|book|ensaio|entrevista|admissao|contratacao|vaga)\b/,
		0.85
	);
	scan(
		ctx,
		'S18',
		/\b(pague|pagar|deposite|depositar|faca um pix|fazer um pix|envie um pix|mande um pix|transfira|transferir|invista|investir)\b.{0,30}\b(garantir|reservar|liberar|confirmar|cadastrar|ativar|participar|comecar|receber|entrar)\b/,
		0.85
	);
	scan(
		ctx,
		'S18',
		/\b(curso|treinamento|uniforme|kit|book|exame)s? (obrigatori[oa]s? e pag|pago pelo candidat|por sua conta|por conta (da|do) candidat)/,
		0.8
	);
	scan(ctx, 'S18', /\b(caucao|taxa de adesao|investimento inicial)\b/, 0.8);
	if (!ctx.hits.some((h) => h.id === 'S18')) {
		for (const m of findAll(ctx.kw, /\bpix\b/)) {
			const s = m.index!;
			if (
				near(
					ctx.kw,
					s,
					s + 3,
					/(salario|receba|recebe|pagamento (semanal|diario|mensal)|pagamos)/,
					30
				)
			)
				continue;
			if (isNegated(ctx.kw, s, s + 3)) continue;
			hit(
				ctx,
				'S18',
				0.35,
				toOriginal(ctx.view.mapKeyword, ctx.view.original, s, s + 3),
				'Menciona Pix sem dizer para quê.'
			);
		}
	}
}

// ─── S19 Dados bancários, senhas, códigos ───
function s19(ctx: DetectorContext) {
	scan(
		ctx,
		'S19',
		/\b(senhas?|codigo de (verificacao|seguranca|confirmacao|acesso|\d digitos)|codigo (que|q) (chegou|chegar|recebeu|receber|vai chegar)|codigo (do|de|por) (sms|whats ?app|banco)|token|cvv|cvc)\b/,
		0.9
	);
	scan(
		ctx,
		'S19',
		/\b(foto|fotos|imagem|copia|numero|dados|frente e verso) (do|dos|de) (seu |seus )?(cartao|cartoes)\b/,
		0.9
	);
	scan(
		ctx,
		'S19',
		/\b(app|aplicativo|login) do (seu )?banco\b|\bacesso (a|ao) (sua )?conta\b/,
		0.85
	);
	const n0 = ctx.hits.length;
	scan(
		ctx,
		'S19',
		/\b(dados bancarios|conta bancaria|agencia e conta|numero da conta|chave pix)\b/,
		0.6
	);
	for (let i = ctx.hits.length - 1; i >= n0; i--) {
		const h = ctx.hits[i];
		if (
			/(apos|depois d[ae]|na|no ato da) (contratacao|admissao|assinatura)/.test(
				around(ctx, h, 40, 40)
			)
		)
			ctx.hits.splice(i, 1);
	}
}

// ─── S20 Moradia no local ───
function s20(ctx: DetectorContext) {
	scan(
		ctx,
		'S20',
		/\b(mora|morar|morando|reside|residir|residira|dorme|dormir|dormira|vive|viver|pernoita|pernoitar) (no|na|em) (propri[oa] )?(local|casa|trabalho|emprego|servico|fazenda|boate|estabelecimento|clube|empresa|alojamento|residencia)\b/,
		0.8
	);
	scan(
		ctx,
		'S20',
		/\b(moradia|alojamento|quarto|dormitorio|acomodacao) (no|na) (proprio )?(local|trabalho|empresa|fazenda|casa|estabelecimento|boate|clube)\b|\bpara dormir no (emprego|servico)\b/,
		0.85
	);
	const n0 = ctx.hits.length;
	scan(
		ctx,
		'S20',
		/\b(com|oferecemos|oferece|incluso|inclusa|damos) (moradia|alojamento|casa|quarto)\b/,
		0.5
	);
	for (let i = ctx.hits.length - 1; i >= n0; i--) {
		const h = ctx.hits[i];
		if (
			/(endereco|quarto individual|banheiro|contrato de locacao|auxilio[- ]moradia)/.test(
				around(ctx, h, 0, 80)
			)
		)
			ctx.hits.splice(i, 1);
	}
}

// ─── S21 Sem contrato / visto ───
function s21(ctx: DetectorContext) {
	const o = { negatable: false };
	scan(
		ctx,
		'S21',
		/\b(sem|nao (tem|ha|precisa|precisa de|exige|e necessario|assinamos|assina|fazemos|faz|tera)|nao e preciso) (de )?(contrato|carteira assinada|registro( em carteira)?|carteira|clt|visto( de trabalho)?|documentacao de trabalho|papelada|vinculo)\b/,
		0.85,
		o
	);
	scan(
		ctx,
		'S21',
		/\b(viaja|vai|entra|entrar|ir|embarca|embarcar|viajar|viajara|entrando)\b.{0,15}\bcomo turista\b|\bvisto de turista\b|\bvisto (de )?turismo\b|\bregulariza(mos|r|remos)? (la|depois|quando chegar)\b|\ba gente regulariza\b|\b(documentacao|papeis|visto) (a gente |nos )?(resolve|resolvemos|ajeita|ajeitamos|arruma|arrumamos) (la|depois)\b/,
		0.9,
		o
	);
	scan(
		ctx,
		'S21',
		/\b(trabalho informal|pagamento por fora|sem registro|na informalidade|contrato verbal|de boca)\b/,
		0.7,
		o
	);
	scan(
		ctx,
		'S21',
		/\bcontrato (so|somente|apenas) (la|no destino|quando chegar|depois)\b|\bnem contrato\b|\bcontrato (fica|so) (para|pra) depois\b/,
		0.85,
		o
	);
}

export const DETECTORS: Record<SignalId, (ctx: DetectorContext) => void> = {
	S01: s01,
	S02: s02,
	S03: s03,
	S04: s04,
	S05: s05,
	S06: s06,
	S07: s07,
	S08: s08,
	S09: s09,
	S10: s10,
	S11: s11,
	S12: s12,
	S13: s13,
	S14: s14,
	S15: s15,
	S16: s16,
	S17: s17,
	S18: s18,
	S19: s19,
	S20: s20,
	S21: s21
};

/** Ordem de execução (S07 alimenta S05). */
export const DETECTOR_ORDER: SignalId[] = [
	'S01',
	'S02',
	'S03',
	'S04',
	'S07',
	'S05',
	'S06',
	'S08',
	'S09',
	'S10',
	'S11',
	'S12',
	'S13',
	'S14',
	'S15',
	'S16',
	'S17',
	'S18',
	'S19',
	'S20',
	'S21'
];
