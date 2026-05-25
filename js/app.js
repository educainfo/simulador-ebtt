// Interface — Simulador Professor EBTT

// ─── Constantes de UI ────────────────────────────────────────────────────────

const PERIODOS_LABEL = {
  abr2026:  'Abr/2026',
  proj2027: '2027 (proj.)',
};

// Campos core sincronizáveis entre as duas simulações
const CAMPOS_CORE = ['periodo', 'regime', 'classe', 'nivel', 'titulacao', 'previdencia', 'dependentes', 'descsimpl'];

// ─── Estado ──────────────────────────────────────────────────────────────────

// Chips ativos por simulação: { 1: Set<chipId>, 2: Set<chipId> }
const chipsAtivos = { 1: new Set(), 2: new Set() };

// Campos core que o usuário editou manualmente na Sim 2 (não seguem Sim 1)
const sim2Editados = new Set();

// ─── Definições de Chips ─────────────────────────────────────────────────────

const CHIPS_BENEFICIOS = [
  {
    id: 'alimentacao', label: 'Alimentação', icon: '🍽',
    htmlCampo: (id) =>
      `<p class="text-muted small mb-0">Valor automático conforme o período selecionado.</p>`,
    lerValores: (_id) => ({ auxAlimentacao: true }),
  },
  {
    id: 'saude', label: 'Saúde Supl.', icon: '🏥',
    htmlCampo: (id) => `
      <div class="row g-2">
        <div class="col-sm-5">
          <label class="form-label">Faixa etária — servidor</label>
          <select id="saude-faixa-${id}" class="form-select form-select-sm">
            ${SAUDE_FAIXAS_ETARIAS.map((label, i) =>
              `<option value="${i}">${label}</option>`).join('')}
          </select>
          <small class="text-muted">Faixa salarial calculada automaticamente.</small>
        </div>
        <div class="col-sm-7">
          <label class="form-label">Dependentes — quantidade por faixa etária</label>
          <div class="saude-deps-grid">
            ${SAUDE_FAIXAS_ETARIAS.map((label, i) => `
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="small flex-grow-1">${label}</span>
                <input type="number" id="saude-dep-${i}-${id}"
                       class="form-control form-control-sm text-center"
                       style="width:58px" value="0" min="0" max="20">
              </div>`).join('')}
          </div>
        </div>
      </div>`,
    lerValores: (id) => ({
      auxSaude: true,
      saudeFaixaServidor: parseInt(document.getElementById(`saude-faixa-${id}`)?.value ?? '7'),
      saudeDependentes: SAUDE_FAIXAS_ETARIAS.map((_, i) =>
        parseInt(document.getElementById(`saude-dep-${i}-${id}`)?.value) || 0),
    }),
  },
  {
    id: 'transporte', label: 'Transporte', icon: '🚌',
    htmlCampo: (id) => `
      <div class="row g-2">
        <div class="col-6">
          <label class="form-label">Gasto diário (R$)</label>
          <input type="number" id="transporte-gasto-${id}" class="form-control form-control-sm"
                 value="10" min="0" step="0.01">
        </div>
        <div class="col-6">
          <label class="form-label">Dias úteis/mês</label>
          <input type="number" id="transporte-dias-${id}" class="form-control form-control-sm"
                 value="22" min="0" max="31">
        </div>
      </div>
      <small class="text-muted">Desconto de 6% do VB aplicado. Benefício = max(0, total − 6%×VB).</small>`,
    lerValores: (id) => ({
      auxTransporte: true,
      transpGastoDiario: parseFloat(document.getElementById(`transporte-gasto-${id}`)?.value) || 0,
      transpDias:        parseFloat(document.getElementById(`transporte-dias-${id}`)?.value)  || 0,
    }),
  },
  {
    id: 'preescolar', label: 'Pré-escolar', icon: '👶',
    htmlCampo: (id) => `
      <div class="row g-2 align-items-center">
        <div class="col-5">
          <label class="form-label">Nº de filhos</label>
          <input type="number" id="preesc-n-${id}" class="form-control form-control-sm"
                 value="1" min="1" max="10">
        </div>
        <div class="col-7 pt-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="preesc-cota-${id}">
            <label class="form-check-label small" for="preesc-cota-${id}">Cota-parte (50%)</label>
          </div>
        </div>
      </div>`,
    lerValores: (id) => ({
      auxPreEscolar:      true,
      preEscolarN:        parseInt(document.getElementById(`preesc-n-${id}`)?.value) || 1,
      preEscolarCotaParte: document.getElementById(`preesc-cota-${id}`)?.checked ?? false,
    }),
  },
  {
    id: 'anuenio', label: 'Anuênio', icon: '📅',
    htmlCampo: (id) => `
      <div class="row g-2 align-items-end">
        <div class="col-5">
          <label class="form-label">Percentual (%)</label>
          <input type="number" id="anuenio-pct-${id}" class="form-control form-control-sm"
                 value="5" min="1" max="35">
        </div>
        <div class="col-7">
          <small class="text-muted">1% por ano completo, máx. 35%</small>
        </div>
      </div>`,
    lerValores: (id) => ({
      anuenioPct: parseFloat(document.getElementById(`anuenio-pct-${id}`)?.value) || 0,
    }),
  },
  {
    id: 'risco', label: 'Risco/Insalubridade', icon: '⚠️',
    htmlCampo: (id) => `
      <label class="form-label">Tipo</label>
      <select id="risco-tipo-${id}" class="form-select form-select-sm">
        ${ADICIONAL_RISCO.filter(r => r.value !== 'nenhum').map(r =>
          `<option value="${r.value}">${r.label}</option>`).join('')}
      </select>`,
    lerValores: (id) => ({
      riscoTipo: document.getElementById(`risco-tipo-${id}`)?.value ?? 'nenhum',
    }),
  },
  {
    id: 'noturno', label: 'Noturno', icon: '🌙',
    htmlCampo: (id) => `
      <div class="row g-2 align-items-end">
        <div class="col-5">
          <label class="form-label">Horas noturnas/mês</label>
          <input type="number" id="noturno-h-${id}" class="form-control form-control-sm"
                 value="20" min="1">
        </div>
        <div class="col-7">
          <small class="text-muted">Das 22h às 5h (+25%)</small>
        </div>
      </div>`,
    lerValores: (id) => ({
      noturnoHoras: parseFloat(document.getElementById(`noturno-h-${id}`)?.value) || 0,
    }),
  },
  {
    id: 'gae', label: 'GAE (160%)', icon: '📚',
    htmlCampo: (_id) =>
      `<p class="text-muted small mb-0">Gratificação de Atividades de Extensão = 160% do VB. Exclusivo EBTT.</p>`,
    lerValores: (_id) => ({ gaeAtivo: true }),
  },
  {
    id: 'funcao', label: 'Função CD/FG', icon: '💼',
    htmlCampo: (id) => `
      <div class="col-6">
        <label class="form-label">Valor da função (R$)</label>
        <input type="number" id="funcao-val-${id}" class="form-control form-control-sm"
               value="0" min="0" step="100">
      </div>`,
    lerValores: (id) => ({
      funcaoValor: parseFloat(document.getElementById(`funcao-val-${id}`)?.value) || 0,
    }),
  },
  {
    id: 'abono', label: 'Abono Perm.', icon: '🏅',
    htmlCampo: (_id) =>
      `<p class="text-muted small mb-0">Abono de permanência = valor da contribuição RPPS (ativo apenas no RPPS).</p>`,
    lerValores: (_id) => ({ abonoPermanencia: true }),
  },
];

const CHIPS_DESCONTOS = [
  {
    id: 'sindicato', label: 'Sindicato', icon: '🤝',
    htmlCampo: (id) => `
      <div class="row g-2 align-items-end">
        <div class="col-5">
          <label class="form-label">% sobre o VB</label>
          <input type="number" id="sindicato-pct-${id}" class="form-control form-control-sm"
                 value="1" min="0" max="10" step="0.1">
        </div>
      </div>`,
    lerValores: (id) => ({
      sindicatoPct: parseFloat(document.getElementById(`sindicato-pct-${id}`)?.value) || 0,
    }),
  },
  {
    id: 'outros-desc', label: 'Outros descontos', icon: '➖',
    htmlCampo: (id) => `
      <div class="col-6">
        <label class="form-label">Valor (R$)</label>
        <input type="number" id="outros-desc-val-${id}" class="form-control form-control-sm"
               value="0" min="0" step="10">
      </div>`,
    lerValores: (id) => ({
      outrosDescontos: parseFloat(document.getElementById(`outros-desc-val-${id}`)?.value) || 0,
    }),
  },
  {
    id: 'decisao', label: 'Decisão Judicial', icon: '⚖️',
    htmlCampo: (id) => `
      <div class="row g-2">
        <div class="col-sm-6">
          <label class="form-label">Tipo</label>
          <select id="decisao-tipo-${id}" class="form-select form-select-sm">
            ${DECISAO_TIPOS.filter(d => d.value !== 'nao').map(d =>
              `<option value="${d.value}">${d.label}</option>`).join('')}
          </select>
        </div>
        <div class="col-sm-6">
          <label class="form-label">Valor fixo (R$)</label>
          <input type="number" id="decisao-val-${id}" class="form-control form-control-sm"
                 value="0" min="0" step="100">
        </div>
      </div>`,
    lerValores: (id) => ({
      decisaoTipo:  document.getElementById(`decisao-tipo-${id}`)?.value ?? 'nao',
      decisaoValor: parseFloat(document.getElementById(`decisao-val-${id}`)?.value) || 0,
    }),
  },
];

// ─── Templates HTML ───────────────────────────────────────────────────────────

function htmlOpcoesPeriodo() {
  return `
    <option value="abr2026" selected>Abr/2026</option>
    <option value="proj2027">2027 (projetado)</option>`;
}

function htmlOpcoesRegime() {
  return `
    <option value="DE">DE</option>
    <option value="40h">40h</option>
    <option value="20h">20h</option>`;
}

function htmlOpcoesTitulacao() {
  return TITULACOES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
}

function htmlCamposObrigatorios(id) {
  return `
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-2">
        <label class="form-label" for="periodo-${id}">Vigência</label>
        <select id="periodo-${id}" class="form-select">${htmlOpcoesPeriodo()}</select>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" for="regime-${id}">Regime</label>
        <select id="regime-${id}" class="form-select">${htmlOpcoesRegime()}</select>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" for="classe-${id}">Classe</label>
        <select id="classe-${id}" class="form-select"></select>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" for="nivel-${id}">Nível</label>
        <select id="nivel-${id}" class="form-select"></select>
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label" for="titulacao-${id}">Titulação / RSC</label>
        <select id="titulacao-${id}" class="form-select">${htmlOpcoesTitulacao()}</select>
      </div>
    </div>
    <div class="row g-2 mb-2 align-items-end">
      <div class="col-6 col-md-3">
        <label class="form-label" for="previdencia-${id}">Previdência</label>
        <select id="previdencia-${id}" class="form-select">
          <option value="rpps">RPPS — Regime Próprio</option>
          <option value="funpresp">FUNPRESP — Regime Complementar</option>
        </select>
      </div>
      <div id="rpps-abono-area-${id}" class="col-auto d-flex align-items-end pb-1">
        <div class="form-check mb-0">
          <input class="form-check-input" type="checkbox" id="abono-perm-check-${id}">
          <label class="form-check-label small" for="abono-perm-check-${id}">Abono permanência</label>
        </div>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" for="dependentes-${id}">Dependentes IRRF</label>
        <input type="number" id="dependentes-${id}" class="form-control"
               value="0" min="0" max="20">
      </div>
      <div class="col-auto d-flex align-items-end pb-1">
        <div class="form-check mb-0" title="Lei 15.270/2025: dedução fixa de R$ 607,20/mês se mais vantajosa que a dedução por dependentes. Desmarque se seu contracheque não aplica.">
          <input class="form-check-input" type="checkbox" id="descsimpl-${id}" checked>
          <label class="form-check-label small" for="descsimpl-${id}">Desc. simplificado <span class="text-muted">(R$&nbsp;607,20)</span></label>
        </div>
      </div>
    </div>
    <div id="funpresp-area-${id}" class="chip-area mb-3" style="display:none">
      <div class="secao-titulo mb-2">FUNPRESP — Detalhes</div>
      <div class="row g-2">
        <div class="col-12">
          <div class="form-check">
            <input class="form-check-input" type="radio" name="fp-plano-${id}"
                   id="fp-normal-${id}" value="normal" checked>
            <label class="form-check-label small" for="fp-normal-${id}">
              Plano normal — alíquota&nbsp;
              <input type="number" id="funpresp-aliq-${id}"
                     class="form-control form-control-sm d-inline-block"
                     style="width:65px" value="8.5" min="0" max="20" step="0.5">
              % do excedente ao teto RGPS (R$&nbsp;8.475,55)
            </label>
          </div>
        </div>
        <div class="col-12">
          <div class="form-check">
            <input class="form-check-input" type="radio" name="fp-plano-${id}"
                   id="fp-alt-${id}" value="alternativo">
            <label class="form-check-label small" for="fp-alt-${id}">
              Plano alternativo — participação fixa R$&nbsp;
              <input type="number" id="funpresp-part-${id}"
                     class="form-control form-control-sm d-inline-block"
                     style="width:90px" value="200" min="0" step="10">
              /mês
            </label>
          </div>
        </div>
        <div class="col-md-4">
          <label class="form-label small">Contribuição facultativa (R$/mês)</label>
          <input type="number" id="funpresp-fac-${id}" class="form-control form-control-sm"
                 value="0" min="0" step="50">
        </div>
      </div>
    </div>`;
}

function htmlChipsGrupo(id, chips, extraClass) {
  const btns = chips.map(c => `
    <button type="button" class="chip-btn" id="chip-btn-${c.id}-${id}"
            onclick="toggleChip(${id}, '${c.id}')">
      ${c.icon} ${c.label}
    </button>`).join('');

  const areas = chips.map(c => `
    <div id="chip-area-${c.id}-${id}" class="chip-area" style="display:none">
      <button type="button" class="chip-area-close" onclick="fecharChipArea(${id}, '${c.id}')" title="Fechar">×</button>
      ${c.htmlCampo(id)}
    </div>`).join('');

  return `
    <div class="chips-wrapper ${extraClass ?? ''} mb-2">${btns}</div>
    ${areas}`;
}

function htmlResultado(id) {
  // row() — linha sempre visível; rowT() — linha togglável (começa oculta)
  const row = (campo, label, cls) =>
    `<tr class="${cls ?? ''}">
       <td class="label-col" id="res-${campo}-label-${id}">${label}</td>
       <td class="valor-col" id="res-${campo}-${id}"></td>
     </tr>`;

  const rowT = (campo, label, cls) =>
    `<tr id="res-${campo}-row-${id}" class="${cls ?? ''}" style="display:none">
       <td class="label-col" id="res-${campo}-label-${id}">${label}</td>
       <td class="valor-col" id="res-${campo}-${id}"></td>
     </tr>`;

  return `
    <table class="table table-sm resultado-tabela mb-0">
      <tbody>
        ${row('vb',  'Vencimento Básico (VB)')}
        ${row('rt',  'RT/RSC')}
        ${rowT('anuenio', 'Anuênio')}
        ${rowT('gae',     'GAE (160% VB)')}
        ${rowT('funcao',  'Função CD/FG')}
        ${rowT('risco',   'Adicional risco/insalubridade')}
        ${rowT('noturno', 'Adicional noturno')}
        ${rowT('abono',   'Abono permanência (RPPS)')}
        ${rowT('decisao', 'Decisão judicial')}
        ${rowT('alim',   '(+) Aux. Alimentação',  'linha-auxilio')}
        ${rowT('saude',  '(+) Saúde Suplementar', 'linha-auxilio')}
        ${rowT('transp', '(+) Transporte',         'linha-auxilio')}
        ${rowT('preesc', '(+) Pré-escolar',        'linha-auxilio')}
        <tr class="separador linha-bruto">
          <td class="label-col fw-bold">Rendimento Bruto</td>
          <td class="valor-col fw-bold" id="res-bruto-${id}"></td>
        </tr>
        <tr class="separador linha-desconto">
          <td class="label-col">(-) Previdência RPPS</td>
          <td class="valor-col" id="res-rpps-${id}"></td>
        </tr>
        ${rowT('funpresp', '(-) FUNPRESP', 'linha-desconto')}
        <tr class="linha-desconto">
          <td class="label-col">(-) IRRF</td>
          <td class="valor-col" id="res-irrf-${id}"></td>
        </tr>
        ${rowT('sindicato',   '(-) Sindicato',      'linha-desconto')}
        ${rowT('outros-desc', '(-) Outros descontos','linha-desconto')}
        <tr class="separador linha-desconto">
          <td class="label-col fw-semibold">Total Descontos</td>
          <td class="valor-col fw-semibold" id="res-total-desc-${id}"></td>
        </tr>
        <tr class="separador linha-liquido">
          <td class="label-col">💳 Líquido Estimado</td>
          <td class="valor-col" id="res-liquido-${id}"></td>
        </tr>
        <tr class="separador">
          <td class="label-col text-muted small">Base cálculo IR</td>
          <td class="valor-col text-muted small" id="res-base-irrf-${id}"></td>
        </tr>
        <tr>
          <td class="label-col text-muted small">Dedução usada (IRRF)</td>
          <td class="valor-col text-muted small" id="res-deducao-${id}"></td>
        </tr>
      </tbody>
    </table>`;
}

function criarSimCard(id) {
  const titulo = id === 1 ? 'Simulação 1' : 'Simulação 2';
  const cor    = id === 2 ? ' sim-card-2' : '';
  const badgeEspelho = id === 2
    ? `<span class="badge-espelho sincronizado" id="badge-espelho">🔗 Espelhando Sim 1</span>
       <button class="btn btn-sm btn-outline-light ms-2 py-0" id="btn-redefinir-sim2"
               onclick="redefinirSim2()" style="font-size:0.72rem">Redefinir</button>`
    : '';

  const container = document.getElementById(`sim-container-${id}`);
  if (!container) return;

  container.innerHTML = `
    <div class="sim-card${cor} mb-3">
      <div class="card-header">
        ${titulo}
        <div class="d-flex align-items-center gap-1">${badgeEspelho}</div>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-7">
            ${htmlCamposObrigatorios(id)}
            <div class="secao-titulo">Benefícios</div>
            ${htmlChipsGrupo(id, CHIPS_BENEFICIOS, '')}
            <div class="secao-titulo mt-3">Descontos adicionais</div>
            ${htmlChipsGrupo(id, CHIPS_DESCONTOS, 'chips-descontos')}
          </div>
          <div class="col-md-5">
            <div class="secao-titulo">Resultado estimado</div>
            ${htmlResultado(id)}
          </div>
        </div>
      </div>
    </div>`;
}

// ─── Sistema de chips ─────────────────────────────────────────────────────────

function toggleChip(simId, chipId) {
  const ativo = chipsAtivos[simId].has(chipId);
  if (ativo) {
    const area = document.getElementById(`chip-area-${chipId}-${simId}`);
    if (area && area.style.display === 'none') {
      area.style.display = '';
      return;
    }
  }
  setChipAtivo(simId, chipId, !ativo);
  if (simId === 2) sim2Editados.add(`chip_${chipId}`);
  atualizarBadgeEspelho();
  calcularTudo();
}

function fecharChipArea(simId, chipId) {
  const area = document.getElementById(`chip-area-${chipId}-${simId}`);
  if (area) area.style.display = 'none';
}

function setChipAtivo(simId, chipId, ativo) {
  const btn  = document.getElementById(`chip-btn-${chipId}-${simId}`);
  const area = document.getElementById(`chip-area-${chipId}-${simId}`);
  if (!btn) return;

  if (ativo) {
    chipsAtivos[simId].add(chipId);
    btn.classList.add('ativo');
    btn.innerHTML = btn.innerHTML.replace(/\s*<span.*<\/span>/, '');
    btn.innerHTML += ' <span class="chip-x">×</span>';
    if (area) area.style.display = '';
  } else {
    chipsAtivos[simId].delete(chipId);
    btn.classList.remove('ativo');
    btn.innerHTML = btn.innerHTML.replace(/\s*<span.*<\/span>/, '');
    if (area) area.style.display = 'none';
  }
}

// ─── Leitura de parâmetros ────────────────────────────────────────────────────

function lerCoreCampo(campo, id) {
  const el = document.getElementById(`${campo}-${id}`);
  if (!el) return '';
  if (el.type === 'number') return parseFloat(el.value) || 0;
  if (el.type === 'checkbox') return el.checked;
  return el.value;
}

function lerParamsBrutos(id) {
  const p = {};
  CAMPOS_CORE.forEach(c => { p[c] = lerCoreCampo(c, id); });
  p.reajuste2027         = parseFloat(document.getElementById('reajuste-2027')?.value) || 0;
  p.funprespAliquota     = (parseFloat(document.getElementById(`funpresp-aliq-${id}`)?.value) || 8.5) / 100;
  p.funprespPlano        = document.querySelector(`input[name="fp-plano-${id}"]:checked`)?.value ?? 'normal';
  p.funprespParticipacao = parseFloat(document.getElementById(`funpresp-part-${id}`)?.value) || 0;
  p.funprespFacultativa  = parseFloat(document.getElementById(`funpresp-fac-${id}`)?.value) || 0;
  // Abono permanência via checkbox (sobrescreve o chip se ambos usados)
  if (document.getElementById(`abono-perm-check-${id}`)?.checked) p.abonoPermanencia = true;

  // Chips ativos
  const todosChips = [...CHIPS_BENEFICIOS, ...CHIPS_DESCONTOS];
  todosChips.forEach(chip => {
    if (chipsAtivos[id].has(chip.id)) {
      Object.assign(p, chip.lerValores(id));
    }
  });
  return p;
}

function lerParams(id) {
  if (id !== 2) return lerParamsBrutos(1);

  const p1 = lerParamsBrutos(1);
  const p2 = lerParamsBrutos(2);

  // Para cada campo core: usa p2 se editado, senão usa p1
  const merged = { ...p1 };
  CAMPOS_CORE.forEach(c => {
    if (sim2Editados.has(c)) merged[c] = p2[c];
  });
  // Chips são sempre independentes por simulação
  const todosChips = [...CHIPS_BENEFICIOS, ...CHIPS_DESCONTOS];
  todosChips.forEach(chip => {
    if (chipsAtivos[2].has(chip.id)) {
      Object.assign(merged, chip.lerValores(2));
    } else {
      // Remove params do chip se inativo na Sim 2
      Object.keys(chip.lerValores(2)).forEach(k => delete merged[k]);
    }
  });
  merged.reajuste2027    = p2.reajuste2027;
  merged.funprespAliquota = p2.funprespAliquota;
  return merged;
}

// ─── Espelho Sim 2 ────────────────────────────────────────────────────────────

function sincronizarCampoSim2(campo) {
  if (sim2Editados.has(campo)) return;
  const el1 = document.getElementById(`${campo}-1`);
  const el2 = document.getElementById(`${campo}-2`);
  if (!el1 || !el2) return;
  if (el1.type === 'checkbox') {
    if (el1.checked !== el2.checked) el2.checked = el1.checked;
    return;
  }
  if (el1.value === el2.value) return;
  el2.value = el1.value;
  if (campo === 'classe') popularNiveisSim(2, false);
}

function atualizarBadgeEspelho() {
  const badge = document.getElementById('badge-espelho');
  if (!badge) return;
  const temEdicao = sim2Editados.size > 0;
  badge.className  = `badge-espelho ${temEdicao ? 'editado' : 'sincronizado'}`;
  badge.textContent = temEdicao
    ? `✏️ ${sim2Editados.size} campo(s) próprio(s)`
    : '🔗 Espelhando Sim 1';
}

function redefinirSim2() {
  sim2Editados.clear();
  CAMPOS_CORE.forEach(campo => sincronizarCampoSim2(campo));
  // Resetar chips da Sim 2 para igualar Sim 1
  const todosChips = [...CHIPS_BENEFICIOS, ...CHIPS_DESCONTOS];
  todosChips.forEach(chip => {
    const ativo1 = chipsAtivos[1].has(chip.id);
    const ativo2 = chipsAtivos[2].has(chip.id);
    if (ativo1 !== ativo2) setChipAtivo(2, chip.id, ativo1);
  });
  atualizarBadgeEspelho();
  calcularTudo();
}

// ─── Inicialização dos formulários ────────────────────────────────────────────

function popularClassesSim(id) {
  const sel = document.getElementById(`classe-${id}`);
  if (!sel) return;
  sel.innerHTML = '';
  ESTRUTURA_CARREIRA.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.classe;
    opt.textContent = c.label;
    sel.appendChild(opt);
  });
  sel.value = 'A';
  popularNiveisSim(id, false);
}

function popularNiveisSim(id, dispararCalculo = true) {
  const classe = document.getElementById(`classe-${id}`)?.value;
  const sel    = document.getElementById(`nivel-${id}`);
  if (!sel || !classe) return;
  const info = ESTRUTURA_CARREIRA.find(c => c.classe === classe);
  const prev = parseInt(sel.value, 10);
  sel.innerHTML = '';
  info?.niveis.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = `Nível ${n}`;
    sel.appendChild(opt);
  });
  if (info?.niveis.includes(prev)) sel.value = prev;
  if (dispararCalculo) calcularTudo();
}

function popularTitulacoesSim(id) {
  const sel = document.getElementById(`titulacao-${id}`);
  if (!sel) return;
  sel.innerHTML = htmlOpcoesTitulacao();
  sel.value = 'dout';
}

function bindEventosSim(id) {
  CAMPOS_CORE.forEach(campo => {
    const el = document.getElementById(`${campo}-${id}`);
    if (!el) return;
    el.addEventListener('change', () => {
      if (campo === 'classe') popularNiveisSim(id);
      if (id === 1) sincronizarCampoSim2(campo);
      if (id === 2) {
        sim2Editados.add(campo);
        atualizarBadgeEspelho();
      }
      calcularTudo();
    });
    el.addEventListener('input', () => {
      if (id === 1) sincronizarCampoSim2(campo);
      if (id === 2) {
        sim2Editados.add(campo);
        atualizarBadgeEspelho();
      }
      calcularTudo();
    });
  });

  // Previdência: mostrar/ocultar áreas conforme seleção
  const prevSel = document.getElementById(`previdencia-${id}`);
  prevSel?.addEventListener('change', () => {
    const isFunpresp = prevSel.value === 'funpresp';
    const fpArea     = document.getElementById(`funpresp-area-${id}`);
    const rppsArea   = document.getElementById(`rpps-abono-area-${id}`);
    if (fpArea)   fpArea.style.display   = isFunpresp ? '' : 'none';
    if (rppsArea) rppsArea.style.display = isFunpresp ? 'none' : '';
    calcularTudo();
  });
  // Campos FUNPRESP
  [`funpresp-aliq-${id}`,`funpresp-part-${id}`,`funpresp-fac-${id}`].forEach(fid => {
    document.getElementById(fid)?.addEventListener('input', calcularTudo);
  });
  document.querySelectorAll(`input[name="fp-plano-${id}"]`).forEach(r =>
    r.addEventListener('change', calcularTudo));
  document.getElementById(`abono-perm-check-${id}`)?.addEventListener('change', calcularTudo);

  // Evento em chip-areas: qualquer input dentro delas dispara recálculo
  const card = document.getElementById(`sim-container-${id}`);
  card?.querySelectorAll('.chip-area input, .chip-area select').forEach(el => {
    el.addEventListener('input',  calcularTudo);
    el.addEventListener('change', calcularTudo);
  });

  // Reajuste global
  document.getElementById('reajuste-2027')?.addEventListener('input', calcularTudo);
}

// ─── Cálculo ──────────────────────────────────────────────────────────────────

function calcularTudo() {
  const p1 = lerParams(1);
  const p2 = lerParams(2);
  const r1 = calcContracheque(p1);
  const r2 = calcContracheque(p2);
  renderizarResultado(1, r1, p1);
  renderizarResultado(2, r2, p2);
  renderizarComparacao(r1, r2);
  salvarEstado();
}

// ─── Renderização do resultado ────────────────────────────────────────────────

function setTxt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showRow(rowId, visivel) {
  const el = document.getElementById(rowId);
  if (el) el.style.display = visivel ? '' : 'none';
}

function renderizarResultado(id, r, p) {
  const rk = getRegimeKey(p.regime);

  // Label dinâmico da RT
  const pcts = {
    h20: { aperf:'5%', espec:'10%', mestrado:'25%', dout:'57,5%' },
    h40: { aperf:'7,5%', espec:'15%', mestrado:'37,5%', dout:'86,25%' },
    de:  { aperf:'10%', espec:'20%', mestrado:'50%', dout:'115%' },
  };
  const nomesTit = { none:'—', aperf:'Aperf.', espec:'Espec./RSC-I',
                     mestrado:'Mestrado/RSC-II', dout:'Doutorado/RSC-III' };
  const pctTit  = pcts[rk]?.[p.titulacao] ?? '';
  const rtLabel = pctTit
    ? `RT — ${nomesTit[p.titulacao]} (${pctTit} do VB)`
    : 'RT/RSC — (nenhuma)';

  setTxt(`res-vb-${id}`,  formatBRL(r.vb));
  setTxt(`res-rt-label-${id}`, rtLabel);
  setTxt(`res-rt-${id}`,  formatBRL(r.rt));

  setTxt(`res-anuenio-label-${id}`, `Anuênio (${p.anuenioPct ?? 0}%)`);
  setTxt(`res-anuenio-${id}`, formatBRL(r.anuenio));
  showRow(`res-anuenio-row-${id}`, r.anuenio > 0);

  setTxt(`res-gae-${id}`, formatBRL(r.gae));
  showRow(`res-gae-row-${id}`, r.gae > 0);

  setTxt(`res-funcao-${id}`, formatBRL(r.funcao));
  showRow(`res-funcao-row-${id}`, r.funcao > 0);

  setTxt(`res-risco-${id}`, formatBRL(r.risco));
  showRow(`res-risco-row-${id}`, r.risco > 0);

  setTxt(`res-noturno-${id}`, formatBRL(r.noturno));
  showRow(`res-noturno-row-${id}`, r.noturno > 0);

  setTxt(`res-abono-${id}`, formatBRL(r.abonoPerm));
  showRow(`res-abono-row-${id}`, r.abonoPerm > 0);

  setTxt(`res-decisao-${id}`, formatBRL(r.valorDecisao));
  showRow(`res-decisao-row-${id}`, r.valorDecisao > 0);

  setTxt(`res-bruto-${id}`, formatBRL(r.bruto));

  setTxt(`res-rpps-${id}`, formatBRL(r.rppsDesc));

  setTxt(`res-funpresp-${id}`, formatBRL(r.funprespDesc));
  showRow(`res-funpresp-row-${id}`, r.funprespDesc > 0);

  setTxt(`res-irrf-${id}`, formatBRL(r.irrf));

  setTxt(`res-sindicato-${id}`, formatBRL(r.sindicatoDesc));
  showRow(`res-sindicato-row-${id}`, r.sindicatoDesc > 0);

  setTxt(`res-outros-desc-${id}`, formatBRL(r.outrosDescontos));
  showRow(`res-outros-desc-row-${id}`, r.outrosDescontos > 0);

  setTxt(`res-total-desc-${id}`, formatBRL(r.totalDescontos));

  setTxt(`res-alim-${id}`, formatBRL(r.alimValor));
  showRow(`res-alim-row-${id}`, r.alimValor > 0);

  setTxt(`res-saude-${id}`, formatBRL(r.saudeValor));
  showRow(`res-saude-row-${id}`, r.saudeValor > 0);

  setTxt(`res-transp-${id}`, formatBRL(r.transpValor));
  showRow(`res-transp-row-${id}`, chipsAtivos[id].has('transporte'));

  setTxt(`res-preesc-${id}`, formatBRL(r.preEscValor));
  showRow(`res-preesc-row-${id}`, r.preEscValor > 0);

  setTxt(`res-liquido-${id}`,   formatBRL(r.liquido));
  setTxt(`res-base-irrf-${id}`, formatBRL(r.baseCalcIR));
  setTxt(`res-deducao-${id}`,   formatBRL(r.deducaoUsada));
}

// ─── Comparação ───────────────────────────────────────────────────────────────

function renderizarComparacao(r1, r2) {
  const bar = document.getElementById('comp-bar');
  if (!bar) return;

  const diff = r2.liquido - r1.liquido;
  const pct  = r1.liquido > 0 ? (diff / r1.liquido) * 100 : 0;
  const sinal = diff >= 0 ? '+' : '';
  const cor   = diff >= 0 ? 'bg-success' : 'bg-danger';
  const label = diff >= 0 ? 'Sim 2 maior' : 'Sim 1 maior';

  bar.innerHTML = `
    <div class="comp-box">
      <div class="row g-3 align-items-center justify-content-center">
        <div class="col-auto text-center">
          <div class="comp-label">Líquido Sim 1</div>
          <div class="fs-5 fw-bold">${formatBRL(r1.liquido)}</div>
        </div>
        <div class="col-auto text-center">
          <span class="badge ${cor} fs-6 px-3">${label}</span>
          <div class="fw-bold mt-1">${sinal}${formatBRL(diff)}</div>
          <div class="text-muted small">${sinal}${pct.toFixed(2)}%</div>
        </div>
        <div class="col-auto text-center">
          <div class="comp-label">Líquido Sim 2</div>
          <div class="fs-5 fw-bold">${formatBRL(r2.liquido)}</div>
        </div>
      </div>
    </div>`;
}

// ─── Aba Progressão ───────────────────────────────────────────────────────────

function renderizarProgressao() {
  const classe    = document.getElementById('prog-classe')?.value ?? 'C';
  const nivel     = parseInt(document.getElementById('prog-nivel')?.value ?? '1', 10);
  const dataStr   = document.getElementById('prog-data')?.value;
  const regime    = document.getElementById('prog-regime')?.value ?? 'DE';
  const titulacao = document.getElementById('prog-titulacao')?.value ?? 'dout';
  const meses     = parseInt(document.getElementById('prog-meses')?.value ?? '25', 10);
  const reajuste  = parseFloat(document.getElementById('reajuste-2027')?.value) || 0;

  const posicao  = getVbKey(classe, nivel);
  const dataAtual = dataStr ? new Date(dataStr + 'T00:00:00') : new Date();

  const etapas = calcProgressao({ posicaoAtual: posicao, dataAtual, regime,
                                   titulacao, reajuste2027: reajuste, mesesPorNivel: meses });

  const tbody = document.getElementById('prog-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  etapas.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (i === 0) tr.classList.add('table-primary', 'fw-bold');
    tr.innerHTML = `
      <td>${formatMesAno(e.data)}</td>
      <td>${e.label}</td>
      <td>${formatBRL(e.vb)}</td>
      <td>${formatBRL(e.rt)}</td>
      <td>${formatBRL(e.bruto)}</td>
      <td><span class="badge-periodo">${PERIODOS_LABEL[e.periodo] ?? e.periodo}</span></td>`;
    tbody.appendChild(tr);
  });
}

function inicializarProgressao() {
  // Popular selects da aba progressão (uma única vez)
  const selClasse = document.getElementById('prog-classe');
  if (selClasse && selClasse.childElementCount === 0) {
    ESTRUTURA_CARREIRA.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.classe; opt.textContent = c.label;
      selClasse.appendChild(opt);
    });
    selClasse.value = 'C';
    popularNiveisProgressao();
  }

  const selTit = document.getElementById('prog-titulacao');
  if (selTit && selTit.childElementCount === 0) {
    selTit.innerHTML = htmlOpcoesTitulacao();
    selTit.value = 'dout';
  }

  const dataEl = document.getElementById('prog-data');
  if (dataEl && !dataEl.value) {
    dataEl.value = new Date().toISOString().slice(0, 10);
  }

  renderizarProgressao();
}

function popularNiveisProgressao() {
  const classe = document.getElementById('prog-classe')?.value ?? 'C';
  const sel    = document.getElementById('prog-nivel');
  if (!sel) return;
  const info = ESTRUTURA_CARREIRA.find(c => c.classe === classe);
  sel.innerHTML = '';
  info?.niveis.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = `Nível ${n}`;
    sel.appendChild(opt);
  });
}

// ─── Aba Tabelas ─────────────────────────────────────────────────────────────

function renderizarTabelas() {
  const periodo  = document.getElementById('tabelas-periodo')?.value ?? 'abr2026';
  const regime   = document.getElementById('tabelas-regime')?.value ?? 'de';
  const reajuste = (parseFloat(document.getElementById('reajuste-2027')?.value) || 0) / 100;
  const tbody    = document.getElementById('tabelas-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  PROGRESSAO_SEQUENCIA.forEach(pos => {
    const classe = pos.charAt(0);
    const nivel  = parseInt(pos.charAt(1), 10);
    const vb     = getVB(periodo, regime, classe, nivel, reajuste);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${POSICAO_LABEL[pos]}</td>
      <td>${formatBRL(vb)}</td>
      <td>${formatBRL(getRT(vb, regime, 'aperf',    periodo, pos, reajuste))}</td>
      <td>${formatBRL(getRT(vb, regime, 'espec',    periodo, pos, reajuste))}</td>
      <td>${formatBRL(getRT(vb, regime, 'mestrado', periodo, pos, reajuste))}</td>
      <td>${formatBRL(getRT(vb, regime, 'dout',     periodo, pos, reajuste))}</td>`;
    tbody.appendChild(tr);
  });
}

// ─── localStorage ─────────────────────────────────────────────────────────────

function salvarEstado() {
  try {
    const estado = {
      sim1: lerParamsBrutos(1),
      sim2Editados: [...sim2Editados],
      chips1: [...chipsAtivos[1]],
      chips2: [...chipsAtivos[2]],
    };
    localStorage.setItem('ebtt-estado', JSON.stringify(estado));
  } catch (_) { /* ignore */ }
}

function carregarEstado() {
  try {
    const raw = localStorage.getItem('ebtt-estado');
    if (!raw) return;
    const estado = JSON.parse(raw);

    // Restaurar campos core da Sim 1
    const p = estado.sim1 ?? {};
    CAMPOS_CORE.forEach(campo => {
      const el = document.getElementById(`${campo}-1`);
      if (!el || p[campo] == null) return;
      if (el.type === 'checkbox') el.checked = !!p[campo];
      else el.value = p[campo];
    });
    popularNiveisSim(1, false);

    // Restaurar chips
    (estado.chips1 ?? []).forEach(chipId => setChipAtivo(1, chipId, true));
    (estado.chips2 ?? []).forEach(chipId => setChipAtivo(2, chipId, true));

    // Restaurar editados Sim 2
    (estado.sim2Editados ?? []).forEach(c => sim2Editados.add(c));
    atualizarBadgeEspelho();
  } catch (_) { /* ignore */ }
}

// ─── Inicialização global ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Montar os dois cards de simulação
  criarSimCard(1);
  criarSimCard(2);

  // Popular selects de classe/titulação
  [1, 2].forEach(id => {
    popularClassesSim(id);
    popularTitulacoesSim(id);
  });

  // Valores padrão: Sim 1 Adjunto C1 DE Doutorado
  const defaults1 = { periodo:'abr2026', regime:'DE', classe:'C', nivel:1,
                       titulacao:'dout', previdencia:'rpps', dependentes:0 };
  CAMPOS_CORE.forEach(campo => {
    const el = document.getElementById(`${campo}-1`);
    if (el && defaults1[campo] != null) el.value = defaults1[campo];
  });
  popularNiveisSim(1, false);

  // Ativar chip de alimentação por padrão nas duas sims
  setChipAtivo(1, 'alimentacao', true);
  setChipAtivo(2, 'alimentacao', true);

  // Sincronizar Sim 2 com os defaults de Sim 1
  CAMPOS_CORE.forEach(c => sincronizarCampoSim2(c));

  // Bind eventos
  [1, 2].forEach(id => bindEventosSim(id));

  // Bind eventos das abas (apenas render, sem setup repetido)
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener('shown.bs.tab', e => {
      const alvo = e.target.getAttribute('data-bs-target');
      if (alvo === '#tab-progressao') inicializarProgressao();
      if (alvo === '#tab-tabelas')    renderizarTabelas();
    });
  });

  // Bind eventos tabelas (estáticos no index.html)
  document.getElementById('tabelas-periodo')?.addEventListener('change', renderizarTabelas);
  document.getElementById('tabelas-regime')?.addEventListener('change',  renderizarTabelas);

  // Bind reajuste 2027 nos campos de progressão
  document.getElementById('prog-classe')?.addEventListener('change', () => {
    popularNiveisProgressao(); renderizarProgressao();
  });
  ['prog-nivel','prog-regime','prog-titulacao','prog-meses','prog-data'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', renderizarProgressao);
    document.getElementById(id)?.addEventListener('input',  renderizarProgressao);
  });

  // Carregar estado salvo (sobrescreve defaults se existir)
  carregarEstado();

  // Primeiro cálculo
  calcularTudo();
});
