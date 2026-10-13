export type Category =
	'Proposta' | 'Viagem' | 'Exposição pessoal' | 'Empregador' | 'Pagamento' | 'Condições';

export type SignalId =
	| 'S01'
	| 'S02'
	| 'S03'
	| 'S04'
	| 'S05'
	| 'S06'
	| 'S07'
	| 'S08'
	| 'S09'
	| 'S10'
	| 'S11'
	| 'S12'
	| 'S13'
	| 'S14'
	| 'S15'
	| 'S16'
	| 'S17'
	| 'S18'
	| 'S19'
	| 'S20'
	| 'S21';

/** Uma linha da aba "Sinais" da planilha Vaga Certa. */
export interface SignalDef {
	id: SignalId;
	category: Category;
	title: string;
	example: string;
	/** Peso de 1 (fraco) a 5 (forte). */
	weight: number;
	/** Um sinal crítico classifica a vaga como risco alto sozinho. */
	critical: boolean;
	reference: string;
	/** Explicação curta, em linguagem simples, mostrada à usuária. */
	why: string;
}

export type Level = 'baixo' | 'atencao' | 'alto';

export interface Band {
	level: Level;
	/** Soma mínima de pesos para entrar na faixa (aba "Método", coluna B). */
	min: number;
	action: string;
}

/**
 * Frase do anúncio original que comprova um sinal. `parts` alterna texto comum e trechos
 * destacados (mark = true); vários trechos da mesma frase saem numa única citação.
 */
export interface Evidence {
	start: number;
	end: number;
	parts: { text: string; mark: boolean }[];
}

export interface Hit {
	id: SignalId;
	/** 0–1. Quão forte é a evidência deste trecho. */
	confidence: number;
	start: number;
	end: number;
	note?: string;
}

export type SignalStatus = 'presente' | 'conferir';

export interface SignalResult {
	signal: SignalDef;
	status: SignalStatus;
	confidence: number;
	/** Pontos que o sinal soma (peso se presente; 0 se só "para conferir"). */
	points: number;
	evidence: Evidence[];
	notes: string[];
}

export interface Money {
	start: number;
	end: number;
	raw: string;
	amount: number;
	currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'AED';
	period: 'mes' | 'semana' | 'dia' | 'hora' | 'ano' | 'desconhecido';
	/** Valor convertido para reais por mês (aproximado). */
	monthlyBRL: number;
	kind: 'remuneracao' | 'cobranca';
	upTo: boolean;
	/** Cobrança negada no texto ("não cobramos taxa de R$ 50"). */
	negated: boolean;
}

export interface AgeRule {
	start: number;
	end: number;
	raw: string;
	min?: number;
	max?: number;
}

export interface Cnpj {
	start: number;
	end: number;
	raw: string;
	digits: string;
	valid: boolean;
	alphanumeric: boolean;
}

export interface Place {
	start: number;
	end: number;
	name: string;
	scope: 'exterior' | 'outro-estado';
	officialAlert: boolean;
}

export interface Contacts {
	emails: { value: string; corporate: boolean }[];
	urls: { value: string; kind: 'site' | 'rede-social' | 'plataforma-vagas' | 'encurtador' }[];
	phones: { value: string; mobile: boolean; international: boolean }[];
	messaging: { start: number; end: number; channel: string }[];
	address: { start: number; end: number; raw: string }[];
}

export interface Role {
	id: string;
	label: string;
	referenceSalary: number;
	start: number;
	end: number;
}

export interface Facts {
	money: Money[];
	ages: AgeRule[];
	cnpjs: Cnpj[];
	places: Place[];
	contacts: Contacts;
	roles: Role[];
	companyMarkers: { start: number; end: number; raw: string }[];
	apprenticeship: boolean;
}

export interface Escalation {
	rule: 'sinal-critico' | 'viagem-e-exposicao';
	label: string;
	signals: SignalId[];
}

export interface Analysis {
	/** Nota de risco entre 10 (sem sinais) e 90 (risco extremo). */
	score: number;
	level: Level;
	/** Soma dos pesos dos sinais presentes (aba "Avaliar vaga", H4). */
	rawPoints: number;
	signals: SignalResult[];
	review: SignalResult[];
	criticalCount: number;
	escalations: Escalation[];
	action: string;
	summary: string;
	/** Área profissional detectada, usada para sugerir formação. */
	role: string;
	facts: Facts;
}
