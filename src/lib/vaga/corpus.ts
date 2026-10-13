import type { Level, SignalId } from './types';

/**
 * Anúncios rotulados (sintéticos, criados pela equipe) para teste e calibração.
 * Aba "Método", passo Calibração: priorizar evitar falsos negativos — vaga de aliciamento
 * classificada como Baixo. Acrescente aqui anúncios reais anonimizados.
 */
export interface LabeledAd {
	name: string;
	text: string;
	/** Nível esperado; um array aceita qualquer um deles. */
	level: Level | Level[];
	/** Sinais que precisam aparecer como presentes. */
	has?: SignalId[];
	/** Sinais que não podem aparecer como presentes. */
	not?: SignalId[];
}

export const CORPUS: LabeledAd[] = [
	{
		name: 'Exemplo da planilha (recepcionista em Dubai)',
		text: 'Vagas para recepcionista em Dubai! Salário de R$ 15 mil, não precisa de experiência. Passagem e hospedagem por nossa conta. Moças de 18 a 25 anos, boa aparência. Envie fotos de corpo inteiro para o WhatsApp.',
		level: 'alto',
		has: ['S01', 'S02', 'S05', 'S09', 'S10', 'S16'],
		not: ['S03', 'S07', 'S08', 'S12', 'S13', 'S18']
	},
	{
		name: 'Modelo no exterior com taxa (exemplo da página)',
		text: 'URGENTE: modelo para campanhas no exterior, salário de R$ 12.000 sem experiência. Passagem e hospedagem pagas pela empresa. Envie fotos de corpo inteiro e de biquíni pelo WhatsApp para garantir a vaga hoje. Não precisa entrevista nem contrato agora. Taxa de documentação de R$ 180 via Pix para reservar sua passagem. Não informamos CNPJ antes da contratação.',
		level: 'alto',
		has: ['S01', 'S02', 'S03', 'S05', 'S09', 'S11', 'S14', 'S16', 'S18', 'S21']
	},
	{
		name: 'Atendente de loja com dados completos (exemplo da página)',
		text: 'Vaga para atendente de loja na Flor de Maio Comércio. Salário de R$ 1.850 por mês, vale-transporte e registro CLT. Jornada das 9h às 18h, de segunda a sexta. Entrevista presencial na Rua das Palmeiras, 120. A empresa informa CNPJ para consulta e recebe currículos pelo e-mail recrutamento@flordemaio.com. Não cobramos taxas. O processo inclui entrevista e contrato antes do início.',
		level: 'baixo',
		not: ['S01', 'S16', 'S18', 'S21']
	},
	{
		name: 'Servidão por dívida',
		text: 'Vaga para ajudante de cozinha em restaurante em Portugal. A passagem você paga com o primeiro salário. Moradia no restaurante, você dorme no local.',
		level: 'alto',
		has: ['S07', 'S05', 'S20']
	},
	{
		name: 'Retenção de passaporte',
		text: 'Agência seleciona garçonetes para trabalhar na Espanha. Mande seu passaporte, nós cuidamos do visto. Contato pelo Telegram.',
		level: 'alto',
		has: ['S08', 'S16']
	},
	{
		name: 'Pedido de sigilo',
		text: 'Oportunidade única no exterior para dançarinas. Não comente com ninguém até embarcar, nem com a sua família. Detalhes no privado.',
		level: 'alto',
		has: ['S12', 'S11', 'S04']
	},
	{
		name: 'Menores de idade',
		text: 'Procuramos meninas a partir de 16 anos para trabalhar como recepcionista em eventos. Chama no zap.',
		level: 'alto',
		has: ['S13', 'S16']
	},
	{
		name: 'Nascidas a partir de 2010',
		text: 'Agência busca garotas nascidas a partir de 2010 para ensaio de moda. Envie fotos pelo Instagram.',
		level: 'alto',
		has: ['S13']
	},
	{
		name: 'Jovem Aprendiz legítimo',
		text: 'Programa Jovem Aprendiz – Supermercado Bom Preço LTDA, CNPJ 11.222.333/0001-81. Idade de 14 a 22 anos. Inscrições gratuitas pelo site www.bompreco.com.br/aprendiz. Contrato conforme a Lei 10.097, com carteira assinada.',
		level: 'baixo',
		not: ['S13', 'S10', 'S14', 'S15', 'S18', 'S21']
	},
	{
		name: 'Camboja (alerta do Itamaraty)',
		text: 'Vaga de atendimento ao cliente em Phnom Penh, Camboja. Salário de US$ 1.500 por mês. Passagem aérea paga pela empresa. Exige inglês básico. Contato via Telegram.',
		level: 'alto',
		has: ['S06', 'S05', 'S16']
	},
	{
		name: 'Golpe da taxa (trabalho em casa)',
		text: 'Trabalhe em casa digitando textos! Ganhe R$ 300 por dia. Para começar, faça um pix de R$ 49,90 para liberar seu kit de acesso.',
		level: ['atencao', 'alto'],
		has: ['S18', 'S01']
	},
	{
		name: 'Pede cartão e código SMS',
		text: 'Vaga home office de avaliador de produtos. Para cadastrar seu salário, mande foto do cartão e o código que chegou por SMS.',
		level: ['atencao', 'alto'],
		has: ['S19']
	},
	{
		name: 'Texto ofuscado',
		text: 'Vaga p/ m0delos na Eur0pa!! Env1e f.o.t.o.s de b1qu1n1 no z@p.',
		level: 'alto',
		has: ['S09', 'S11', 'S16']
	},
	{
		name: 'Letras estilizadas (Unicode)',
		text: 'Vaga para 𝗺𝗼𝗱𝗲𝗹𝗼𝘀 em Dubai. Passagem paga. Envie 𝗳𝗼𝘁𝗼𝘀 de biquíni.',
		level: 'alto',
		has: ['S09', 'S11', 'S05']
	},
	{
		name: 'Texto de alerta (não é vaga)',
		text: 'Cuidado: desconfie de vagas que pedem fotos de biquíni ou cobram taxa de inscrição. Nunca entregue seu passaporte a ninguém.',
		level: 'baixo',
		not: ['S09', 'S18', 'S08']
	},
	{
		name: 'Desenvolvedor sênior (salário alto legítimo)',
		text: 'Desenvolvedor(a) Full Stack Sênior – Acme Tecnologia LTDA, CNPJ 11.222.333/0001-81. Salário R$ 14.000 + benefícios. Requisitos: 5 anos de experiência com TypeScript. Candidaturas em acme.gupy.io. Regime CLT, híbrido em Fortaleza.',
		level: 'baixo',
		not: ['S01', 'S02', 'S10', 'S14', 'S16']
	},
	{
		name: 'Babá para dormir no emprego em outro estado',
		text: 'Precisa-se de babá para dormir no emprego em São Paulo. Passagem paga. Salário R$ 2.500. Falar com Dona Marta no whats (85) 99999-1234.',
		level: 'alto',
		has: ['S20', 'S05', 'S16']
	},
	{
		name: 'Entrar como turista',
		text: 'Trabalho em obra nos EUA, você viaja como turista e a gente regulariza lá. Ganhe US$ 4.000 por mês.',
		level: 'alto',
		has: ['S21', 'S01']
	},
	{
		name: 'CNPJ inválido',
		text: 'XPTO Modas LTDA, CNPJ 12.345.678/0001-00, contrata modelos para desfile em Milão. Inscrições pelo e-mail rh@xptomodas.com.br.',
		level: ['atencao', 'alto'],
		has: ['S15', 'S11'],
		not: ['S14']
	},
	{
		name: 'CNPJ alfanumérico válido',
		text: 'Nova Era Serviços LTDA, CNPJ 12.ABC.345/01DE-35, contrata auxiliar administrativo. Salário R$ 2.200, CLT. Currículos em vagas@novaera.com.br.',
		level: 'baixo',
		not: ['S14', 'S15']
	},
	{
		name: 'Prima que já trabalha lá',
		text: 'Oi! Minha prima já trabalha lá na Itália e ganha muito bem. Ela indica você, é só me chamar no WhatsApp.',
		level: ['atencao', 'alto'],
		has: ['S17', 'S16']
	},
	{
		name: 'Desconto legal de vale-transporte',
		text: 'Auxiliar de limpeza – Limpa Bem Serviços LTDA, CNPJ 11.222.333/0001-81. Salário R$ 1.800. Desconto de 6% do vale-transporte no salário, conforme a lei. Contratação CLT, com carteira assinada desde o primeiro dia. Endereço: Av. Santos Dumont, 1500.',
		level: 'baixo',
		not: ['S07', 'S21', 'S01']
	},
	{
		name: 'Anos de experiência não é idade',
		text: 'Analista contábil. Exigimos de 2 a 3 anos de experiência. Empresa Contas Certas LTDA, CNPJ 11.222.333/0001-81. Currículos em rh@contascertas.com.br.',
		level: 'baixo',
		not: ['S10', 'S13']
	},
	{
		name: 'Salário semanal inflado',
		text: 'Ganhe 1.500 reais por semana como auxiliar de limpeza! Chama no zap.',
		level: ['atencao', 'alto'],
		has: ['S01', 'S16']
	},
	{
		name: 'Lista negada de cobranças',
		text: 'Recepcionista – Clínica Vida LTDA, CNPJ 11.222.333/0001-81. Não cobramos taxa de inscrição, uniforme ou exames. Currículos: selecao@clinicavida.com.br.',
		level: 'baixo',
		not: ['S18']
	},
	{
		name: 'Vaga temporária de Natal em rua com nome de estado',
		text: 'Vaga temporária de Natal para vendedor na Loja Sol LTDA, CNPJ 11.222.333/0001-81, na Rua São Paulo, 200. Salário R$ 1.900. Envie currículo para vagas@lojasol.com.br.',
		level: 'baixo',
		not: ['S05', 'S01']
	}
];
