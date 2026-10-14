/**
 * Vagas de parceiros — oportunidades cadastradas por empresas verificadas que fazem
 * parte da rede do Esp.IA. Quando a usuária cola uma vaga com sinais de risco,
 * sugerimos vagas reais da mesma área profissional, publicadas por empresas que já
 * passaram pela checagem de CNPJ da plataforma (em vez de mandar a usuária para
 * fora, para outros sites de emprego).
 *
 * `category` usa o mesmo rótulo de área profissional de `Role.label`/`Analysis.role`
 * (aba "Vaga Certa" em config.ts), para casar a recomendação com a função reconhecida.
 */
export interface PartnerVacancy {
	id: string;
	category: string;
	title: string;
	company: string;
	location: string;
	modality: 'Presencial' | 'Remoto' | 'Híbrido';
	salary: string;
}

export const PARTNER_VACANCIES: PartnerVacancy[] = [
	{
		id: 'adm-01',
		category: 'rotinas administrativas',
		title: 'Assistente administrativo',
		company: 'Grupo Horizonte Serviços',
		location: 'Belo Horizonte, MG',
		modality: 'Presencial',
		salary: 'R$ 2.200 – R$ 2.600'
	},
	{
		id: 'adm-02',
		category: 'rotinas administrativas',
		title: 'Recepcionista',
		company: 'Conecta Coworking',
		location: 'Curitiba, PR',
		modality: 'Presencial',
		salary: 'R$ 2.000 – R$ 2.300'
	},
	{
		id: 'com-01',
		category: 'atendimento e comércio',
		title: 'Vendedor(a) de loja',
		company: 'Flor de Maio Comércio',
		location: 'São Paulo, SP',
		modality: 'Presencial',
		salary: 'R$ 1.850 – R$ 2.100'
	},
	{
		id: 'com-02',
		category: 'atendimento e comércio',
		title: 'Operador(a) de caixa',
		company: 'Mercado Bom Preço',
		location: 'Recife, PE',
		modality: 'Presencial',
		salary: 'R$ 1.750 – R$ 1.950'
	},
	{
		id: 'cui-01',
		category: 'cuidados e acompanhamento',
		title: 'Cuidador(a) de idosos',
		company: 'Instituto Amparo',
		location: 'Porto Alegre, RS',
		modality: 'Presencial',
		salary: 'R$ 2.000 – R$ 2.400'
	},
	{
		id: 'dom-01',
		category: 'serviços domésticos',
		title: 'Auxiliar de limpeza',
		company: 'Lar Limpo Facilities',
		location: 'Campinas, SP',
		modality: 'Presencial',
		salary: 'R$ 1.750 – R$ 1.900'
	},
	{
		id: 'alm-01',
		category: 'alimentação e hotelaria',
		title: 'Auxiliar de cozinha',
		company: 'Sabor Caseiro Restaurantes',
		location: 'Salvador, BA',
		modality: 'Presencial',
		salary: 'R$ 1.900 – R$ 2.100'
	},
	{
		id: 'eve-01',
		category: 'eventos e entretenimento',
		title: 'Recepcionista de eventos',
		company: 'Vitrine Eventos',
		location: 'Rio de Janeiro, RJ',
		modality: 'Presencial',
		salary: 'R$ 2.300 – R$ 2.700'
	},
	{
		id: 'bem-01',
		category: 'bem-estar',
		title: 'Massoterapeuta',
		company: 'Espaço Bem Viver',
		location: 'Florianópolis, SC',
		modality: 'Presencial',
		salary: 'R$ 2.200 – R$ 2.600'
	},
	{
		id: 'rur-01',
		category: 'trabalho rural',
		title: 'Trabalhador(a) rural',
		company: 'Cooperativa Terra Nova',
		location: 'Ribeirão Preto, SP',
		modality: 'Presencial',
		salary: 'R$ 1.800 – R$ 2.000'
	},
	{
		id: 'con-01',
		category: 'construção civil',
		title: 'Ajudante de obras',
		company: 'Construtora Caminho Certo',
		location: 'Goiânia, GO',
		modality: 'Presencial',
		salary: 'R$ 2.200 – R$ 2.500'
	},
	{
		id: 'cos-01',
		category: 'confecção',
		title: 'Costureiro(a)',
		company: 'Oficina Ponto a Ponto',
		location: 'Americana, SP',
		modality: 'Presencial',
		salary: 'R$ 1.800 – R$ 2.000'
	},
	{
		id: 'mot-01',
		category: 'transporte',
		title: 'Motorista entregador',
		company: 'LogExpress Transportes',
		location: 'Fortaleza, CE',
		modality: 'Presencial',
		salary: 'R$ 2.600 – R$ 3.000'
	},
	{
		id: 'sau-01',
		category: 'saúde',
		title: 'Técnico(a) de enfermagem',
		company: 'Clínica Vida Plena',
		location: 'Brasília, DF',
		modality: 'Presencial',
		salary: 'R$ 3.200 – R$ 3.800'
	},
	{
		id: 'edu-01',
		category: 'educação',
		title: 'Monitor(a) escolar',
		company: 'Instituto Aprender Mais',
		location: 'Vitória, ES',
		modality: 'Presencial',
		salary: 'R$ 2.400 – R$ 2.800'
	},
	{
		id: 'ti-01',
		category: 'tecnologia',
		title: 'Analista de suporte técnico',
		company: 'NovaTech Soluções',
		location: 'Remoto',
		modality: 'Remoto',
		salary: 'R$ 3.800 – R$ 4.500'
	},
	{
		id: 'ges-01',
		category: 'gestão',
		title: 'Supervisor(a) de loja',
		company: 'Rede Varejo Mais',
		location: 'São Paulo, SP',
		modality: 'Presencial',
		salary: 'R$ 4.000 – R$ 4.800'
	},
	{
		id: 'eng-01',
		category: 'engenharia',
		title: 'Engenheiro(a) civil júnior',
		company: 'Construtora Alicerce',
		location: 'Belo Horizonte, MG',
		modality: 'Híbrido',
		salary: 'R$ 6.500 – R$ 7.500'
	}
];

/** Área usada quando a vaga colada não casa com nenhuma categoria cadastrada. */
const DEFAULT_CATEGORY = 'atendimento e comércio';

/**
 * Vagas de empresas parceiras para a área profissional reconhecida no texto.
 * Cai para uma área padrão quando a categoria não tem parceiros cadastrados.
 */
export function partnerVacanciesFor(category: string | undefined): PartnerVacancy[] {
	const matches = PARTNER_VACANCIES.filter((v) => v.category === category);
	return matches.length
		? matches
		: PARTNER_VACANCIES.filter((v) => v.category === DEFAULT_CATEGORY);
}
