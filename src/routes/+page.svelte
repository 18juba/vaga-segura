<script lang="ts">
	type Level = 'baixo' | 'atenção' | 'alto';
	type Finding = { title: string; detail: string; kind: 'alerta' | 'atenção' | 'informação' };
	type Analysis = { score: number; level: Level; summary: string; findings: Finding[]; role: string };

	const examples = [
		{
			label: 'Vaga suspeita',
			text: 'URGENTE: modelo para campanhas no exterior, salário de R$ 12.000 sem experiência. Passagem e hospedagem pagas pela empresa. Envie fotos de corpo inteiro e de biquíni pelo WhatsApp para garantir a vaga hoje. Não precisa entrevista nem contrato agora. Taxa de documentação de R$ 180 via Pix para reservar sua passagem. Não informamos CNPJ antes da contratação.'
		},
		{
			label: 'Vaga com poucos alertas',
			text: 'Vaga para atendente de loja na Flor de Maio Comércio. Salário de R$ 1.850 por mês, vale-transporte e registro CLT. Jornada das 9h às 18h, de segunda a sexta. Entrevista presencial na Rua das Palmeiras, 120. A empresa informa CNPJ para consulta e recebe currículos pelo e-mail recrutamento@flordemaio.com. Não cobramos taxas. O processo inclui entrevista e contrato antes do início.'
		}
	];

	let jobText = $state('');
	let result = $state<Analysis | null>(null);
	let analyzing = $state(false);
	let errorMessage = $state('');
	let imageName = $state('');
	let imageUrl = $state('');
	let fileInput: HTMLInputElement;

	function useExample(text: string) {
		jobText = text;
		result = null;
		errorMessage = '';
	}

	function handleImageSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageUrl = URL.createObjectURL(file);
		imageName = file.name;
		result = null;
		errorMessage = '';
	}

	function removeImage() {
		if (imageUrl) URL.revokeObjectURL(imageUrl);
		imageUrl = '';
		imageName = '';
		if (fileInput) fileInput.value = '';
	}

	function normalize(text: string) {
		return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}

	function assessVacancy(text: string): Analysis {
		const source = normalize(text);
		const findings: Finding[] = [];
		let points = 0;

		if (/foto.{0,35}(corpo|biquini|sensual)|(?:corpo|biquini).{0,35}foto|fotos? pessoais|selfie/.test(source)) {
			findings.push({ title: 'Pede fotos pessoais', detail: 'Fotos do corpo ou de biquíni não fazem parte de uma seleção profissional.', kind: 'alerta' });
			points += 38;
		}
		if (/\b(taxa|pix|pague|pagamento adiantado|investimento inicial|reserva de vaga)\b/.test(source)) {
			findings.push({ title: 'Pede dinheiro antes da contratação', detail: 'Cobrar uma taxa, Pix ou pagamento para liberar uma vaga é um forte sinal de alerta.', kind: 'alerta' });
			points += 34;
		}
		if (/salario.{0,35}alto.{0,35}sem experiencia|sem experiencia.{0,45}salario|r\$\s?[\d.]+.{0,35}sem experiencia/.test(source)) {
			findings.push({ title: 'Promete salário alto sem experiência', detail: 'Uma promessa muito vantajosa sem requisitos claros merece confirmação por outro canal.', kind: 'atenção' });
			points += 20;
		}
		if (/(urgente|so hoje|somente hoje|garantir a vaga|ultimas vagas|decida agora|nao conte para ninguem)/.test(source)) {
			findings.push({ title: 'Pressiona para decidir rápido', detail: 'A urgência pode dificultar que você confira a empresa e converse com alguém de confiança.', kind: 'atenção' });
			points += 17;
		}
		if (/(passagem|passagens|hospedagem|exterior|fora do pais|mudar de cidade)/.test(source) && /(sem contrato|nao precisa entrevista|sem entrevista|nao informamos cnpj|nao precisa de contrato)/.test(source)) {
			findings.push({ title: 'Fala em viagem sem processo claro', detail: 'Deslocamento ou hospedagem sem contrato e sem identificação da empresa precisam ser checados.', kind: 'alerta' });
			points += 23;
		}
		if (/(whatsapp|telegram|direct|mensagem privada)/.test(source) && /(somente|apenas|exclusivamente|chame|envie.*pelo)/.test(source)) {
			findings.push({ title: 'Contato só por mensagem privada', detail: 'Tente localizar um canal oficial da empresa antes de enviar informações ou marcar um encontro.', kind: 'atenção' });
			points += 12;
		}
		if (!/\bcnpj\b/.test(source)) {
			findings.push({ title: 'Não informa CNPJ no texto', detail: 'Não encontramos esse dado no anúncio. A ausência não confirma golpe, mas vale pedir a identificação da empresa.', kind: 'atenção' });
			points += 10;
		}

		const positiveSignals = [
			/\bcnpj\b/.test(source),
			/\b(clt|contrato|registro em carteira)\b/.test(source),
			/(entrevista presencial|entrevista por video|processo seletivo)/.test(source),
			/(endereco|rua|avenida|e-mail|email)/.test(source),
			/(jornada|horario|vale-transporte|vale refeicao)/.test(source)
		].filter(Boolean).length;
		points = Math.max(4, Math.min(98, points - Math.min(positiveSignals, 3) * 4));

		if (!findings.length) {
			findings.push({ title: 'Nenhum alerta claro neste texto', detail: 'O anúncio traz algumas informações de trabalho. Ainda assim, confira os dados da empresa antes de aceitar.', kind: 'informação' });
		}

		const level: Level = points >= 55 ? 'alto' : points >= 27 ? 'atenção' : 'baixo';
		const summary = level === 'alto'
			? 'Encontramos sinais importantes. Pause a conversa e procure orientação antes de responder.'
			: level === 'atenção'
				? 'Há pontos que precisam ser confirmados. Não envie documentos nem dinheiro antes de checar.'
				: 'Poucos sinais de alerta apareceram. Confira os dados da empresa antes de seguir.';
		const role = /baba|cuidador|cuidadora/.test(source) ? 'cuidados e acompanhamento'
			: /caixa|atendente|loja|vendas/.test(source) ? 'atendimento e comércio'
				: /administrativ|escritorio|recepcionista/.test(source) ? 'rotinas administrativas'
					: 'essa área profissional';
		return { score: points, level, summary, findings, role };
	}

	function analyze() {
		errorMessage = '';
		if (jobText.trim().length < 25) {
			errorMessage = 'Cole o texto da vaga para eu conseguir conferir os detalhes.';
			return;
		}
		result = null;
		analyzing = true;
		window.setTimeout(() => {
			result = assessVacancy(jobText);
			analyzing = false;
			window.setTimeout(() => {
				document.getElementById('analise-resultado')?.scrollIntoView({
					behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
					block: 'start'
				});
			}, 50);
		}, 950);
	}

	function startOver() {
		jobText = '';
		result = null;
		errorMessage = '';
		removeImage();
		document.getElementById('verificador')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
</script>

<svelte:head>
	<title>Vaga Segura — confira antes de aceitar</title>
	<meta name="description" content="Confira sinais de alerta em ofertas de trabalho e encontre caminhos seguros para seguir." />
	<meta name="theme-color" content="#fbf8f5" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap" rel="stylesheet" />
</svelte:head>

<div class="site-shell">
	<header class="topbar">
		<a class="brand" href="#inicio" aria-label="Vaga Segura, início">
			<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 3.5 34 9v9.8c0 8.5-5.7 14.5-14 18-8.3-3.5-14-9.5-14-18V9l14-5.5Z" /><path d="m13.5 19.8 4.1 4.1 9-9" /></svg></span>
			<span class="brand-name">vaga <strong>segura</strong></span>
		</a>
		<nav class="main-nav" aria-label="Navegação principal"><a href="#como-funciona">Como funciona</a><a href="#rede-de-apoio">Rede de apoio</a></nav>
		<a class="top-cta" href="#verificador">Conferir uma vaga <span aria-hidden="true">↗</span></a>
	</header>

	<main>
		<section class="hero" id="inicio">
			<div class="hero-copy">
				<div class="ods-label"><span class="ods-dot"></span> Um cuidado alinhado à ODS 5</div>
				<h1>Seu próximo trabalho merece <em>respeitar você.</em></h1>
				<p class="hero-description">Antes de responder a uma oferta, confira o que ela diz. A gente ajuda você a perceber sinais de alerta e encontrar um próximo passo seguro.</p>
				<a class="text-link" href="#como-funciona"><span class="link-icon" aria-hidden="true">↓</span> Entenda como funciona</a>
				<div class="hero-note"><span class="note-spark" aria-hidden="true">✳</span><span>Você não precisa decidir com pressa. Estamos aqui para ajudar.</span></div>
			</div>
			<div class="hero-art" aria-label="Uma mensagem de acolhimento">
				<div class="art-ring ring-one"></div><div class="art-ring ring-two"></div><div class="art-orbit orbit-top"></div><div class="art-orbit orbit-bottom"></div>
				<div class="art-center"><svg viewBox="0 0 88 88" fill="none" aria-hidden="true"><path d="M44 9 71 20v18.8c0 16.4-11 28-27 35.2C28 66.8 17 55.2 17 38.8V20L44 9Z" /><path d="m32 43 8 8 16-17" /></svg></div>
				<div class="art-caption"><span class="caption-mark">✳</span><div><strong>Seu cuidado vem primeiro.</strong><span>Uma escolha informada começa aqui.</span></div></div>
				<div class="art-side-note">informação<br />também protege</div>
			</div>
		</section>

		<section class="checker-section" id="verificador">
			<div class="checker-intro">
				<div class="section-kicker"><span></span> Vamos olhar juntas?</div>
				<h2>Recebeu uma proposta?<br /><em>Confira com calma.</em></h2>
				<p>Cole a mensagem que chegou para você. Nossa análise procura padrões comuns em falsas ofertas de trabalho.</p>
				<div class="privacy-note"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 6v5.6c0 4.7-3.2 8.2-8 10.4-4.8-2.2-8-5.7-8-10.4V6l8-3Z" /><path d="m9 12 2 2 4-4" /></svg><span>Seu texto fica só nesta demonstração e não é enviado a nenhum serviço.</span></div>
			</div>
			<div class="checker-card">
				<div class="checker-card-top">
					<div class="card-title-wrap"><span class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z" /><path d="M14 3.5V9h5M8.5 13h7M8.5 16.5h7" /></svg></span><div><h3>Analise uma oferta</h3><p>Texto de anúncio, mensagem ou conversa</p></div></div>
					<span class="demo-chip"><span></span> análise demonstrativa</span>
				</div>
				<label class="visually-hidden" for="job-text">Texto da vaga para analisar</label>
				<textarea id="job-text" bind:value={jobText} placeholder="Cole aqui o texto da vaga ou a mensagem que você recebeu…" aria-describedby="input-help" oninput={() => { result = null; errorMessage = ''; }}></textarea>
				<div class="input-meta" id="input-help"><span>Não inclua seus dados pessoais.</span><span>{jobText.length} caracteres</span></div>
				{#if imageUrl}
					<div class="attachment-preview"><img src={imageUrl} alt="Prévia da imagem anexada" /><div class="attachment-info"><strong>{imageName}</strong><span>Leitura de imagem simulada · cole o texto visível para analisar</span></div><button class="remove-attachment" type="button" onclick={removeImage} aria-label="Remover imagem">×</button></div>
				{/if}
				{#if errorMessage}<p class="input-error" role="alert">{errorMessage}</p>{/if}
				<div class="checker-actions">
					<button class="analyze-button" type="button" onclick={analyze} disabled={analyzing}>
						{#if analyzing}<span class="button-spinner" aria-hidden="true"></span> Conferindo os sinais…
						{:else}<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.8 18.2a7.4 7.4 0 1 1 0-14.8 7.4 7.4 0 0 1 0 14.8Z" /><path d="m16.2 16.2 4.3 4.3M8 11.1l1.9 1.9 4-4.1" /></svg> Conferir esta vaga{/if}
					</button>
					<input bind:this={fileInput} class="file-input" type="file" accept="image/*" aria-label="Selecionar imagem da vaga" onchange={handleImageSelect} />
					<button class="image-button" type="button" onclick={() => fileInput?.click()}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2.5" /><circle cx="9" cy="9.5" r="1.7" /><path d="m5 17 4.7-4.5 3.1 2.8 2.1-2 4.1 3.7" /></svg> Anexar print</button>
				</div>
				<div class="sample-divider"><span>ou experimente com um exemplo</span></div>
				<div class="sample-actions">{#each examples as example}<button type="button" class="sample-button" onclick={() => useExample(example.text)}><span class:sample-alert={example.label === 'Vaga suspeita'} class="sample-dot"></span><span>{example.label}</span><span class="sample-tag">testar</span></button>{/each}</div>
				{#if analyzing}<div class="analysis-loading" role="status" aria-live="polite"><span class="loading-mark">✳</span><div><strong>Conferindo informações importantes</strong><span>Procurando sinais de alerta no texto…</span></div><span class="loading-pulse"></span></div>{/if}
			</div>
		</section>

		{#if result}
			<section class="result-section" id="analise-resultado" class:risk-high={result.level === 'alto'} class:risk-medium={result.level === 'atenção'} class:risk-low={result.level === 'baixo'} aria-live="polite">
				<div class="result-heading"><div><div class="section-kicker"><span></span> Resultado da sua análise</div><h2>Informação para <em>seguir com segurança.</em></h2></div><button class="new-analysis" type="button" onclick={startOver}>Analisar outra vaga</button></div>
				<div class="result-grid">
					<div class="risk-summary">
						<div class="risk-meter"><svg viewBox="0 0 120 120" role="img" aria-label={'Indicador de risco: ' + result.score + ' de 100'}><circle class="meter-track" cx="60" cy="60" r="50" /><circle class="meter-value" cx="60" cy="60" r="50" pathLength="100" stroke-dasharray={result.score + ', 100'} /></svg><div class="meter-copy"><strong>{result.score}</strong><span>de 100</span></div></div>
						<div class="risk-status"><span class="status-dot"></span><strong>{result.level === 'alto' ? 'Risco alto' : result.level === 'atenção' ? 'Atenção' : 'Poucos alertas'}</strong></div>
						<p>{result.summary}</p>
						<div class="demo-disclaimer"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v4M10 6.5h.01" /></svg><span>Leitura demonstrativa. Ela não confirma se uma vaga é legítima ou fraudulenta.</span></div>
					</div>
					<div class="findings-panel">
						<div class="findings-heading"><div><h3>O que apareceu no texto</h3><p>Veja os motivos por trás do resultado.</p></div><span class="findings-count">{result.findings.length} {result.findings.length === 1 ? 'sinal' : 'sinais'}</span></div>
						<ul class="finding-list">{#each result.findings as finding}<li><span class="finding-mark" class:mark-alert={finding.kind === 'alerta'} class:mark-caution={finding.kind === 'atenção'} class:mark-info={finding.kind === 'informação'} aria-hidden="true">{finding.kind === 'alerta' ? '!' : finding.kind === 'atenção' ? '·' : '✓'}</span><div><strong>{finding.title}</strong><span>{finding.detail}</span></div></li>{/each}</ul>
					</div>
				</div>

				{#if result.level === 'alto'}
					<div class="next-step-panel support-panel" id="rede-de-apoio">
						<div class="next-step-copy"><span class="next-step-icon" aria-hidden="true">♡</span><div><span class="next-step-kicker">Você não precisa passar por isso sozinha</span><h3>Pause. Converse com alguém de confiança e procure orientação.</h3><p>Não envie dinheiro, fotos íntimas ou documentos. Guarde as mensagens e evite encontros sozinha.</p></div></div>
						<div class="support-actions">
							<a class="support-link primary-support" href="tel:180"><span class="hotline-number">180</span><span><strong>Ligue 180</strong><small>Orientação e apoio à mulher</small></span><span class="support-arrow" aria-hidden="true">↗</span></a>
							<a class="support-link" href="tel:100"><span class="hotline-number">100</span><span><strong>Disque 100</strong><small>Denúncia de violação de direitos</small></span><span class="support-arrow" aria-hidden="true">↗</span></a>
							<a class="emergency-link" href="tel:190">Em perigo imediato? Ligue 190</a>
						</div>
					</div>
					<div class="official-jobs"><div><span class="section-kicker"><span></span> Um caminho mais seguro</span><h3>Procure oportunidades em canais públicos.</h3><p>Consulte vagas diretamente nas plataformas oficiais. A disponibilidade muda por cidade e região.</p></div><div class="job-source-links">
						<a href="https://www.gov.br/pt-br/servicos/buscar-emprego-no-sistema-nacional-de-emprego-sine" target="_blank" rel="noreferrer"><span class="source-mark">S</span><span><strong>Buscar vagas no SINE</strong><small>Ministério do Trabalho</small></span><span aria-hidden="true">↗</span></a>
						<a href="https://idt.org.br/vagas-disponiveis" target="_blank" rel="noreferrer"><span class="source-mark source-idt">I</span><span><strong>Ver vagas no IDT/SINE</strong><small>Oportunidades no Ceará</small></span><span aria-hidden="true">↗</span></a>
					</div></div>
				{:else if result.level === 'atenção'}
					<div class="next-step-panel caution-panel"><div class="next-step-copy"><span class="next-step-icon" aria-hidden="true">✳</span><div><span class="next-step-kicker">Antes de responder</span><h3>Peça os dados da empresa e confirme cada detalhe.</h3><p>Não pague taxas nem envie fotos ou documentos. Você pode buscar outra oportunidade em canais públicos.</p></div></div><div class="job-source-links compact-links">
						<a href="https://www.gov.br/pt-br/servicos/buscar-emprego-no-sistema-nacional-de-emprego-sine" target="_blank" rel="noreferrer"><span class="source-mark">S</span><span><strong>Buscar vagas no SINE</strong><small>Plataforma pública de emprego</small></span><span aria-hidden="true">↗</span></a>
						<a href="tel:180"><span class="hotline-number">180</span><span><strong>Ligue 180</strong><small>Orientação e acolhimento</small></span><span aria-hidden="true">↗</span></a>
					</div></div>
				{:else}
					<div class="next-step-panel learning-panel"><div class="next-step-copy"><span class="next-step-icon" aria-hidden="true">✿</span><div><span class="next-step-kicker">Um passo para sua carreira</span><h3>Que tal fortalecer {result.role}?</h3><p>Estes cursos gratuitos podem ajudar a ampliar suas opções de trabalho.</p></div></div><div class="course-links">
						<a href="https://www.ev.org.br/cursos/atendimento-ao-publico" target="_blank" rel="noreferrer"><span class="course-icon">A</span><span><strong>Atendimento ao Público</strong><small>Fundação Bradesco · gratuito</small></span><span aria-hidden="true">↗</span></a>
						<a href="https://www.ev.org.br/cursos" target="_blank" rel="noreferrer"><span class="course-icon course-icon-lilac">+</span><span><strong>Explore outros cursos</strong><small>Formação online gratuita</small></span><span aria-hidden="true">↗</span></a>
					</div></div>
				{/if}
				<p class="result-footnote">Se houver ameaça ou aliciamento, procure uma pessoa de confiança e um serviço de proteção. <a href="https://www.gov.br/mulheres/pt-br/ligue180" target="_blank" rel="noreferrer">Saiba mais sobre o Ligue 180</a>.</p>
			</section>
		{/if}

		<section class="how-section" id="como-funciona"><div class="how-heading"><div class="section-kicker"><span></span> Simples assim</div><h2>Um pouco de clareza<br />muda o <em>próximo passo.</em></h2></div>
			<div class="how-steps">
				<div class="how-step"><span class="step-symbol step-symbol-peach" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M9 5h10l6 6v15H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M19 5v7h6M12 17h10M12 21h7" /></svg></span><h3>Compartilhe a oferta</h3><p>Cole o texto da vaga ou use um exemplo para conhecer a ferramenta.</p></div><div class="step-connector" aria-hidden="true">······</div>
				<div class="how-step"><span class="step-symbol step-symbol-lilac" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><circle cx="14" cy="14" r="8" /><path d="m20 20 6 6M11 14l2 2 4-4" /></svg></span><h3>Veja os sinais</h3><p>Entenda o que merece cuidado e por que apareceu na análise.</p></div><div class="step-connector" aria-hidden="true">······</div>
				<div class="how-step"><span class="step-symbol step-symbol-green" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M16 4 26 8v7c0 6.2-4 10.5-10 13-6-2.5-10-6.8-10-13V8l10-4Z" /><path d="m12 15 3 3 6-6" /></svg></span><h3>Escolha como seguir</h3><p>Encontre apoio, vagas públicas ou cursos gratuitos para continuar.</p></div>
			</div>
		</section>
		<section class="help-banner"><div class="help-flower" aria-hidden="true">✳</div><div><span class="help-eyebrow">Uma mensagem para lembrar</span><h2>Você merece uma oportunidade<br /><em>que também cuide de você.</em></h2></div><a href="#verificador" class="help-button">Conferir uma vaga <span aria-hidden="true">↗</span></a></section>
	</main>
	<footer class="footer"><a class="brand footer-brand" href="#inicio" aria-label="Vaga Segura, início"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 3.5 34 9v9.8c0 8.5-5.7 14.5-14 18-8.3-3.5-14-9.5-14-18V9l14-5.5Z" /><path d="m13.5 19.8 4.1 4.1 9-9" /></svg></span><span class="brand-name">vaga <strong>segura</strong></span></a><p>Uma demonstração de apoio e informação para escolhas mais seguras.</p><div class="footer-links"><a href="https://www.gov.br/mulheres/pt-br/ligue180" target="_blank" rel="noreferrer">Ligue 180</a><a href="https://www.gov.br/mdh/pt-br/assuntos/noticias/2026/defeso-eleitoral/setembro/disque-100-conheca-os-principais-mitos-e-verdades-sobre-o-servico" target="_blank" rel="noreferrer">Disque 100</a></div></footer>
</div>

<style>
	:global(*) { box-sizing: border-box; }
	:global(html) { scroll-behavior: smooth; scroll-padding-top: 2rem; }
	:global(body) { margin: 0; background: #fbf8f5; color: #352d35; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
	:global(button), :global(textarea) { font: inherit; }
	:global(button:focus-visible), :global(a:focus-visible), :global(textarea:focus-visible), :global(input:focus-visible) { outline: 3px solid #c85167; outline-offset: 3px; }
	.site-shell { --plum: #3a203f; --plum-soft: #533456; --guava: #d9707c; --guava-dark: #b94e64; --paper: #fbf8f5; --lavender: #e9ddf0; --mint: #ddebe1; --muted: #777078; min-height: 100vh; overflow: hidden; }
	.topbar, main, .footer { width: min(1160px, calc(100% - 64px)); margin-inline: auto; }
	.topbar { height: 88px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(58,32,63,.1); }
	.brand { display: inline-flex; align-items: center; gap: 10px; color: var(--plum); text-decoration: none; }
	.brand-mark { width: 34px; height: 34px; display: grid; place-items: center; }
	.brand-mark svg { width: 100%; stroke: var(--guava-dark); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
	.brand-name { font-size: 16px; letter-spacing: -.7px; }
	.brand-name strong { font-weight: 700; }
	.main-nav { display: flex; align-items: center; gap: 38px; margin-left: 5%; }
	.main-nav a, .footer-links a { color: #655c65; font-size: 13px; font-weight: 600; text-decoration: none; transition: color 160ms ease; }
	.main-nav a:hover, .footer-links a:hover { color: var(--guava-dark); }
	.top-cta { color: var(--plum); border: 1px solid #b9aab9; border-radius: 999px; padding: 11px 17px; font-size: 12px; font-weight: 700; text-decoration: none; transition: background 160ms ease, color 160ms ease; }
	.top-cta span { margin-left: 6px; color: var(--guava-dark); }
	.top-cta:hover { background: var(--plum); color: white; }
	.hero { min-height: 555px; display: grid; grid-template-columns: 1.04fr .96fr; align-items: center; padding: 50px 0 60px; gap: 4%; }
	.hero-copy { padding: 9px 0 0 20px; position: relative; z-index: 1; }
	.ods-label, .section-kicker { display: inline-flex; align-items: center; gap: 9px; color: var(--plum-soft); font-size: 12px; font-weight: 700; }
	.ods-dot, .section-kicker > span { width: 8px; height: 8px; flex: 0 0 8px; background: var(--guava); border-radius: 50%; box-shadow: 0 0 0 4px rgba(217,112,124,.13); }
	h1, h2, h3, p { margin-top: 0; }
	.hero h1 { max-width: 570px; margin: 24px 0 20px; color: var(--plum); font-family: 'Fraunces', Georgia, serif; font-size: clamp(44px,5.3vw,68px); font-weight: 500; letter-spacing: -2.6px; line-height: 1.06; }
	.hero h1 em, .checker-intro h2 em, .how-heading h2 em, .help-banner h2 em, .result-heading h2 em { color: var(--guava-dark); font-style: normal; }
	.hero-description { max-width: 440px; margin-bottom: 24px; color: #6f6670; font-size: 15px; line-height: 1.75; }
	.text-link { display: inline-flex; align-items: center; gap: 9px; color: var(--plum); font-size: 13px; font-weight: 700; text-decoration: none; }
	.text-link:hover { color: var(--guava-dark); }
	.link-icon { width: 23px; height: 23px; display: grid; place-items: center; background: var(--lavender); border-radius: 50%; }
	.hero-note { max-width: 365px; margin-top: 43px; padding-top: 14px; border-top: 1px solid rgba(58,32,63,.13); display: flex; align-items: center; gap: 9px; color: #7b717a; font-size: 11px; line-height: 1.5; }
	.note-spark { color: var(--guava-dark); font-size: 19px; }
	.hero-art { width: min(100%,460px); aspect-ratio: 1; margin-inline: auto; position: relative; display: grid; place-items: center; }
	.hero-art::before { position: absolute; inset: 10%; content: ''; border-radius: 44% 56% 58% 42% / 47% 38% 62% 53%; background: #f3e6e8; transform: rotate(-9deg); }
	.art-ring { position: absolute; inset: 15%; border: 1px solid rgba(185,78,100,.3); border-radius: 50%; }
	.ring-two { inset: 23%; border-color: rgba(83,52,86,.2); }
	.art-orbit { position: absolute; width: 9px; height: 9px; background: var(--guava); border: 3px solid var(--paper); border-radius: 50%; box-sizing: content-box; }
	.orbit-top { top: 18%; right: 29%; }
	.orbit-bottom { bottom: 20%; left: 21%; width: 6px; height: 6px; background: #779c83; }
	.art-center { width: 153px; height: 153px; position: relative; display: grid; place-items: center; background: var(--plum); border: 8px solid rgba(255,255,255,.73); border-radius: 44% 56% 50% 50% / 53% 44% 56% 47%; box-shadow: 0 20px 48px rgba(58,32,63,.18); transform: rotate(-5deg); }
	.art-center svg { width: 83px; stroke: #f3c1c7; stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; }
	.art-caption { position: absolute; right: 0; bottom: 17%; display: flex; align-items: center; gap: 12px; padding: 13px 17px; background: #fffdfb; border: 1px solid rgba(58,32,63,.08); border-radius: 14px 14px 14px 4px; box-shadow: 0 13px 34px rgba(58,32,63,.09); }
	.caption-mark { color: var(--guava-dark); font-size: 22px; }
	.art-caption div { display: grid; gap: 3px; }
	.art-caption strong { color: var(--plum); font-size: 11px; }
	.art-caption span:last-child { color: var(--muted); font-size: 10px; }
	.art-side-note { position: absolute; top: 25%; left: 5%; color: #7b657b; font-family: 'Fraunces',Georgia,serif; font-size: 13px; font-style: italic; line-height: 1.2; transform: rotate(-10deg); }
	.checker-section { display: grid; grid-template-columns: .76fr 1.24fr; align-items: center; gap: 8%; padding: 58px; background: #f3eeeb; border-radius: 27px; scroll-margin-top: 2rem; }
	.checker-intro { padding-left: 4px; }
	.section-kicker { color: #68566b; font-size: 11px; }
	.checker-intro h2, .how-heading h2, .result-heading h2 { margin: 18px 0 13px; color: var(--plum); font-family: 'Fraunces',Georgia,serif; font-size: clamp(30px,3.2vw,42px); font-weight: 500; letter-spacing: -1.25px; line-height: 1.13; }
	.checker-intro p { max-width: 340px; margin-bottom: 25px; color: #706770; font-size: 13px; line-height: 1.75; }
	.privacy-note { max-width: 305px; display: flex; align-items: flex-start; gap: 9px; padding-top: 15px; border-top: 1px solid #dfd7d5; color: #777078; font-size: 10px; line-height: 1.55; }
	.privacy-note svg { width: 19px; min-width: 19px; stroke: #76947e; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
	.checker-card { padding: 27px 28px 22px; background: #fffdfb; border: 1px solid #ebe4e2; border-radius: 19px; box-shadow: 0 14px 34px rgba(58,32,63,.06); }
	.checker-card-top, .card-title-wrap, .checker-actions, .input-meta, .sample-actions, .findings-heading, .result-heading, .result-grid, .next-step-copy, .support-link, .job-source-links a, .course-links a, .footer { display: flex; }
	.checker-card-top, .result-heading, .findings-heading, .input-meta { align-items: center; justify-content: space-between; }
	.card-title-wrap { align-items: center; gap: 12px; }
	.card-icon { width: 39px; height: 39px; display: grid; place-items: center; background: #f6e9eb; border-radius: 12px; }
	.card-icon svg { width: 21px; stroke: var(--guava-dark); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
	.card-title-wrap h3 { margin: 0 0 3px; color: var(--plum); font-size: 14px; }
	.card-title-wrap p { margin: 0; color: #8c848b; font-size: 10px; }
	.demo-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; color: #6a5a6c; background: #f1eaf3; border-radius: 999px; font-size: 9px; font-weight: 600; white-space: nowrap; }
	.demo-chip span { width: 5px; height: 5px; background: #927599; border-radius: 50%; }
	textarea { width: 100%; min-height: 143px; margin-top: 20px; padding: 15px 16px; resize: vertical; color: #453e46; background: white; border: 1px solid #e9e1df; border-radius: 11px; font-size: 12px; line-height: 1.65; transition: border-color 150ms ease, box-shadow 150ms ease; }
	textarea::placeholder { color: #a59ca3; }
	textarea:focus { border-color: #b886a8; box-shadow: 0 0 0 3px rgba(184,134,168,.12); outline: none; }
	.input-meta { margin-top: 7px; color: #978e96; font-size: 9px; }
	.file-input, .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
	.attachment-preview { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 9px; background: #f4f0f3; border-radius: 10px; }
	.attachment-preview img { width: 46px; height: 46px; object-fit: cover; border-radius: 7px; }
	.attachment-info { min-width: 0; display: grid; gap: 3px; }
	.attachment-info strong { overflow: hidden; color: var(--plum); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
	.attachment-info span { color: #7c747d; font-size: 9px; line-height: 1.4; }
	.remove-attachment { width: 29px; height: 29px; margin-left: auto; color: #766b75; background: transparent; border: 0; border-radius: 50%; font-size: 20px; cursor: pointer; }
	.remove-attachment:hover { background: #e9dde9; color: var(--plum); }
	.input-error { margin: 8px 0 0; color: #a73b4f; font-size: 11px; }
	.checker-actions { align-items: center; gap: 10px; margin-top: 15px; }
	.analyze-button, .image-button, .new-analysis, .help-button { min-height: 45px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer; transition: transform 150ms ease, background 150ms ease; }
	.analyze-button { flex: 1; color: white; background: var(--plum); border: 1px solid var(--plum); }
	.analyze-button:hover:not(:disabled) { background: #512e58; transform: translateY(-1px); }
	.analyze-button:disabled { opacity: .8; cursor: wait; }
	.analyze-button svg, .image-button svg { width: 17px; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
	.button-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,.42); border-top-color: white; border-radius: 50%; animation: spin 750ms linear infinite; }
	.image-button { padding: 0 13px; color: #655968; background: white; border: 1px solid #ded5dd; }
	.image-button:hover { background: #f7f2f7; }
	.sample-divider { display: flex; align-items: center; gap: 11px; margin: 20px 0 11px; color: #958b93; font-size: 9px; }
	.sample-divider::before, .sample-divider::after { height: 1px; flex: 1; content: ''; background: #eee8e6; }
	.sample-actions { gap: 9px; }
	.sample-button { min-width: 0; flex: 1; display: flex; align-items: center; gap: 7px; padding: 9px 10px; color: #5e555e; background: #faf7f5; border: 1px solid #eee7e5; border-radius: 8px; font-size: 9px; text-align: left; cursor: pointer; }
	.sample-button:hover { background: #f6eef1; border-color: #d8bec8; }
	.sample-dot { width: 7px; height: 7px; flex: 0 0 7px; background: #8cb097; border-radius: 50%; }
	.sample-dot.sample-alert { background: var(--guava); }
	.sample-tag { margin-left: auto; color: #9a9097; font-size: 8px; }
	.analysis-loading { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 12px; background: #f5eff6; border-radius: 9px; }
	.loading-mark { color: var(--guava-dark); font-size: 19px; animation: breathe 900ms ease-in-out infinite alternate; }
	.analysis-loading div { display: grid; gap: 3px; }
	.analysis-loading strong { color: var(--plum); font-size: 10px; }
	.analysis-loading div span { color: #807580; font-size: 9px; }
	.loading-pulse { width: 7px; height: 7px; margin-left: auto; background: var(--guava); border-radius: 50%; box-shadow: 0 0 0 5px rgba(217,112,124,.12); animation: breathe 900ms ease-in-out infinite alternate; }
	.result-section { padding: 62px 0 10px; scroll-margin-top: 2rem; }
	.result-heading { gap: 24px; margin-bottom: 22px; }
	.result-heading h2 { margin-bottom: 0; font-size: clamp(30px,3vw,39px); }
	.new-analysis { padding: 0 15px; color: var(--plum); background: transparent; border: 1px solid #c7b9c5; white-space: nowrap; }
	.new-analysis:hover { background: #f2eaf1; }
	.result-grid { align-items: stretch; gap: 16px; }
	.risk-summary, .findings-panel { padding: 25px 28px; background: #fffdfb; border: 1px solid #ebe4e2; border-radius: 17px; }
	.risk-summary { width: 34%; min-width: 260px; display: flex; flex-direction: column; align-items: center; text-align: center; }
	.risk-meter { width: 122px; height: 122px; position: relative; display: grid; place-items: center; }
	.risk-meter svg { width: 100%; transform: rotate(-90deg); overflow: visible; }
	.risk-meter circle { fill: none; stroke-width: 7; }
	.meter-track { stroke: #eee7e9; }
	.meter-value { stroke: var(--guava-dark); stroke-linecap: round; stroke-dashoffset: 0; transition: stroke-dasharray 500ms ease; }
	.risk-high .meter-value { stroke: #bf4f61; }
	.risk-medium .meter-value { stroke: #c59447; }
	.risk-low .meter-value { stroke: #72957c; }
	.meter-copy { position: absolute; display: grid; }
	.meter-copy strong { color: var(--plum); font-family: 'Fraunces',Georgia,serif; font-size: 35px; font-weight: 500; line-height: 1; }
	.meter-copy span { margin-top: 4px; color: #918891; font-size: 9px; }
	.risk-status { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; color: var(--plum); font-size: 13px; }
	.status-dot { width: 8px; height: 8px; background: #7a9b83; border-radius: 50%; }
	.risk-high .status-dot { background: #c54f63; }
	.risk-medium .status-dot { background: #c59447; }
	.risk-summary > p { max-width: 260px; margin: 10px auto 16px; color: #736a73; font-size: 11px; line-height: 1.6; }
	.demo-disclaimer { display: flex; align-items: flex-start; gap: 7px; margin-top: auto; padding-top: 12px; border-top: 1px solid #eee8e6; color: #8b838b; font-size: 9px; line-height: 1.5; text-align: left; }
	.demo-disclaimer svg { width: 15px; min-width: 15px; stroke: #99889b; stroke-width: 1.4; stroke-linecap: round; }
	.findings-panel { flex: 1; }
	.findings-heading { padding-bottom: 15px; border-bottom: 1px solid #eee8e6; }
	.findings-heading h3 { margin: 0 0 4px; color: var(--plum); font-size: 14px; }
	.findings-heading p { margin: 0; color: #8b828b; font-size: 10px; }
	.findings-count { padding: 6px 9px; color: #716474; background: #f3edf4; border-radius: 999px; font-size: 9px; white-space: nowrap; }
	.finding-list { display: grid; gap: 13px; margin: 17px 0 0; padding: 0; list-style: none; }
	.finding-list li { display: flex; align-items: flex-start; gap: 10px; }
	.finding-mark { width: 21px; height: 21px; flex: 0 0 21px; display: grid; place-items: center; color: #97545d; background: #f6e4e6; border-radius: 50%; font-size: 12px; font-weight: 700; }
	.mark-caution { color: #8b6b37; background: #f5eedc; }
	.mark-info { color: #64806a; background: #e6f0e8; }
	.finding-list li div { display: grid; gap: 3px; }
	.finding-list li strong { color: #4a404a; font-size: 11px; }
	.finding-list li div span { color: #7f767f; font-size: 10px; line-height: 1.5; }
	.next-step-panel { margin-top: 17px; padding: 23px 25px; border-radius: 17px; }
	.support-panel { display: grid; grid-template-columns: 1fr .88fr; gap: 30px; color: white; background: var(--plum); }
	.next-step-copy { align-items: flex-start; gap: 14px; }
	.next-step-icon { width: 36px; height: 36px; flex: 0 0 36px; display: grid; place-items: center; color: #f1b8c1; background: rgba(255,255,255,.1); border-radius: 11px; font-size: 19px; }
	.next-step-kicker { display: block; margin-bottom: 7px; color: #e3bfcf; font-size: 10px; font-weight: 700; }
	.next-step-copy h3 { margin: 0 0 8px; color: white; font-family: 'Fraunces',Georgia,serif; font-size: 22px; font-weight: 500; line-height: 1.2; }
	.next-step-copy p { max-width: 410px; margin: 0; color: #d4c8d5; font-size: 10px; line-height: 1.65; }
	.support-actions { display: grid; align-content: center; gap: 7px; }
	.support-link { align-items: center; gap: 10px; padding: 9px 11px; color: var(--plum); background: #fffdfb; border-radius: 9px; text-decoration: none; transition: transform 150ms ease; }
	.support-link:hover, .job-source-links a:hover, .course-links a:hover { transform: translateY(-1px); }
	.primary-support { background: #f5e8eb; }
	.hotline-number { width: 37px; height: 32px; flex: 0 0 37px; display: grid; place-items: center; color: var(--guava-dark); background: #f8eaec; border-radius: 8px; font-size: 12px; font-weight: 700; }
	.support-link > span:nth-child(2), .job-source-links a > span:nth-child(2), .course-links a > span:nth-child(2) { display: grid; gap: 3px; }
	.support-link strong, .job-source-links strong, .course-links strong { font-size: 10px; }
	.support-link small, .job-source-links small, .course-links small { color: #857b85; font-size: 9px; }
	.support-arrow { margin-left: auto; color: #a197a0; font-size: 13px; }
	.emergency-link { justify-self: end; padding: 3px 2px; color: #edcbd0; font-size: 9px; text-decoration: underline; text-underline-offset: 3px; }
	.official-jobs { display: grid; grid-template-columns: .85fr 1.15fr; align-items: center; gap: 26px; margin-top: 17px; padding: 22px 25px; background: #e9f0e8; border: 1px solid #d9e5da; border-radius: 16px; }
	.official-jobs h3 { margin: 10px 0 6px; color: var(--plum); font-family: 'Fraunces',Georgia,serif; font-size: 20px; font-weight: 500; line-height: 1.2; }
	.official-jobs p { margin: 0; color: #6d776f; font-size: 10px; line-height: 1.55; }
	.job-source-links { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
	.job-source-links a, .course-links a { align-items: center; gap: 9px; min-width: 0; padding: 11px 10px; color: var(--plum); background: #fffdfb; border: 1px solid rgba(58,32,63,.08); border-radius: 10px; text-decoration: none; transition: transform 150ms ease, border-color 150ms ease; }
	.job-source-links a:hover, .course-links a:hover { border-color: #b7c8b9; }
	.source-mark, .course-icon { width: 31px; height: 31px; flex: 0 0 31px; display: grid; place-items: center; color: white; background: #557c5f; border-radius: 9px; font-family: 'Fraunces',Georgia,serif; font-size: 15px; }
	.source-idt { background: #6b8792; }
	.job-source-links a > span:last-child, .course-links a > span:last-child { margin-left: auto; color: #928895; font-size: 12px; }
	.caution-panel, .learning-panel { display: grid; grid-template-columns: 1fr 1.05fr; align-items: center; gap: 24px; background: #f4eee1; border: 1px solid #ece1c8; }
	.caution-panel .next-step-icon { color: #927547; background: #eae0ca; }
	.caution-panel .next-step-kicker, .learning-panel .next-step-kicker { color: #877249; }
	.caution-panel .next-step-copy h3, .learning-panel .next-step-copy h3 { color: var(--plum); }
	.caution-panel .next-step-copy p, .learning-panel .next-step-copy p { color: #716a67; }
	.compact-links { gap: 8px; }
	.compact-links a { flex: 1; padding: 9px; }
	.learning-panel { background: #e9f0e8; border-color: #d8e5da; }
	.learning-panel .next-step-icon { color: #5d8064; background: #d8e7d9; }
	.learning-panel .next-step-kicker { color: #5f8166; }
	.course-links { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.course-links a { padding: 9px; }
	.course-icon { color: var(--plum); background: #f3e6e7; font-family: 'DM Sans',sans-serif; font-size: 11px; font-weight: 700; }
	.course-icon-lilac { background: #e9ddf0; }
	.result-footnote { margin: 14px 0 0; color: #8c838b; font-size: 9px; line-height: 1.6; }
	.result-footnote a { color: var(--plum-soft); font-weight: 600; text-underline-offset: 3px; }
	.how-section { padding: 100px 22px 94px; }
	.how-heading { text-align: center; }
	.how-heading h2 { margin-top: 16px; font-size: clamp(33px,3.5vw,45px); }
	.how-steps { display: grid; grid-template-columns: 1fr 45px 1fr 45px 1fr; align-items: start; margin-top: 44px; }
	.how-step { text-align: center; }
	.step-symbol { width: 58px; height: 58px; display: grid; place-items: center; margin: 0 auto 18px; border-radius: 19px 19px 19px 5px; transform: rotate(-3deg); }
	.step-symbol svg { width: 30px; stroke: var(--plum); stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; transform: rotate(3deg); }
	.step-symbol-peach { background: #f5e2e3; }
	.step-symbol-lilac { background: var(--lavender); }
	.step-symbol-green { background: var(--mint); }
	.how-step h3 { margin-bottom: 8px; color: var(--plum); font-size: 13px; }
	.how-step p { max-width: 230px; margin: 0 auto; color: #7d747c; font-size: 11px; line-height: 1.65; }
	.step-connector { margin-top: 25px; color: #d4c5d3; font-size: 17px; letter-spacing: 2px; text-align: center; }
	.help-banner { position: relative; display: flex; align-items: center; gap: 19px; padding: 33px 39px; background: #f1e7f1; border-radius: 19px; }
	.help-flower { width: 52px; height: 52px; flex: 0 0 52px; display: grid; place-items: center; color: white; background: var(--plum); border-radius: 50%; font-size: 25px; }
	.help-eyebrow { display: block; margin-bottom: 6px; color: #75617a; font-size: 10px; font-weight: 700; }
	.help-banner h2 { margin: 0; color: var(--plum); font-family: 'Fraunces',Georgia,serif; font-size: 25px; font-weight: 500; line-height: 1.18; }
	.help-button { margin-left: auto; padding: 0 16px; color: white; background: var(--plum); text-decoration: none; white-space: nowrap; }
	.help-button:hover { background: #54355a; }
	.help-button span { color: #f2b8c2; }
	.footer { min-height: 96px; align-items: center; gap: 20px; margin-top: 44px; border-top: 1px solid rgba(58,32,63,.11); }
	.footer-brand .brand-mark { width: 29px; height: 29px; }
	.footer-brand .brand-name { font-size: 13px; }
	.footer p { max-width: 280px; margin: 0; color: #928a92; font-size: 9px; }
	.footer-links { display: flex; gap: 17px; margin-left: auto; }
	.footer-links a { font-size: 10px; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@keyframes breathe { from { opacity: .65; } to { opacity: 1; } }

	@media (max-width: 900px) {
		.topbar, main, .footer { width: min(calc(100% - 42px),720px); }
		.hero { min-height: 500px; grid-template-columns: 1fr .85fr; gap: 0; }
		.hero-copy { padding-left: 0; }
		.hero h1 { font-size: clamp(43px,6vw,58px); }
		.art-caption { right: -5px; padding: 10px 12px; }
		.checker-section { grid-template-columns: .72fr 1.28fr; gap: 5%; padding: 38px 28px; }
		.demo-chip { display: none; }
		.sample-tag { display: none; }
		.support-panel { grid-template-columns: 1fr .9fr; gap: 18px; }
		.official-jobs { grid-template-columns: 1fr; gap: 17px; }
		.footer p { max-width: 210px; line-height: 1.5; }
	}
	@media (max-width: 640px) {
		.topbar, main, .footer { width: calc(100% - 36px); }
		.topbar { height: 71px; }
		.brand-mark { width: 30px; height: 30px; }
		.brand-name { font-size: 14px; }
		.main-nav { display: none; }
		.top-cta { padding: 9px 12px; font-size: 10px; }
		.hero { min-height: auto; grid-template-columns: 1fr; padding: 48px 0 28px; }
		.hero-copy { padding: 0; }
		.hero h1 { max-width: 470px; margin: 18px 0 15px; font-size: clamp(44px,12vw,58px); letter-spacing: -2px; }
		.hero-description { max-width: 430px; font-size: 13px; line-height: 1.7; }
		.hero-note { margin-top: 26px; }
		.hero-art { width: min(84vw,355px); margin-top: 12px; }
		.art-center { width: 126px; height: 126px; }
		.art-center svg { width: 70px; }
		.art-caption { right: -6px; bottom: 15%; }
		.art-side-note { left: 0; top: 22%; }
		.checker-section { grid-template-columns: 1fr; gap: 20px; padding: 31px 18px 20px; border-radius: 19px; }
		.checker-intro h2 { margin-top: 14px; font-size: 34px; }
		.checker-intro p { margin-bottom: 15px; font-size: 12px; }
		.privacy-note { max-width: 100%; padding-top: 12px; }
		.checker-card { padding: 19px 14px 15px; border-radius: 14px; }
		.card-title-wrap { gap: 9px; }
		.card-icon { width: 34px; height: 34px; }
		.card-title-wrap h3 { font-size: 12px; }
		.card-title-wrap p { font-size: 9px; }
		textarea { min-height: 132px; padding: 13px; font-size: 11px; }
		.checker-actions { flex-wrap: wrap; }
		.analyze-button { min-width: 100%; min-height: 46px; }
		.image-button { flex: 1; min-height: 41px; }
		.sample-actions { flex-direction: column; }
		.sample-button { min-height: 38px; }
		.sample-tag { display: inline; }
		.result-section { padding-top: 43px; }
		.result-heading { align-items: flex-start; flex-direction: column; gap: 14px; }
		.result-heading h2 { font-size: 33px; }
		.new-analysis { min-height: 38px; }
		.result-grid { flex-direction: column; }
		.risk-summary { width: 100%; min-width: 0; padding: 20px; }
		.findings-panel { padding: 20px 18px; }
		.next-step-panel { padding: 19px 16px; }
		.support-panel, .caution-panel, .learning-panel { grid-template-columns: 1fr; gap: 17px; }
		.next-step-copy h3 { font-size: 20px; }
		.official-jobs { padding: 19px 16px; }
		.job-source-links, .course-links { grid-template-columns: 1fr; }
		.compact-links { display: grid; grid-template-columns: 1fr; }
		.how-section { padding: 73px 4px 66px; }
		.how-heading h2 { font-size: 36px; }
		.how-steps { grid-template-columns: 1fr; gap: 22px; margin-top: 34px; }
		.how-step { display: grid; grid-template-columns: 54px 1fr; column-gap: 14px; text-align: left; }
		.step-symbol { width: 50px; height: 50px; grid-row: span 2; margin: 0; }
		.step-symbol svg { width: 27px; }
		.how-step h3 { align-self: end; margin: 3px 0 5px; }
		.how-step p { max-width: none; margin: 0; font-size: 10px; }
		.step-connector { display: none; }
		.help-banner { align-items: flex-start; flex-wrap: wrap; gap: 13px; padding: 23px 18px; }
		.help-flower { width: 42px; height: 42px; flex-basis: 42px; font-size: 20px; }
		.help-banner > div:nth-child(2) { flex: 1; }
		.help-banner h2 { font-size: 20px; }
		.help-button { width: 100%; min-height: 42px; margin: 0; }
		.footer { min-height: 140px; flex-wrap: wrap; gap: 8px 13px; margin-top: 29px; padding: 20px 0; }
		.footer p { width: calc(100% - 152px); font-size: 8px; line-height: 1.5; }
		.footer-links { width: 100%; justify-content: flex-start; margin: 5px 0 0 42px; }
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) { scroll-behavior: auto; }
		:global(*), :global(*::before), :global(*::after) { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
	}
</style>

