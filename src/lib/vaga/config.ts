import type { Band, SignalDef, SignalId } from './types';

/**
 * Base de sinais — transcrição da aba "Sinais" de Vaga_Certa_Sinais_e_Pontuacao.xlsx.
 * Pesos e lista são proposta inicial, a validar pelo comitê de curadoria e por testes
 * com anúncios rotulados. Para recalibrar, altere apenas este arquivo.
 */
export const SIGNALS: readonly SignalDef[] = [
	{
		id: 'S01',
		category: 'Proposta',
		title: 'Salário muito acima do mercado para a função',
		example: '"Ganhe R$ 15 mil por mês como recepcionista"',
		weight: 3,
		critical: false,
		reference: 'Alerta do Itamaraty (fev/2026): salário alto como isca',
		why: 'Um salário muito maior do que a função costuma pagar é usado como isca.'
	},
	{
		id: 'S02',
		category: 'Proposta',
		title: 'Não exige experiência nem qualificação',
		example: '"Não precisa de experiência, nós treinamos"',
		weight: 2,
		critical: false,
		reference: 'Cartilhas MJSP de enfrentamento ao tráfico',
		why: 'Sem requisitos, qualquer pessoa “serve” — combinado com outros sinais, isso merece cuidado.'
	},
	{
		id: 'S03',
		category: 'Proposta',
		title: 'Urgência ou pressão para decidir rápido',
		example: '"Vaga só até hoje", "embarque na próxima semana"',
		weight: 2,
		critical: false,
		reference: 'Alerta do Itamaraty (fev/2026): contratação rápida',
		why: 'A pressa impede você de checar a empresa e conversar com alguém de confiança.'
	},
	{
		id: 'S04',
		category: 'Proposta',
		title: 'Função descrita de forma vaga',
		example: '"Trabalho em casa de família/eventos, detalhes no privado"',
		weight: 2,
		critical: false,
		reference: 'Cartilhas MJSP de enfrentamento ao tráfico',
		why: 'Uma vaga real diz o que você vai fazer. Esconder a função é um sinal de alerta.'
	},
	{
		id: 'S05',
		category: 'Viagem',
		title: 'Trabalho em outro estado ou país com passagem paga pela empresa',
		example: '"Passagem e hospedagem por nossa conta"',
		weight: 4,
		critical: false,
		reference: 'Alerta do Itamaraty (fev/2026); Operação Catwalk (PF, dez/2024)',
		why: 'Longe de casa, você fica mais dependente de quem pagou a viagem.'
	},
	{
		id: 'S06',
		category: 'Viagem',
		title: 'Destino com alerta oficial de tráfico',
		example: 'Vagas no Camboja, Mianmar ou Tailândia',
		weight: 3,
		critical: false,
		reference: 'Alerta do Itamaraty (fev/2026) sobre o Sudeste Asiático',
		why: 'O Itamaraty alertou para brasileiros aliciados com falsas vagas nesse destino.'
	},
	{
		id: 'S07',
		category: 'Viagem',
		title: 'Custos de viagem ou moradia descontados do salário (dívida)',
		example: '"A passagem você paga com o primeiro salário"',
		weight: 5,
		critical: true,
		reference: 'Indicadores de trabalho forçado da OIT (servidão por dívida)',
		why: 'Começar o trabalho devendo é como a servidão por dívida prende a pessoa.'
	},
	{
		id: 'S08',
		category: 'Viagem',
		title: 'Empresa fica com passaporte ou documentos',
		example: '"Mande seu passaporte, nós cuidamos do visto"',
		weight: 5,
		critical: true,
		reference: 'Indicadores de trabalho forçado da OIT (retenção de documentos)',
		why: 'Sem seus documentos você não consegue ir embora. Nunca entregue os originais.'
	},
	{
		id: 'S09',
		category: 'Exposição pessoal',
		title: 'Pede fotos de corpo, de biquíni ou sensuais',
		example: '"Envie fotos de corpo inteiro e de biquíni"',
		weight: 5,
		critical: true,
		reference: 'Operação Catwalk (PF, dez/2024)',
		why: 'Fotos do corpo não fazem parte de uma seleção profissional.'
	},
	{
		id: 'S10',
		category: 'Exposição pessoal',
		title: 'Exige aparência física, idade ou medidas',
		example: '"Moças de 18 a 25 anos, boa aparência, magras"',
		weight: 3,
		critical: false,
		reference: 'Operação Catwalk (PF, dez/2024)',
		why: 'Escolher pela aparência ou pela idade é comum em aliciamento.'
	},
	{
		id: 'S11',
		category: 'Exposição pessoal',
		title: 'Vaga de modelo, dançarina, hostess ou massagista no exterior',
		example: '"Modelos para eventos em Dubai"',
		weight: 3,
		critical: false,
		reference: 'Operação Catwalk (PF, dez/2024)',
		why: 'São as funções mais usadas como fachada em casos de tráfico para exploração.'
	},
	{
		id: 'S12',
		category: 'Exposição pessoal',
		title: 'Pede sigilo ou para não contar à família',
		example: '"Não comente com ninguém até embarcar"',
		weight: 5,
		critical: true,
		reference: 'Indicadores de trabalho forçado da OIT (isolamento)',
		why: 'Pedir segredo serve para isolar você de quem poderia ajudar.'
	},
	{
		id: 'S13',
		category: 'Exposição pessoal',
		title: 'Aceita ou procura menores de 18 anos',
		example: '"A partir de 16 anos"',
		weight: 5,
		critical: true,
		reference: 'ECA; Lei 13.344/2016 (tráfico de pessoas)',
		why: 'Fora do programa Jovem Aprendiz, recrutar menores para essas vagas é ilegal.'
	},
	{
		id: 'S14',
		category: 'Empregador',
		title: 'Não informa CNPJ ou a empresa não é encontrada',
		example: 'Só um nome fantasia, sem site ou registro',
		weight: 3,
		critical: false,
		reference: 'Checagem de CNPJ na Receita Federal',
		why: 'Sem CNPJ não dá para conferir se a empresa existe.'
	},
	{
		id: 'S15',
		category: 'Empregador',
		title: 'CNPJ inválido ou de atividade sem relação com a vaga',
		example: 'CNPJ de comércio de roupas oferecendo vaga de modelo no exterior',
		weight: 3,
		critical: false,
		reference: 'Checagem de CNPJ na Receita Federal',
		why: 'O número informado não passa na verificação da Receita Federal.'
	},
	{
		id: 'S16',
		category: 'Empregador',
		title: 'Contato só por WhatsApp, Telegram ou rede social',
		example: 'Sem e-mail corporativo, site ou endereço',
		weight: 2,
		critical: false,
		reference: 'Alerta do Itamaraty (fev/2026): recrutamento por redes sociais',
		why: 'Sem um canal oficial, fica difícil saber quem está do outro lado.'
	},
	{
		id: 'S17',
		category: 'Empregador',
		title: 'Intermediário informal ("agenciador" ou "amiga que já foi")',
		example: '"Minha prima já trabalha lá e indica você"',
		weight: 2,
		critical: false,
		reference: 'Cartilhas MJSP de enfrentamento ao tráfico',
		why: 'Muitos aliciamentos começam com alguém próximo intermediando a vaga.'
	},
	{
		id: 'S18',
		category: 'Pagamento',
		title: 'Cobra taxa antecipada (inscrição, curso, uniforme, documentos)',
		example: '"Taxa de cadastro de R$ 150 via PIX"',
		weight: 3,
		critical: false,
		reference: 'Padrão de golpe de emprego',
		why: 'Empresa séria não cobra para você conseguir a vaga.'
	},
	{
		id: 'S19',
		category: 'Pagamento',
		title: 'Pede dados bancários, senhas ou códigos antes da contratação',
		example: '"Mande foto do cartão para cadastrar o salário"',
		weight: 3,
		critical: false,
		reference: 'Padrão de golpe de emprego',
		why: 'Senhas, códigos e foto do cartão nunca são necessários para uma seleção.'
	},
	{
		id: 'S20',
		category: 'Condições',
		title: 'Moradia no local de trabalho, sem detalhes',
		example: '"Você mora na casa onde vai trabalhar"',
		weight: 2,
		critical: false,
		reference: 'Indicadores de trabalho forçado da OIT (condições de vida)',
		why: 'Morar no trabalho dificulta sair e pedir ajuda.'
	},
	{
		id: 'S21',
		category: 'Condições',
		title: 'Sem contrato formal, carteira assinada ou visto de trabalho',
		example: '"Viaja como turista e a gente regulariza lá"',
		weight: 3,
		critical: false,
		reference: 'Indicadores de trabalho forçado da OIT (engano)',
		why: 'Sem contrato ou visto de trabalho você fica sem proteção legal.'
	}
] as const;

export const SIGNAL_BY_ID = Object.fromEntries(SIGNALS.map((s) => [s.id, s])) as Record<
	SignalId,
	SignalDef
>;

/** Aba "Método", faixas de risco (células amarelas). */
export const BANDS: readonly Band[] = [
	{
		level: 'baixo',
		min: 0,
		action:
			'Não encontramos sinais relevantes. Confira o CNPJ e nunca entregue documentos ou dinheiro antes de assinar contrato. Veja cursos gratuitos para a função.'
	},
	{
		level: 'atencao',
		min: 4,
		action:
			'Há sinais de alerta. Peça CNPJ, contrato e endereço antes de seguir. Converse com alguém de confiança. Veja vagas verificadas no SINE/IDT.'
	},
	{
		level: 'alto',
		min: 8,
		action:
			'Não aceite nem envie documentos ou fotos. Ligue para o Disque 100 ou o Ligue 180 (gratuitos, 24h) e procure a rede de proteção.'
	}
];

export interface EngineOptions {
	bands: readonly Band[];
	/** Confiança mínima para o sinal contar pontos. */
	presentThreshold: number;
	/** Confiança mínima para aparecer como "para conferir" (sem pontos). */
	reviewThreshold: number;
	/** Ano de referência para converter "nascidas em 2010" em idade. */
	currentYear: number;
	/** Peso extra por sinal crítico dentro da faixa Alto (só afeta a nota 64–90). */
	criticalBoost: number;
	/** Peso extra quando a combinação viagem + exposição pessoal aparece. */
	comboBoost: number;
}

export const DEFAULT_OPTIONS: EngineOptions = {
	bands: BANDS,
	presentThreshold: 0.5,
	reviewThreshold: 0.3,
	currentYear: new Date().getFullYear(),
	criticalBoost: 3,
	comboBoost: 3
};

/** Faixas da nota final 10–90, uma por nível, para a nota sempre concordar com o nível. */
export const SCORE_RANGES = {
	baixo: [10, 36],
	atencao: [37, 63],
	alto: [64, 90]
} as const;

/**
 * Câmbio aproximado para comparar salários em moeda estrangeira.
 * Só serve para ordem de grandeza; não precisa ser atualizado com frequência.
 */
export const FX_TO_BRL = { BRL: 1, USD: 5.4, EUR: 5.9, GBP: 6.9, AED: 1.47 } as const;

/**
 * Salário mensal de referência (R$) por família de funções.
 * Valores aproximados de mercado para nível inicial — a calibrar com dados do CAGED/SINE.
 * S01 dispara quando o valor anunciado passa de ~2,2× a referência.
 */
export const ROLES: readonly { id: string; label: string; pattern: RegExp; ref: number }[] = [
	{
		id: 'recepcao',
		label: 'rotinas administrativas',
		pattern: /\brecepcionist[ao]s?\b/,
		ref: 2100
	},
	{
		id: 'administrativo',
		label: 'rotinas administrativas',
		pattern: /\b(auxiliar|assistente) administrativ[ao]|\bsecretari[ao]\b|\bescritorio\b/,
		ref: 2300
	},
	{
		id: 'comercio',
		label: 'atendimento e comércio',
		pattern:
			/\b(atendentes?|atendimento ao (cliente|publico)|vendedor(a|as|es)?|caixa de (loja|supermercado)|operador(a|as|es)? de caixa|repositor(a|as|es)?|estoquistas?)\b/,
		ref: 1950
	},
	{
		id: 'telemarketing',
		label: 'atendimento e comércio',
		pattern: /\b(telemarketing|operador[a]? de (atendimento|telemarketing)|call ?center)\b/,
		ref: 1750
	},
	{
		id: 'cuidado',
		label: 'cuidados e acompanhamento',
		pattern: /\b(baba|babas|cuidador[a]?|cuidadores|acompanhante de idos[oa]s?)\b/,
		ref: 2000
	},
	{
		id: 'domestico',
		label: 'serviços domésticos',
		pattern:
			/\b(domesticas?|empregada|diaristas?|governantas?|caseir[ao]s?|servicos gerais|camareiras?|faxineiras?|auxiliar(es)? de limpeza)\b/,
		ref: 1850
	},
	{
		id: 'alimentacao',
		label: 'alimentação e hotelaria',
		pattern:
			/\b(garcom|garcons|garconetes?|bartenders?|barman|cozinheir[ao]s?|(auxiliar|ajudante)(es)? de cozinha|copeir[ao]s?|chapeir[ao]s?)\b/,
		ref: 2000
	},
	{
		id: 'entretenimento',
		label: 'eventos e entretenimento',
		pattern:
			/\b(modelos?|dancarinas?|dancarinos?|bailarinas?|hostess|promoter|recepcionista de eventos|gogo|animadora)\b/,
		ref: 2600
	},
	{
		id: 'massagem',
		label: 'bem-estar',
		pattern: /\b(massagistas?|massoterapeutas?|terapeuta corporal)\b/,
		ref: 2300
	},
	{
		id: 'rural',
		label: 'trabalho rural',
		pattern: /\b(colheita|lavoura|trabalhador rural|fazenda|roca|garimpo|carvoaria|desmatamento)\b/,
		ref: 1850
	},
	{
		id: 'construcao',
		label: 'construção civil',
		pattern:
			/\b(pedreir[ao]s?|serventes? de obras?|ajudantes? de obras?|(trabalho|trabalhar|vagas?) (em|na|nas) obras?|construcao civil|carpinteiros?|eletricistas?|pintor(es)?)\b/,
		ref: 2400
	},
	{
		id: 'costura',
		label: 'confecção',
		pattern: /\b(costureir[ao]s?|oficina de costura)\b/,
		ref: 1900
	},
	{
		id: 'motorista',
		label: 'transporte',
		pattern: /\b(motorista|entregador|motoboy)\b/,
		ref: 2800
	},
	{
		id: 'saude',
		label: 'saúde',
		pattern: /\b(tecnic[ao] de enfermagem|enfermeir[ao])\b/,
		ref: 3500
	},
	{
		id: 'ensino',
		label: 'educação',
		pattern: /\b(professor[a]?|professores|monitor[a]? escolar)\b/,
		ref: 3800
	},
	{
		id: 'ti',
		label: 'tecnologia',
		pattern:
			/\b(desenvolvedor[a]?|programador[a]?|engenheir[ao] de software|analista de (sistemas|dados)|cientista de dados)\b/,
		ref: 7500
	},
	{ id: 'analista', label: 'rotinas administrativas', pattern: /\banalista\b/, ref: 5000 },
	{
		id: 'gestao',
		label: 'gestão',
		pattern: /\b(gerente|coordenador[a]?|supervisor[a]?|diretor[a]?)\b/,
		ref: 8000
	},
	{ id: 'engenharia', label: 'engenharia', pattern: /\bengenheir[ao]\b/, ref: 9000 },
	{ id: 'medicina', label: 'saúde', pattern: /\bmedic[ao]s?\b/, ref: 18000 }
];

/** Referência quando nenhuma função é reconhecida. */
export const DEFAULT_REFERENCE_SALARY = 2600;

/** Funções de fachada da Operação Catwalk (S11). */
export const EXPOSURE_ROLES =
	/\b(modelos?|dancarinas?|bailarinas?|hostess|hostesses|massagistas?|massoterapeutas?|acompanhantes?|dama de companhia|garotas? de programa|gogo ?girls?|strippers?|promoters?|recepcionistas? de (boate|casa noturna|clube)|animadoras?|atrizes)\b/;

export interface PlaceDef {
	name: string;
	pattern: RegExp;
	scope: 'exterior' | 'outro-estado';
	officialAlert?: boolean;
}

/**
 * Destinos. officialAlert = alerta do Itamaraty (fev/2026) sobre o Sudeste Asiático
 * (centros de golpe com trabalho forçado). Ajuste conforme novos alertas.
 */
export const PLACES: readonly PlaceDef[] = [
	// Sudeste Asiático — alerta oficial
	{
		name: 'Camboja',
		pattern: /\b(camboja|cambodia|phnom penh|sihanoukville|bavet)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Mianmar',
		pattern: /\b(mianmar|myanmar|birmania|myawaddy|kk park|shwe kokko)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Tailândia',
		pattern: /\b(tailandia|thailand|bangkok|mae sot|pattaya|phuket)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Laos',
		pattern: /\b(laos|triangulo dourado|golden triangle)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Filipinas',
		pattern: /\b(filipinas|philippines|manila)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Vietnã',
		pattern: /\b(vietna|vietnam|vietname)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	{
		name: 'Malásia',
		pattern: /\b(malasia|malaysia|kuala lumpur)\b/,
		scope: 'exterior',
		officialAlert: true
	},
	// Demais destinos no exterior
	{
		name: 'Emirados Árabes',
		pattern: /\b(dubai|abu dhabi|emirados( arabes)?|uae|sharjah)\b/,
		scope: 'exterior'
	},
	{
		name: 'Oriente Médio',
		pattern:
			/\b(catar|qatar|doha|arabia saudita|riad|kuwait|bahrein|bahrain|oma|oman|libano|jordania|israel|turquia|istambul|istanbul)\b/,
		scope: 'exterior'
	},
	{
		name: 'Europa',
		pattern:
			/\b(europa|portugal|lisboa|espanha|madri|madrid|barcelona|italia|milao|roma|franca|paris|suica|genebra|zurique|alemanha|berlim|inglaterra|londres|reino unido|irlanda|dublin|holanda|amsterda|belgica|grecia|chipre|malta|polonia|servia|russia|austria|luxemburgo)\b/,
		scope: 'exterior'
	},
	{
		name: 'Ásia',
		pattern:
			/\b(japao|toquio|china|macau|hong kong|coreia|seul|singapura|indonesia|bali|india|asia)\b/,
		scope: 'exterior'
	},
	{
		name: 'Américas',
		pattern:
			/\b(estados unidos|eua|miami|orlando|nova york|new york|canada|mexico|cancun|chile|argentina|buenos aires|paraguai|bolivia|peru|suriname|guiana( francesa)?|panama|republica dominicana)\b/,
		scope: 'exterior'
	},
	{
		name: 'África',
		pattern: /\b(angola|luanda|africa do sul|nigeria|egito|marrocos|cabo verde|mocambique)\b/,
		scope: 'exterior'
	},
	{
		name: 'Exterior',
		pattern:
			/\b(exterior|fora do (pais|brasil)|outro pais|internacional|oriente medio|europeu|europeia)\b/,
		scope: 'exterior'
	},
	// Brasil — outro estado
	{
		name: 'Outro estado',
		pattern:
			/\b(outro estado|outra cidade|outra regiao|interior de|mudar de cidade|mudar de estado)\b/,
		scope: 'outro-estado'
	},
	{
		name: 'Outro estado',
		pattern:
			/\b(sao paulo|rio de janeiro|minas gerais|santa catarina|rio grande do sul|parana|mato grosso( do sul)?|goias|tocantins|amazonas|manaus|roraima|rondonia|acre|amapa|estado do para|belem do para|no para\b|maranhao|piaui|bahia|pernambuco|recife|paraiba|alagoas|sergipe|rio grande do norte|espirito santo|distrito federal|brasilia)\b/,
		scope: 'outro-estado'
	}
];
