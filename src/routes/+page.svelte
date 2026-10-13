<script lang="ts">
	import { analyzeVacancy, type Analysis } from '#lib/vaga/index.ts';
	import { partnerVacanciesFor } from '#lib/vaga/partners.ts';

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
	const mockOcrText = examples[0].text;

	let jobText = $state('');
	let result = $state<Analysis | null>(null);
	let analyzing = $state(false);
	let errorMessage = $state('');
	let imageName = $state('');
	let imageUrl = $state('');
	let ocrState = $state<'idle' | 'reading' | 'ready'>('idle');
	let selectedHelpline = $state<'180' | '100'>('180');
	let showPartners = $state(false);
	let ocrTimer: number | undefined;
	let fileInput: HTMLInputElement;

	const detectedRoleTerm = $derived.by(() => {
		if (!result) return '';
		const role = result.facts.roles[0];
		return role ? jobText.slice(role.start, role.end).trim() : result.role;
	});
	const partnerRecommendations = $derived(
		result && result.level !== 'baixo' ? partnerVacanciesFor(result.role) : []
	);
	function useExample(text: string) {
		removeImage();
		ocrState = 'idle';
		jobText = text;
		result = null;
		showPartners = false;
		errorMessage = '';
	}

	function beginMockOcr() {
		if (ocrTimer !== undefined) window.clearTimeout(ocrTimer);
		jobText = '';
		ocrState = 'reading';
		ocrTimer = window.setTimeout(() => {
			jobText = mockOcrText;
			ocrState = 'ready';
			ocrTimer = undefined;
		}, 950);
	}

	function selectImage(url: string, name: string) {
		if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
		imageUrl = url;
		imageName = name;
		result = null;
		showPartners = false;
		errorMessage = '';
		beginMockOcr();
	}

	function handleImageSelect(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			errorMessage = 'Selecione um arquivo de imagem para continuar.';
			input.value = '';
			return;
		}
		selectImage(URL.createObjectURL(file), file.name);
	}

	function useMockPrint() {
		if (fileInput) fileInput.value = '';
		selectImage('/images/print-vaga-exemplo.svg', 'Print de exemplo');
	}

	function removeImage() {
		if (ocrTimer !== undefined) window.clearTimeout(ocrTimer);
		ocrTimer = undefined;
		if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
		imageUrl = '';
		imageName = '';
		if (ocrState === 'reading') ocrState = 'idle';
		if (fileInput) fileInput.value = '';
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
			result = analyzeVacancy(jobText);
			showPartners = false;
			analyzing = false;
			window.setTimeout(() => {
				document.getElementById('analise-resultado')?.scrollIntoView({
					behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
						? 'auto'
						: 'smooth',
					block: 'start'
				});
			}, 50);
		}, 350);
	}

	const levelLabel = { alto: 'Risco alto', atencao: 'Atenção', baixo: 'Poucos alertas' } as const;
	const scalePos = (score: number) => `${((score - 10) / 80) * 100}%`;

	function startOver() {
		jobText = '';
		result = null;
		showPartners = false;
		errorMessage = '';
		removeImage();
		ocrState = 'idle';
		const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
			? 'auto'
			: 'smooth';
		document.getElementById('verificador')?.scrollIntoView({ behavior, block: 'center' });
		document.getElementById('job-text')?.focus({ preventScroll: true });
	}

	function handleHelplineTabKeydown(event: KeyboardEvent) {
		let nextTab: '180' | '100' | undefined;
		if (event.key === 'ArrowRight') nextTab = selectedHelpline === '180' ? '100' : '180';
		if (event.key === 'ArrowLeft') nextTab = selectedHelpline === '100' ? '180' : '100';
		if (event.key === 'Home') nextTab = '180';
		if (event.key === 'End') nextTab = '100';
		if (!nextTab) return;

		event.preventDefault();
		selectedHelpline = nextTab;
		requestAnimationFrame(() => document.getElementById(`helpline-tab-${nextTab}`)?.focus());
	}
</script>

<svelte:head>
	<title>Esp.IA | Espião de Propostas</title>
	<meta name="description" content="Confira sinais de alerta em uma oferta de trabalho." />
	<meta name="theme-color" content="#fbf8f5" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-shell">
	<header class="app-header">
		<a class="brand" href="#verificador" aria-label="Vaga Segura">
			<span class="text-lg sm:text-xl"><strong>Esp.IA</strong></span>
		</a>
		<div class="size-12 sm:size-14 rounded-lg">
			<img src="/images/ods5.png" alt="" aria-hidden="true" class="rounded-lg" />
		</div>
	</header>

	<main>
		<section class="mb-6">
			<h1>Antes de aceitar,<br /><em>cheque a proposta.</em></h1>
			<p class="intro-copy">
				Cole a mensagem ou o texto do anúncio. Vou destacar sinais de alerta e sugerir um próximo
				passo.
			</p>
		</section>

		<section class="checker-card" id="verificador" aria-labelledby="checker-title">
			<div class="card-heading">
				<div>
					<h2 id="checker-title">Texto da oportunidade</h2>
					<p>Cole o texto ou anexe um print. Não inclua seus dados pessoais.</p>
				</div>
			</div>

			{#if imageUrl}
				<div class="attachment-preview">
					<img src={imageUrl} alt="Prévia do print anexado" />
					<div class="attachment-info">
						<strong>{imageName}</strong>
						<span
							>{imageName === 'Print de exemplo'
								? 'Imagem fictícia para demonstração'
								: 'Prévia da imagem selecionada'}</span
						>
					</div>
					<button
						class="remove-attachment"
						type="button"
						onclick={removeImage}
						aria-label="Remover imagem">×</button
					>
				</div>
			{/if}

			{#if ocrState !== 'idle'}
				<div
					class="ocr-status"
					class:ocr-is-reading={ocrState === 'reading'}
					class:ocr-is-ready={ocrState === 'ready'}
					id="ocr-status"
					role="status"
					aria-live="polite"
				>
					<span class="ocr-status-mark" aria-hidden="true"
						>{ocrState === 'reading' ? '…' : '✓'}</span
					>
					<span
						>{ocrState === 'reading'
							? 'Simulando leitura do print…'
							: 'Transcrição fictícia pré-carregada; o texto não foi extraído da imagem. Revise antes de analisar.'}</span
					>
				</div>
			{/if}

			<label class="visually-hidden" for="job-text">Texto da vaga para analisar</label>
			<textarea
				id="job-text"
				bind:value={jobText}
				placeholder="Cole aqui a vaga ou a mensagem que você recebeu…"
				aria-describedby={ocrState === 'idle' ? 'input-help' : 'input-help ocr-status'}
				readonly={ocrState === 'reading'}
				oninput={() => {
					result = null;
					showPartners = false;
					errorMessage = '';
				}}></textarea>
			<div class="input-meta" id="input-help">
				<span>Você pode editar o texto antes de analisar.</span>
				<span>{jobText.length} caracteres</span>
			</div>

			{#if errorMessage}<p class="input-error" role="alert">{errorMessage}</p>{/if}

			<div class="actions">
				<button
					class="analyze-button"
					type="button"
					onclick={analyze}
					disabled={analyzing || ocrState === 'reading'}
				>
					{#if analyzing}
						<span class="button-spinner" aria-hidden="true"></span> Analisando…
					{:else if ocrState === 'reading'}
						<span class="button-spinner" aria-hidden="true"></span> Simulando OCR…
					{:else}
						<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle cx="10.8" cy="10.8" r="7.4" />
							<path d="m16.2 16.2 4.3 4.3M8 11.1l1.9 1.9 4-4.1" />
						</svg>
						Analisar oportunidade
					{/if}
				</button>
				<input
					bind:this={fileInput}
					class="file-input"
					type="file"
					accept="image/*"
					aria-label="Selecionar print da vaga"
					onchange={handleImageSelect}
				/>
				<button class="image-button" type="button" onclick={() => fileInput?.click()}>
					<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<rect x="3.5" y="4" width="17" height="16" rx="2.5" />
						<circle cx="9" cy="9.5" r="1.7" />
						<path d="m5 17 4.7-4.5 3.1 2.8 2.1-2 4.1 3.7" />
					</svg>
					Anexar print
				</button>
			</div>

			<div class="examples">
				<span>Experimente:</span>
				{#each examples as example (example.label)}
					<button type="button" class="example-button" onclick={() => useExample(example.text)}
						>{example.label}</button
					>
				{/each}
				<button type="button" class="example-button" onclick={useMockPrint}>Print de exemplo</button
				>
			</div>

			{#if analyzing}
				<div class="analysis-loading" role="status" aria-live="polite">
					<span class="loading-mark">✳</span>
					<div>
						<strong>Conferindo os sinais</strong><span
							>A análise roda no seu aparelho; o texto não é enviado.</span
						>
					</div>
				</div>
			{/if}
		</section>

		{#if result}
			<section
				class="result-card"
				id="analise-resultado"
				class:risk-high={result.level === 'alto'}
				class:risk-medium={result.level === 'atencao'}
				class:risk-low={result.level === 'baixo'}
				aria-live="polite"
			>
				<div class="result-summary">
					<div class="score" aria-label="Nota de risco {result.score} de 90">
						<strong>{result.score}</strong><span>/90</span>
					</div>
					<div class="summary-copy">
						<span class="risk-label">{levelLabel[result.level]}</span>
						<h2>{result.summary}</h2>
					</div>
					<button class="new-analysis" type="button" onclick={startOver}>Limpar</button>
				</div>

				<div class="scale" aria-hidden="true">
					<div class="scale-track">
						<span class="scale-marker" style:left={scalePos(result.score)}></span>
					</div>
					<div class="scale-labels"><span>Baixo</span><span>Atenção</span><span>Alto</span></div>
				</div>

				<p class="breakdown">
					Soma dos pesos: <strong>{result.rawPoints}</strong> ·
					{result.signals.length}
					{result.signals.length === 1 ? 'sinal encontrado' : 'sinais encontrados'}
					{#if result.criticalCount}
						· <strong
							>{result.criticalCount} {result.criticalCount === 1 ? 'crítico' : 'críticos'}</strong
						>
					{/if}
				</p>
				{#if result.escalations.length}
					<ul class="escalations">
						{#each result.escalations as esc (esc.rule)}
							<li>{esc.label}</li>
						{/each}
					</ul>
				{/if}

				<div class="findings">
					<h3>Sinais encontrados</h3>
					{#if result.signals.length}
						<ul>
							{#each result.signals as s (s.signal.id)}
								<li>
									<span
										class="finding-mark"
										class:mark-alert={s.signal.critical || s.signal.weight >= 4}
										class:mark-caution={!s.signal.critical && s.signal.weight < 4}
										aria-hidden="true">{s.signal.critical ? '!' : '·'}</span
									>
									<div>
										<strong>
											{s.signal.title}
											<span class="weight">+{s.signal.weight}</span>
											{#if s.signal.critical}<span class="critical-tag">crítico</span>{/if}
										</strong>
										<span>{s.signal.why}</span>
										{#each s.evidence as e (e.start)}
											<q class="evidence"
												>{#each e.parts as part, i (i)}{#if part.mark}<mark>{part.text}</mark
														>{:else}{part.text}{/if}{/each}</q
											>
										{/each}
										{#each s.notes as note (note)}<small class="note">{note}</small>{/each}
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="empty-findings">Nenhum sinal da nossa lista apareceu neste texto.</p>
					{/if}
				</div>

				{#if result.review.length}
					<div class="findings review">
						<h3>Pontos para conferir <span>(não somam pontos)</span></h3>
						<ul>
							{#each result.review as s (s.signal.id)}
								<li>
									<span class="finding-mark mark-info" aria-hidden="true">?</span>
									<div>
										<strong>{s.signal.title}</strong>
										{#each s.notes as note (note)}<span>{note}</span>{/each}
										{#each s.evidence as e (e.start)}
											<q class="evidence"
												>{#each e.parts as part, i (i)}{#if part.mark}<mark>{part.text}</mark
														>{:else}{part.text}{/if}{/each}</q
											>
										{/each}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if result.level === 'alto'}
					<div class="next-step support-panel" id="rede-de-apoio">
						<div>
							<span class="next-kicker">Você não precisa passar por isso sozinha</span>
							<h3>Pause e procure orientação antes de responder.</h3>
							<p>{result.action} Guarde as mensagens e converse com alguém de confiança.</p>
						</div>
						<div class="support-links">
							<a href="tel:180"><strong>180</strong><span>Disque 180 · orientação e apoio</span></a>
							<a href="tel:100"><strong>100</strong><span>Disque 100 · denúncias</span></a>
							<a class="urgent-link" href="tel:190">Em perigo imediato? Ligue 190</a>
						</div>
						<div class="job-links">
							<span>Buscar vagas em canais oficiais</span>
							<a
								href="https://www.gov.br/pt-br/servicos/buscar-emprego-no-sistema-nacional-de-emprego-sine"
								target="_blank"
								rel="noreferrer">SINE ↗</a
							>
							<a href="https://idt.org.br/vagas-disponiveis" target="_blank" rel="noreferrer"
								>IDT/SINE ↗</a
							>
						</div>
					</div>
				{:else if result.level === 'atencao'}
					<div class="next-step caution-panel">
						<div>
							<span class="next-kicker">Antes de responder</span>
							<h3>Confirme os dados da empresa.</h3>
							<p>{result.action}</p>
						</div>
						<a class="simple-link" href="tel:180">Precisa conversar? Ligue 180</a>
					</div>
				{:else}
					<div class="next-step learning-panel">
						<div>
							<span class="next-kicker">Um próximo passo para {result.role}</span>
							<h3>Explore uma formação gratuita.</h3>
							<p>{result.action}</p>
						</div>
						<a
							class="simple-link"
							href="https://www.ev.org.br/cursos/atendimento-ao-publico"
							target="_blank"
							rel="noreferrer">Atendimento ao Público · Fundação Bradesco ↗</a
						>
					</div>
				{/if}
				{#if result.level !== 'baixo'}
					<div class="partner-recs">
						<button
							class="partner-recs-toggle"
							type="button"
							aria-expanded={showPartners}
							aria-controls="partner-recs-panel"
							onclick={() => (showPartners = !showPartners)}
						>
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<circle cx="10.8" cy="10.8" r="7.4" />
								<path d="m16.2 16.2 4.3 4.3M8 11.1l1.9 1.9 4-4.1" />
							</svg>
							{showPartners
								? 'Ocultar vagas de parceiros'
								: 'Reconhecer função e ver vagas de parceiros'}
						</button>
						{#if showPartners}
							<div
								class="partner-recs-panel"
								id="partner-recs-panel"
								role="region"
								aria-label="Vagas de empresas parceiras"
							>
								<p class="partner-recs-role">
									{#if detectedRoleTerm}
										Função reconhecida: <strong>{detectedRoleTerm}</strong>
									{:else}
										Não identificamos uma função específica neste texto. Veja vagas de empresas
										parceiras abaixo.
									{/if}
								</p>
								<ul>
									{#each partnerRecommendations as v (v.id)}
										<li>
											<div class="partner-vacancy-heading">
												<strong>{v.title}</strong>
												<span class="verified-tag">✓ Verificado</span>
											</div>
											<span class="partner-company">{v.company}</span>
											<span class="partner-meta">{v.location} · {v.modality} · {v.salary}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{/if}
				<p class="disclaimer">
					Resultado indicativo. Não confirma
					se a vaga é legítima ou fraudulenta.
				</p>
			</section>
		{/if}

		<section
			class="helpline-section"
			id="canais-de-apoio"
			aria-label="Canais de orientação e denúncia"
		>
			<div
				class="helpline-tabs"
				role="tablist"
				aria-label="Escolha um canal"
				tabindex="-1"
				onkeydown={handleHelplineTabKeydown}
			>
				<button
					id="helpline-tab-180"
					class="helpline-tab"
					class:active={selectedHelpline === '180'}
					role="tab"
					aria-selected={selectedHelpline === '180'}
					aria-controls="helpline-panel-180"
					tabindex={selectedHelpline === '180' ? 0 : -1}
					onclick={() => (selectedHelpline = '180')}>Disque 180</button
				>
				<button
					id="helpline-tab-100"
					class="helpline-tab"
					class:active={selectedHelpline === '100'}
					role="tab"
					aria-selected={selectedHelpline === '100'}
					aria-controls="helpline-panel-100"
					tabindex={selectedHelpline === '100' ? 0 : -1}
					onclick={() => (selectedHelpline = '100')}>Disque 100</button
				>
			</div>

			<div
				class="helpline-panel"
				id="helpline-panel-180"
				role="tabpanel"
				aria-labelledby="helpline-tab-180"
				hidden={selectedHelpline !== '180'}
			>
				{#if selectedHelpline === '180'}
					<div class="helpline-intro">
						<div class="helpline-copy">
							<p class="helpline-kicker">Apoio e informação</p>
							<h2 id="helpline-title-180">Você pode buscar orientação pelo Ligue 180.</h2>
							<p>
								A Central orienta sobre direitos e serviços de atendimento à mulher. Você pode ligar
								para tirar dúvidas ou pedir ajuda para encontrar um serviço perto de você.
							</p>
						</div>
						<a class="helpline-number" href="tel:180" aria-label="Ligar para o Ligue 180">
							<span>Disque</span>
							<strong>180</strong>
							<span>gratuito · 24 horas</span>
						</a>
					</div>

					<div class="helpline-video">
						<iframe
							src="https://www.youtube-nocookie.com/embed/y9ysRfE4rPk?rel=0"
							title="Vídeo sobre a Central de Atendimento à Mulher Ligue 180"
							loading="lazy"
							referrerpolicy="strict-origin-when-cross-origin"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						></iframe>
					</div>

					<div class="helpline-details">
						<div class="helpline-how">
							<h3>Como ligar</h3>
							<ol>
								<li>Abra o aplicativo Telefone do celular ou use um telefone fixo.</li>
								<li>Digite <strong>180</strong> e toque no botão para ligar.</li>
								<li>Peça orientação, tire dúvidas ou conte o que está acontecendo.</li>
							</ol>
							<p>Você também pode ligar para buscar orientação para outra mulher.</p>
						</div>
						<div class="helpline-actions">
							<a
								class="helpline-primary"
								href="https://www.gov.br/mulheres/pt-br/ligue180"
								target="_blank"
								rel="noreferrer">Conheça a Central e os serviços disponíveis</a
							>
							<a class="helpline-secondary" href="tel:180">Ligar para 180</a>
							<a
								class="helpline-secondary"
								href="https://wa.me/556196100180"
								target="_blank"
								rel="noreferrer">Conversar pelo WhatsApp</a
							>
							<p class="helpline-emergency">
								Se houver perigo imediato ou uma agressão estiver acontecendo, ligue <a
									href="tel:190">190</a
								>.
							</p>
						</div>
					</div>
				{/if}
			</div>
			<div
				class="helpline-panel"
				id="helpline-panel-100"
				role="tabpanel"
				aria-labelledby="helpline-tab-100"
				hidden={selectedHelpline !== '100'}
			>
				{#if selectedHelpline === '100'}
					<div class="helpline-intro">
						<div class="helpline-copy">
							<p class="helpline-kicker">Denúncias de violações de direitos</p>
							<h2 id="helpline-title-100">O Disque 100 recebe relatos e denúncias.</h2>
							<p>
								Você pode relatar uma violação de direitos humanos vivida por você ou por outra
								pessoa.
							</p>
						</div>
						<a class="helpline-number" href="tel:100" aria-label="Ligar para o Disque 100">
							<span>Disque</span>
							<strong>100</strong>
							<span>gratuito · 24 horas</span>
						</a>
					</div>

					<div class="helpline-video">
						<iframe
							src="https://www.youtube-nocookie.com/embed/ucWMs-gRLaY?rel=0"
							title="Vídeo sobre o Disque Direitos Humanos 100"
							loading="lazy"
							referrerpolicy="strict-origin-when-cross-origin"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						></iframe>
					</div>

					<div class="helpline-details">
						<div class="helpline-how">
							<h3>Você pode ligar mesmo sem ser a vítima</h3>
							<p>
								O atendimento é gratuito, funciona 24 horas e recebe relatos de qualquer pessoa.
							</p>
						</div>
						<div class="helpline-actions">
							<a
								class="helpline-primary"
								href="https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos"
								target="_blank"
								rel="noreferrer">Saiba como fazer uma denúncia</a
							>
							<a class="helpline-secondary" href="tel:100">Ligar para 100</a>
							<p class="helpline-emergency">Em perigo imediato, ligue <a href="tel:190">190</a>.</p>
						</div>
					</div>
				{/if}
			</div>
		</section>
	</main>
</div>
<img class="maria-mascot" src="/images/maria.png" alt="Maria, personagem do Vaga Segura" />

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(html) {
		scroll-behavior: smooth;
		scroll-padding-top: 24px;
	}
	:global(body) {
		margin: 0;
		color: #352d35;
		background: #fbf8f5;
		font-family: 'DM Sans', sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	:global(button),
	:global(textarea) {
		font: inherit;
	}
	:global(a:focus-visible),
	:global(button:focus-visible),
	:global(textarea:focus-visible),
	:global(input:focus-visible) {
		outline: 3px solid #bd5268;
		outline-offset: 3px;
	}

	.app-shell {
		--plum: #3a203f;
		--berry: #b94e64;
		--guava: #d9707c;
		--paper: #fbf8f5;
		--muted: #777078;
		width: min(100%, 880px);
		min-height: 100vh;
		margin: 0 auto;
		padding: 0 24px 64px;
	}
	.maria-mascot {
		position: fixed;
		right: 16px;
		bottom: max(18px, env(safe-area-inset-bottom));
		z-index: 20;
		width: clamp(72px, 8vw, 100px);
		height: auto;
		object-fit: contain;
		pointer-events: none;
	}
	.app-header {
		min-height: 74px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 auto;
		border-bottom: 1px solid #e9e1df;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		color: var(--plum);
		font-size: 15px;
		letter-spacing: -0.4px;
		text-decoration: none;
	}
	.brand strong {
		font-weight: 700;
	}
	.brand-mark {
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
	}
	.brand-mark svg {
		width: 100%;
		stroke: var(--berry);
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	main {
		margin: 32px 0;
	}
	#verificador {
		scroll-margin-top: 18px;
	}
	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}
	h1 {
		margin-bottom: 10px;
		color: var(--plum);
		font-family: 'Fraunces', Georgia, serif;
		font-size: clamp(32px, 5vw, 43px);
		font-weight: 500;
		letter-spacing: -1.4px;
		line-height: 1.08;
	}
	h1 em {
		color: var(--berry);
		font-style: normal;
	}
	.intro-copy {
		max-width: 540px;
		margin: 0;
		color: #706770;
		font-size: 13px;
		line-height: 1.6;
	}
	.checker-card,
	.result-card {
		padding: 22px;
		background: #fffdfb;
		border: 1px solid #ebe4e2;
		border-radius: 15px;
		box-shadow: 0 8px 24px rgba(58, 32, 63, 0.04);
	}
	.card-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 13px;
	}
	.card-heading h2 {
		margin: 0 0 3px;
		color: var(--plum);
		font-size: 14px;
	}
	.card-heading p {
		margin: 0;
		color: #8c848b;
		font-size: 10px;
	}
	.local-note {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #778778;
		font-size: 9px;
		white-space: nowrap;
	}
	.local-note span {
		width: 6px;
		height: 6px;
		background: #84a289;
		border-radius: 50%;
	}
	textarea {
		width: 100%;
		min-height: 150px;
		padding: 13px 14px;
		resize: vertical;
		color: #453e46;
		background: white;
		border: 1px solid #e9e1df;
		border-radius: 9px;
		font-size: 12px;
		line-height: 1.65;
	}
	textarea::placeholder {
		color: #a59ca3;
	}
	textarea:focus {
		border-color: #b886a8;
		outline: none;
		box-shadow: 0 0 0 3px rgba(184, 134, 168, 0.12);
	}
	.input-meta {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin-top: 6px;
		color: #978e96;
		font-size: 9px;
	}
	.visually-hidden,
	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	.attachment-preview {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 0 12px;
		padding: 10px;
		background: #f4f0f3;
		border-radius: 9px;
	}
	.attachment-preview img {
		width: 80px;
		height: 100px;
		flex: 0 0 80px;
		object-fit: contain;
		object-position: top;
		border-radius: 6px;
		background: white;
	}
	.attachment-info {
		min-width: 0;
		display: grid;
		gap: 3px;
	}
	.attachment-info strong {
		overflow: hidden;
		color: var(--plum);
		font-size: 10px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.attachment-info span {
		color: #7c747d;
		font-size: 9px;
	}
	.remove-attachment {
		width: 28px;
		height: 28px;
		margin-left: auto;
		color: #766b75;
		background: transparent;
		border: 0;
		border-radius: 50%;
		font-size: 19px;
		cursor: pointer;
	}
	.ocr-status {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 0 0 10px;
		padding: 9px 11px;
		color: #655968;
		background: #f5eff6;
		border-radius: 8px;
		font-size: 10px;
		line-height: 1.5;
	}
	.ocr-status-mark {
		width: 17px;
		height: 17px;
		flex: 0 0 17px;
		display: grid;
		place-items: center;
		color: #8b668c;
		background: #e9dfea;
		border-radius: 50%;
		font-size: 11px;
		font-weight: 700;
	}
	.ocr-is-ready {
		color: #526b56;
		background: #edf3ed;
	}
	.ocr-is-ready .ocr-status-mark {
		color: #55785c;
		background: #dce9dd;
	}
	.ocr-is-reading .ocr-status-mark {
		color: var(--berry);
		animation: breathe 700ms ease-in-out infinite alternate;
	}
	.input-error {
		margin: 9px 0 0;
		color: #a73b4f;
		font-size: 11px;
	}
	.actions {
		display: flex;
		gap: 9px;
		margin-top: 14px;
	}
	.analyze-button,
	.image-button,
	.new-analysis {
		min-height: 42px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 0 14px;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition:
			background 150ms ease,
			transform 150ms ease;
	}
	.analyze-button {
		flex: 1;
		color: white;
		background: var(--plum);
		border: 1px solid var(--plum);
	}
	.analyze-button:hover:not(:disabled) {
		background: #512e58;
		transform: translateY(-1px);
	}
	.analyze-button:disabled {
		opacity: 0.8;
		cursor: wait;
	}
	.analyze-button svg,
	.image-button svg {
		width: 16px;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.button-spinner {
		width: 13px;
		height: 13px;
		border: 2px solid rgba(255, 255, 255, 0.4);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}
	.image-button {
		color: #655968;
		background: white;
		border: 1px solid #ded5dd;
	}
	.image-button:hover {
		background: #f7f2f7;
	}
	.examples {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 15px;
		color: #8f858d;
		font-size: 9px;
	}
	.example-button {
		padding: 6px 9px;
		color: #615762;
		background: #f8f4f4;
		border: 1px solid #ece5e5;
		border-radius: 999px;
		font-size: 9px;
		cursor: pointer;
	}
	.example-button:hover {
		background: #f3e8ed;
		border-color: #dfc9d1;
	}
	.analysis-loading {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-top: 14px;
		padding: 10px 12px;
		background: #f5eff6;
		border-radius: 8px;
	}
	.loading-mark {
		color: var(--berry);
		font-size: 18px;
		animation: breathe 800ms ease-in-out infinite alternate;
	}
	.analysis-loading div {
		display: grid;
		gap: 3px;
	}
	.analysis-loading strong {
		color: var(--plum);
		font-size: 10px;
	}
	.analysis-loading div span {
		color: #807580;
		font-size: 9px;
	}

	.result-card {
		margin-top: 16px;
		scroll-margin-top: 20px;
	}
	.result-summary {
		display: flex;
		align-items: center;
		gap: 13px;
	}
	.score {
		width: 52px;
		height: 52px;
		flex: 0 0 52px;
		display: flex;
		align-items: baseline;
		justify-content: center;
		padding-top: 12px;
		color: #587b60;
		background: #e9f0e8;
		border-radius: 50%;
	}
	.risk-high .score {
		color: #a43f53;
		background: #f7e5e8;
	}
	.risk-medium .score {
		color: #896d37;
		background: #f5efdf;
	}
	.score strong {
		font-family: 'Fraunces', Georgia, serif;
		font-size: 19px;
		font-weight: 500;
	}
	.score span {
		margin-left: 1px;
		font-size: 8px;
	}
	.summary-copy {
		flex: 1;
	}
	.risk-label {
		display: inline-block;
		margin-bottom: 4px;
		color: #65836b;
		font-size: 10px;
		font-weight: 700;
	}
	.risk-high .risk-label {
		color: #ac4659;
	}
	.risk-medium .risk-label {
		color: #92743e;
	}
	.summary-copy h2 {
		margin: 0;
		color: var(--plum);
		font-size: 13px;
		font-weight: 600;
		line-height: 1.45;
	}
	.new-analysis {
		min-height: 34px;
		padding: 0 11px;
		color: #655968;
		background: white;
		border: 1px solid #ded5dd;
	}
	.new-analysis:hover {
		background: #f7f2f7;
	}
	.findings {
		margin-top: 17px;
		padding-top: 15px;
		border-top: 1px solid #eee8e6;
	}
	.findings h3 {
		margin-bottom: 11px;
		color: var(--plum);
		font-size: 11px;
	}
	.findings ul {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.findings li {
		display: flex;
		align-items: flex-start;
		gap: 9px;
	}
	.findings li div {
		display: grid;
		gap: 3px;
	}
	.findings li strong {
		color: #4a404a;
		font-size: 10px;
	}
	.findings li div span {
		color: #7f767f;
		font-size: 11px;
		line-height: 1.5;
	}
	.finding-mark {
		width: 19px;
		height: 19px;
		flex: 0 0 19px;
		display: grid;
		place-items: center;
		color: #97545d;
		background: #f6e4e6;
		border-radius: 50%;
		font-size: 11px;
		font-weight: 700;
	}
	.mark-caution {
		color: #8b6b37;
		background: #f5eedc;
	}
	.mark-info {
		color: #64806a;
		background: #e6f0e8;
	}
	.scale {
		margin-top: 14px;
	}
	.scale-track {
		position: relative;
		height: 6px;
		border-radius: 999px;
		background: linear-gradient(90deg, #cfe0d1 0 33.3%, #ecdcb5 33.3% 66.6%, #eec3cb 66.6% 100%);
	}
	.scale-marker {
		position: absolute;
		top: 50%;
		width: 14px;
		height: 14px;
		border: 3px solid var(--plum);
		border-radius: 50%;
		background: #fffdfb;
		transform: translate(-50%, -50%);
	}
	.scale-labels {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		margin-top: 5px;
		color: #8c838b;
		font-size: 9px;
		text-align: center;
	}
	.breakdown {
		margin: 12px 0 0;
		color: #706770;
		font-size: 10px;
	}
	.breakdown strong {
		color: var(--plum);
	}
	.escalations {
		margin: 8px 0 0;
		padding: 9px 11px 9px 26px;
		color: #8f3346;
		background: #f9eaec;
		border-radius: 8px;
		font-size: 10px;
		line-height: 1.5;
	}
	.findings li div .weight {
		margin-left: 4px;
		padding: 1px 5px;
		color: #6b5f6b;
		background: #f1ecf0;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 600;
	}
	.findings li div .critical-tag {
		margin-left: 4px;
		padding: 1px 6px;
		color: white;
		background: #a43f53;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.evidence {
		display: block;
		margin-top: 3px;
		padding: 6px 9px;
		color: #5e555e;
		background: #faf6f4;
		border-left: 2px solid #dcc9cf;
		border-radius: 0 6px 6px 0;
		font-size: 11px;
		font-style: normal;
		line-height: 1.5;
		quotes: none;
	}
	.evidence mark {
		padding: 0 2px;
		color: #7d2c3d;
		background: #f6dce1;
		border-radius: 3px;
	}
	.note {
		color: #8a7f89;
		font-size: 10px;
		line-height: 1.45;
	}
	.empty-findings {
		margin: 0;
		color: #7f767f;
		font-size: 11px;
	}
	.review h3 span {
		color: #978e96;
		font-weight: 400;
	}
	.review .evidence mark {
		color: #5f5a3c;
		background: #efe8cf;
	}
	.next-step {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 15px;
		margin-top: 17px;
		padding: 15px;
		border-radius: 10px;
	}
	.next-step h3 {
		margin: 3px 0 5px;
		color: var(--plum);
		font-family: 'Fraunces', Georgia, serif;
		font-size: 18px;
		font-weight: 500;
		line-height: 1.2;
	}
	.next-step p {
		margin: 0;
		color: #706770;
		font-size: 11px;
		line-height: 1.55;
	}
	.next-kicker {
		color: #667e69;
		font-size: 10px;
		font-weight: 700;
	}
	.learning-panel {
		background: #e9f0e8;
	}
	.caution-panel {
		background: #f5f0e5;
	}
	.caution-panel .next-kicker {
		color: #92743e;
	}
	.support-panel {
		grid-template-columns: 1fr 190px;
		color: white;
		background: var(--plum);
	}
	.support-panel h3 {
		color: white;
	}
	.support-panel p,
	.support-panel .next-kicker {
		color: #e3cbdc;
	}
	.support-links {
		display: grid;
		gap: 6px;
	}
	.support-links a {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 9px;
		color: var(--plum);
		background: #fffdfb;
		border-radius: 7px;
		text-decoration: none;
	}
	.support-links a strong {
		width: 27px;
		color: var(--berry);
		font-size: 11px;
	}
	.support-links a span {
		font-size: 10px;
	}
	.support-links .urgent-link {
		justify-content: flex-end;
		padding: 3px 0;
		color: #f3d7dc;
		background: transparent;
		font-size: 9px;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.job-links {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 11px;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}
	.job-links > span {
		margin-right: auto;
		color: #e3cbdc;
		font-size: 9px;
	}
	.job-links a,
	.simple-link {
		color: var(--plum);
		background: #fffdfb;
		border-radius: 999px;
		padding: 7px 10px;
		font-size: 9px;
		font-weight: 700;
		text-decoration: none;
	}
	.simple-link {
		justify-self: end;
	}
	.partner-recs {
		margin-top: 14px;
	}
	.partner-recs-toggle {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		color: var(--plum);
		background: #f3ecf4;
		border: 1px solid #e0d2e2;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		transition: background 150ms ease;
	}
	.partner-recs-toggle:hover {
		background: #ece0ee;
	}
	.partner-recs-toggle svg {
		width: 15px;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.partner-recs-panel {
		margin-top: 10px;
		padding: 14px;
		background: #faf7fb;
		border: 1px solid #e9e1e9;
		border-radius: 10px;
	}
	.partner-recs-role {
		margin: 0 0 10px;
		color: #5a5160;
		font-size: 11px;
	}
	.partner-recs-role strong {
		color: var(--plum);
	}
	.partner-recs-panel ul {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.partner-recs-panel li {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 10px 12px;
		background: white;
		border: 1px solid #ece4ec;
		border-radius: 8px;
	}
	.partner-vacancy-heading {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.partner-vacancy-heading strong {
		color: var(--plum);
		font-size: 11px;
	}
	.verified-tag {
		padding: 1px 6px;
		color: #3f6b45;
		background: #e9f0e8;
		border-radius: 999px;
		font-size: 9px;
		font-weight: 700;
	}
	.partner-company {
		color: #5a5160;
		font-size: 10px;
		font-weight: 600;
	}
	.partner-meta {
		color: #807680;
		font-size: 10px;
	}
	.disclaimer {
		margin: 12px 0 0;
		color: #8c838b;
		font-size: 10px;
		line-height: 1.5;
	}
	.helpline-section {
		margin-top: 24px;
		padding: 24px;
		color: #fffaf8;
		background: var(--plum);
		border-radius: 16px;
	}
	.helpline-tabs {
		display: flex;
		width: fit-content;
		gap: 4px;
		margin-bottom: 20px;
		padding: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 11px;
	}
	.helpline-tab {
		min-height: 36px;
		padding: 8px 16px;
		color: #f1e9f0;
		background: transparent;
		border: 0;
		border-radius: 8px;
		font: inherit;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}
	.helpline-tab[aria-selected='true'] {
		color: var(--plum);
		background: #fffaf8;
	}
	.helpline-tab:focus-visible {
		outline: 2px solid #f0b9c2;
		outline-offset: 2px;
	}
	.helpline-intro {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 18px;
	}
	.helpline-copy {
		max-width: 570px;
	}
	.helpline-kicker {
		margin: 0 0 7px;
		color: #f0b9c2;
		font-size: 11px;
		font-weight: 700;
	}
	.helpline-copy h2 {
		max-width: 520px;
		margin: 0 0 8px;
		font-family: 'Fraunces', Georgia, serif;
		font-size: clamp(25px, 4vw, 34px);
		font-weight: 500;
		letter-spacing: -0.7px;
		line-height: 1.12;
	}
	.helpline-copy > p:last-child {
		max-width: 560px;
		margin: 0;
		color: #e8dce8;
		font-size: 12px;
		line-height: 1.6;
	}
	.helpline-number {
		flex: 0 0 auto;
		display: grid;
		justify-items: center;
		gap: 1px;
		min-width: 126px;
		padding: 10px 14px 11px;
		color: #fffaf8;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 12px;
		text-decoration: none;
	}
	.helpline-number span {
		color: #e8dce8;
		font-size: 9px;
	}
	.helpline-number strong {
		color: #fffaf8;
		font-family: 'Fraunces', Georgia, serif;
		font-size: 38px;
		font-weight: 600;
		line-height: 1;
	}
	.helpline-video {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		background: #211527;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
	}
	.helpline-video iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}
	.helpline-details {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(230px, 0.9fr);
		gap: 24px;
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}
	.helpline-how h3 {
		margin: 0 0 10px;
		color: #fffaf8;
		font-size: 14px;
	}
	.helpline-how ol {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
		counter-reset: call-step;
	}
	.helpline-how li {
		position: relative;
		min-height: 22px;
		padding-left: 27px;
		color: #f1e9f0;
		font-size: 11px;
		line-height: 1.55;
		counter-increment: call-step;
	}
	.helpline-how li::before {
		position: absolute;
		left: 0;
		top: 0;
		display: grid;
		width: 19px;
		height: 19px;
		place-items: center;
		color: #3a203f;
		background: #f0b9c2;
		border-radius: 50%;
		content: counter(call-step);
		font-size: 10px;
		font-weight: 700;
	}
	.helpline-how li strong {
		color: white;
	}
	.helpline-how > p {
		margin: 11px 0 0;
		color: #d9c9dc;
		font-size: 10px;
		line-height: 1.5;
	}
	.helpline-actions {
		display: grid;
		align-content: start;
		gap: 7px;
	}
	.helpline-primary,
	.helpline-secondary {
		display: flex;
		min-height: 38px;
		align-items: center;
		justify-content: center;
		padding: 9px 12px;
		border-radius: 8px;
		font-size: 11px;
		font-weight: 700;
		text-align: center;
		text-decoration: none;
	}
	.helpline-primary {
		color: var(--plum);
		background: #fffaf8;
	}
	.helpline-secondary {
		color: #fffaf8;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.32);
	}
	.helpline-emergency {
		margin: 2px 0 0;
		color: #f0c7cd;
		font-size: 10px;
		line-height: 1.5;
		text-align: center;
	}
	.helpline-emergency a {
		color: #fffaf8;
		font-weight: 700;
		text-underline-offset: 2px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes breathe {
		from {
			opacity: 0.65;
		}
		to {
			opacity: 1;
		}
	}

	@media (max-width: 600px) {
		.app-shell {
			padding: 0 16px 36px;
		}
		.app-header {
			min-height: 64px;
		}
		.brand {
			font-size: 13px;
		}
		.brand-mark {
			width: 27px;
			height: 27px;
		}
		.ods-badge {
			gap: 6px;
			padding-right: 8px;
			font-size: 8px;
		}
		.ods-badge img {
			width: 24px;
			height: 24px;
		}
		main {
			margin-top: 32px;
		}
		h1 {
			font-size: 36px;
		}
		.intro-copy {
			font-size: 12px;
		}
		.checker-card,
		.result-card {
			padding: 16px;
			border-radius: 12px;
		}
		.helpline-section {
			padding: 17px;
			border-radius: 12px;
		}
		.helpline-tabs {
			width: 100%;
		}
		.helpline-tab {
			flex: 1;
		}
		.helpline-intro {
			flex-direction: column;
			gap: 15px;
		}
		.helpline-details {
			grid-template-columns: 1fr;
			gap: 15px;
		}
		.helpline-intro {
			margin-bottom: 14px;
		}
		.helpline-number {
			grid-template-columns: auto auto auto;
			align-items: center;
			justify-items: start;
			gap: 8px;
			min-width: 0;
			padding: 7px 12px;
		}
		.helpline-number strong {
			font-size: 25px;
		}
		.helpline-number span {
			font-size: 10px;
		}
		.helpline-details {
			margin-top: 15px;
			padding-top: 15px;
		}
		.local-note {
			font-size: 0;
		}
		.local-note span {
			width: 7px;
			height: 7px;
		}
		textarea {
			min-height: 140px;
			font-size: 11px;
		}
		.actions {
			flex-wrap: wrap;
		}
		.analyze-button {
			min-width: 100%;
		}
		.image-button {
			flex: 1;
		}
		.result-summary {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.summary-copy {
			min-width: calc(100% - 75px);
		}
		.new-analysis {
			margin-left: auto;
		}
		.next-step,
		.support-panel {
			grid-template-columns: 1fr;
		}
		.support-links {
			grid-template-columns: 1fr 1fr;
		}
		.support-links .urgent-link {
			grid-column: 1 / -1;
		}
		.job-links {
			grid-column: 1;
		}
		.job-links > span {
			width: 100%;
		}
		.simple-link {
			justify-self: start;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
		:global(*),
		:global(*::before),
		:global(*::after) {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
