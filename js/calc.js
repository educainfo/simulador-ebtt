// Lógica de cálculo salarial — Simulador Professor EBTT

// ─── Helpers de carreira ──────────────────────────────────────────────────────

function getVbKey(classe, nivel) {
  return `${classe}${nivel}`;
}

function getRegimeKey(regime) {
  const map = { '20h': 'h20', '40h': 'h40', 'DE': 'de',
                'h20': 'h20', 'h40': 'h40', 'de':  'de' };
  return map[regime] ?? 'de';
}

function getVB(periodo, regime, classe, nivel, reajuste2027 = 0.05) {
  const rk    = getRegimeKey(regime);
  const vbKey = getVbKey(classe, nivel);
  if (periodo === 'proj2027') {
    const base = VB.abr2026[rk]?.[vbKey] ?? 0;
    return base * (1 + reajuste2027);
  }
  return VB[periodo]?.[rk]?.[vbKey] ?? 0;
}

// posKey: chave da posição na carreira, ex: 'B4', 'C1', 'T1'
// Para abr/2026 usa a tabela fixa da Lei 15.141/2025 (elimina arredondamento FP)
// Para proj/2027 escala o valor fixo de abr/2026 pelo reajuste
// Para jan/2025 usa VB * percentual (sem tabela fixa publicada aqui)
function getRT(vb, regime, titulacao, periodo, posKey, reajuste2027 = 0) {
  if (!titulacao || titulacao === 'none') return 0;
  const rk = getRegimeKey(regime);

  if (periodo === 'abr2026' && posKey) {
    const val = RT_TABELA.abr2026?.[rk]?.[posKey]?.[titulacao];
    if (val != null) return val;
  }
  if (periodo === 'proj2027' && posKey) {
    const base = RT_TABELA.abr2026?.[rk]?.[posKey]?.[titulacao];
    if (base != null) return base * (1 + reajuste2027);
  }

  const pct = RT_PERCENT[rk]?.[titulacao] ?? 0;
  return vb * pct;
}

// ─── Previdência ──────────────────────────────────────────────────────────────

function calcRPPS(base, tabela = RPPS_TABLES.abr2026) {
  let total = 0;
  let ant   = 0;
  for (const f of tabela) {
    if (base <= ant) break;
    total += (Math.min(base, f.limite) - ant) * f.aliquota;
    ant = f.limite;
    if (!isFinite(f.limite)) break;
  }
  return total;
}

// ─── IRRF ─────────────────────────────────────────────────────────────────────

function calcIRRF(base) {
  if (base <= 0) return 0;
  let imposto = 0;
  for (const f of IRRF_TABLE) {
    if (base <= f.limite) {
      imposto = base * f.aliquota - f.deducao;
      break;
    }
  }
  return Math.max(0, imposto - calcReducaoIRRF2026(base));
}

// ─── Adicionais ───────────────────────────────────────────────────────────────

function calcAdicionalRisco(tipo, vb, sm = SALARIO_MINIMO) {
  const item = ADICIONAL_RISCO.find(r => r.value === tipo);
  if (!item || item.tipo === 'fixo') return 0;
  if (item.tipo === 'pct_vb') return vb * item.pct;
  if (item.tipo === 'pct_sm') return sm * item.pct;
  return 0;
}

function calcAdicionalNoturno(horas, vb, regime) {
  if (!(horas > 0)) return 0;
  const rk = getRegimeKey(regime);
  return (vb / HORAS_MENSAIS[rk]) * PERCENTUAL_NOTURNO * horas;
}

// ─── Auxílios ─────────────────────────────────────────────────────────────────

// salarioBruto: rendimento bruto do servidor (determina a faixa de renda)
// faixaServidor: índice 0-9 da faixa etária do servidor
// dependentesQtd: array[10] com quantidade de dependentes por faixa etária
function calcSaude(salarioBruto, faixaServidor, dependentesQtd) {
  const iRenda = SAUDE_FAIXAS_RENDA.findIndex(f => salarioBruto <= f.limite);
  const iR = iRenda >= 0 ? iRenda : SAUDE_FAIXAS_RENDA.length - 1;
  let total = (faixaServidor != null && faixaServidor >= 0)
    ? (SAUDE_SUBSIDIO_MATRIX[iR]?.[faixaServidor] ?? 0) : 0;
  if (Array.isArray(dependentesQtd)) {
    dependentesQtd.forEach((qtd, faixaEt) => {
      if (qtd > 0) total += qtd * (SAUDE_SUBSIDIO_MATRIX[iR]?.[faixaEt] ?? 0);
    });
  }
  return total;
}

function calcTransporte(gastoDiario, dias, vb) {
  if (!(gastoDiario > 0) || !(dias > 0)) return 0;
  return Math.max(0, gastoDiario * dias - vb * TRANSP_PCT_DESCONTO);
}

function calcPreEscolar(n, cotaParte) {
  if (!(n > 0)) return 0;
  return (n * AUX_PRE_ESCOLAR_FILHO) / (cotaParte ? 2 : 1);
}

function calcDecisao(tipo, valor, remuneracao) {
  if (tipo === 'fixo')  return +valor || 0;
  if (tipo === 'p2605') return remuneracao * 0.2605;
  if (tipo === 'p2886') return remuneracao * 0.2886;
  if (tipo === 'p4794') return remuneracao * 0.4794;
  return 0;
}

// ─── Contracheque principal ───────────────────────────────────────────────────

function calcContracheque(p) {
  const {
    periodo = 'abr2026', regime = 'DE', classe = 'C', nivel = 1,
    titulacao = 'none',  reajuste2027 = 5,
    anuenioPct = 0,      gaeAtivo = false,
    funcaoValor = 0,     funcaoSubst = false,
    riscoTipo = 'nenhum', noturnoHoras = 0,
    previdencia = 'rpps', funprespAliquota = 0.085, funprespFacultativa = 0,
    abonoPermanencia = false, dependentes = 0, descsimpl: descontoSimplificado = true,
    auxAlimentacao = false,
    auxSaude = false, saudeFaixaServidor = null, saudeDependentes = new Array(10).fill(0),
    auxTransporte = false, transpGastoDiario = 0, transpDias = 0,
    auxPreEscolar = false, preEscolarN = 0, preEscolarCotaParte = false,
    sindicatoPct = 0, outrosDescontos = 0,
    decisaoTipo = 'nao', decisaoValor = 0,
  } = p;

  // Valores por período
  const rppsTabela = RPPS_TABLES[periodo] ?? RPPS_TABLES.abr2026;
  const tetoRgps   = TETO_RGPS[periodo] ?? TETO_RGPS_2026;
  const smValor    = SALARIO_MINIMO_TABLE[periodo] ?? SALARIO_MINIMO;

  // Rendimentos
  const vb      = getVB(periodo, regime, classe, nivel, reajuste2027 / 100);
  const posKey  = getVbKey(classe, nivel);
  const funcao  = +funcaoValor || 0;

  // funcaoSubst: CD com opção — substitui toda a remuneração pelo valor da função
  const rt      = funcaoSubst ? 0 : getRT(vb, regime, titulacao, periodo, posKey, reajuste2027 / 100);
  const anuenio = funcaoSubst ? 0 : vb * ((+anuenioPct || 0) / 100);
  const gae     = funcaoSubst ? 0 : (gaeAtivo ? vb * GAE_PERCENTUAL : 0);
  const risco   = funcaoSubst ? 0 : calcAdicionalRisco(riscoTipo, vb, smValor);
  const noturno = funcaoSubst ? 0 : calcAdicionalNoturno(+noturnoHoras || 0, vb, regime);

  // Base previdenciária (CPSS)
  // CD com opção: apenas o valor da função compõe a base; demais componentes zeramos
  const baseCPSS = funcaoSubst
    ? funcao
    : vb + rt + anuenio + gae + funcao + risco + noturno;

  // Previdência
  let rppsDesc = 0, funprespDesc = 0;
  if (previdencia === 'funpresp') {
    rppsDesc = calcRPPS(Math.min(baseCPSS, tetoRgps), rppsTabela);
    const excedente = Math.max(0, baseCPSS - tetoRgps);
    if (p.funprespPlano === 'alternativo') {
      funprespDesc = (+p.funprespParticipacao || 0) + (+funprespFacultativa || 0);
    } else {
      funprespDesc = excedente * (+funprespAliquota || 0.085) + (+funprespFacultativa || 0);
    }
  } else {
    rppsDesc = calcRPPS(baseCPSS, rppsTabela);
  }
  const totalPrevidencia = rppsDesc + funprespDesc;

  // Abono permanência (= contribuição RPPS; entra como vantagem tributável)
  const abonoPerm = (previdencia === 'rpps' && abonoPermanencia) ? rppsDesc : 0;

  // Base IRRF
  const rendTributavel  = baseCPSS + abonoPerm;
  const valorDecisao    = calcDecisao(decisaoTipo, decisaoValor, rendTributavel);
  const totalTributavel = rendTributavel + valorDecisao;
  const deducaoDep      = (+dependentes || 0) * IRRF_DEDUCAO_DEPENDENTE;
  const deducaoUsada    = descontoSimplificado
    ? Math.max(deducaoDep, IRRF_DESCONTO_SIMPLIFICADO)
    : deducaoDep;
  const baseIrrf        = Math.max(0, totalTributavel - totalPrevidencia - deducaoUsada);
  const baseCalcIR      = Math.max(0, totalTributavel - totalPrevidencia);
  const irrf            = calcIRRF(baseIrrf);

  // Auxílios
  const alimValor   = auxAlimentacao
    ? (AUXILIOS_ALIMENTACAO[periodo] ?? AUXILIOS_ALIMENTACAO.abr2026) : 0;
  const saudeValor  = auxSaude
    ? calcSaude(baseCPSS, saudeFaixaServidor, saudeDependentes) : 0;
  const transpValor = auxTransporte
    ? calcTransporte(+transpGastoDiario || 0, +transpDias || 0, vb) : 0;
  const preEscValor = auxPreEscolar
    ? calcPreEscolar(+preEscolarN || 0, preEscolarCotaParte) : 0;
  const totalAuxilios = alimValor + saudeValor + transpValor + preEscValor;

  // Outros descontos
  const sindicatoDesc   = vb * ((+sindicatoPct || 0) / 100);
  const outrosDesc      = +outrosDescontos || 0;
  const totalOutrosDesc = sindicatoDesc + outrosDesc;

  // Totais
  const bruto          = baseCPSS + abonoPerm + valorDecisao + totalAuxilios;
  const totalDescontos = totalPrevidencia + irrf + totalOutrosDesc;
  const liquido        = bruto - totalDescontos;

  return {
    vb, rt, anuenio, gae, funcao, risco, noturno, abonoPerm, valorDecisao,
    baseCPSS, bruto, funcaoSubst,
    rppsDesc, funprespDesc, totalPrevidencia,
    baseIrrf, baseCalcIR, irrf, deducaoUsada,
    sindicatoDesc, outrosDescontos: outrosDesc, totalOutrosDesc,
    totalDescontos,
    alimValor, saudeValor, transpValor, preEscValor, totalAuxilios,
    liquido,
  };
}

// ─── Progressão na carreira ───────────────────────────────────────────────────

function calcProgressao({ posicaoAtual, dataAtual, regime, titulacao,
                           reajuste2027 = 5, mesesPorNivel = 25 }) {
  const idx = PROGRESSAO_SEQUENCIA.indexOf(posicaoAtual);
  if (idx < 0) return [];

  const d26    = new Date('2026-04-01');
  const d27    = new Date('2027-01-01');
  const etapas = [];
  let   data   = new Date(dataAtual);

  for (let i = idx; i < PROGRESSAO_SEQUENCIA.length; i++) {
    const pos    = PROGRESSAO_SEQUENCIA[i];
    const classe = pos.charAt(0);
    const nivel  = parseInt(pos.charAt(1), 10);
    const periodo = data >= d27 ? 'proj2027' : 'abr2026';
    const vb     = getVB(periodo, regime, classe, nivel, reajuste2027 / 100);
    const rt     = getRT(vb, regime, titulacao, periodo, pos, reajuste2027 / 100);

    etapas.push({ posicao: pos, label: POSICAO_LABEL[pos],
                  data: new Date(data), vb, rt, bruto: vb + rt, periodo });

    if (i < PROGRESSAO_SEQUENCIA.length - 1) {
      data = new Date(data);
      data.setMonth(data.getMonth() + mesesPorNivel);
    }
  }
  return etapas;
}

// ─── Formatação ───────────────────────────────────────────────────────────────

function formatBRL(valor) {
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  });
}

function formatMesAno(date) {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    .replace('. de ', '/').replace('. ', '/');
}
