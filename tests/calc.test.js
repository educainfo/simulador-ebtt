const {
  calcRPPS, calcIRRF, calcReducaoIRRF2026,
  getVB, getRT,
  calcTransporte, calcPreEscolar,
  calcContracheque, calcProgressao,
  RPPS_TABLES, PROGRESSAO_SEQUENCIA,
} = require('./helpers');

// ─── calcRPPS ─────────────────────────────────────────────────────────────────
// Tabela abr/2026: 7,5% até 1622 | 9% até 2902,83 | 12% até 4354,25
//                  14% até 8475,55 | 14,5% até 14631,36 | ...

describe('calcRPPS', () => {
  const tab = RPPS_TABLES.abr2026;

  test('base zero retorna zero', () => {
    expect(calcRPPS(0, tab)).toBe(0);
  });

  test('alíquota única de 7,5% para base dentro da 1ª faixa', () => {
    // 1000 × 7,5% = 75,00
    expect(calcRPPS(1000, tab)).toBeCloseTo(75.00, 2);
  });

  test('base exatamente no limite da 1ª faixa (R$ 1.622)', () => {
    // 1622 × 7,5% = 121,65
    expect(calcRPPS(1622, tab)).toBeCloseTo(121.65, 2);
  });

  test('progressividade entre 1ª e 2ª faixas (base R$ 2.000)', () => {
    // 1622×7,5% + 378×9% = 121,65 + 34,02 = 155,67
    expect(calcRPPS(2000, tab)).toBeCloseTo(155.67, 2);
  });

  test('quatro faixas (base R$ 5.000)', () => {
    // 1622×7,5% + 1280,83×9% + 1451,42×12% + 645,75×14%
    // = 121,65 + 115,27 + 174,17 + 90,41 = 501,50
    expect(calcRPPS(5000, tab)).toBeCloseTo(501.50, 1);
  });
});

// ─── calcReducaoIRRF2026 ──────────────────────────────────────────────────────

describe('calcReducaoIRRF2026', () => {
  test('até R$ 5.000 retorna R$ 312,89', () => {
    expect(calcReducaoIRRF2026(3000)).toBeCloseTo(312.89, 2);
    expect(calcReducaoIRRF2026(5000)).toBeCloseTo(312.89, 2);
  });

  test('faixa de transição R$ 6.000', () => {
    // max(0, 978,62 − 0,133145 × 6000) = max(0, 978,62 − 798,87) = 179,75
    expect(calcReducaoIRRF2026(6000)).toBeCloseTo(179.75, 1);
  });

  test('acima de R$ 7.350 retorna zero', () => {
    expect(calcReducaoIRRF2026(8000)).toBe(0);
  });
});

// ─── calcIRRF ─────────────────────────────────────────────────────────────────

describe('calcIRRF', () => {
  test('base zero retorna zero', () => {
    expect(calcIRRF(0)).toBe(0);
  });

  test('abaixo do limite de isenção (R$ 2.428,80) retorna zero', () => {
    expect(calcIRRF(2428.80)).toBe(0);
  });

  test('base R$ 2.600 — zerado pela redução complementar 2026', () => {
    // 2600×7,5% − 182,16 = 12,84; redução = 312,89 → irrf = 0
    expect(calcIRRF(2600)).toBe(0);
  });

  test('base R$ 5.000 com redução complementar', () => {
    // 5000×27,5% − 908,73 = 466,27; redução = 312,89 → irrf ≈ 153,38
    expect(calcIRRF(5000)).toBeCloseTo(153.38, 1);
  });

  test('base R$ 8.000 — sem redução complementar', () => {
    // 8000×27,5% − 908,73 = 1291,27; redução = 0 → irrf ≈ 1291,27
    expect(calcIRRF(8000)).toBeCloseTo(1291.27, 1);
  });
});

// ─── getVB — Vencimento Básico tabela abr/2026 ───────────────────────────────

describe('getVB — tabela abr/2026', () => {
  test('DE C1  → R$ 9.616,10', () => expect(getVB('abr2026', 'DE',  'C', 1)).toBe(9616.10));
  test('40h A1 → R$ 4.478,03', () => expect(getVB('abr2026', '40h', 'A', 1)).toBe(4478.03));
  test('20h T1 → R$ 6.122,51', () => expect(getVB('abr2026', '20h', 'T', 1)).toBe(6122.51));
  test('DE B4  → R$ 7.849,87', () => expect(getVB('abr2026', 'DE',  'B', 4)).toBe(7849.87));
  test('40h C4 → R$ 7.792,28', () => expect(getVB('abr2026', '40h', 'C', 4)).toBe(7792.28));
  test('posição inexistente retorna zero', () => {
    expect(getVB('abr2026', 'DE', 'Z', 1)).toBe(0);
  });
});

// ─── getRT — Retribuição por Titulação tabela fixa abr/2026 ──────────────────

describe('getRT — tabela abr/2026', () => {
  test('sem titulação retorna zero', () => {
    expect(getRT(9616.10, 'DE', 'none', 'abr2026', 'C1')).toBe(0);
  });

  test('DE C1 Doutorado → R$ 11.058,51', () => {
    expect(getRT(9616.10, 'DE', 'dout', 'abr2026', 'C1')).toBe(11058.51);
  });

  test('40h A1 Mestrado → R$ 1.679,26', () => {
    expect(getRT(4478.03, '40h', 'mestrado', 'abr2026', 'A1')).toBe(1679.26);
  });

  test('20h B2 Especialização → R$ 356,00', () => {
    expect(getRT(3560.03, '20h', 'espec', 'abr2026', 'B2')).toBe(356.00);
  });
});

// ─── calcTransporte ───────────────────────────────────────────────────────────

describe('calcTransporte', () => {
  test('sem gasto retorna zero', () => {
    expect(calcTransporte(0, 22, 4478.03)).toBe(0);
  });

  test('gasto inferior ao desconto de 6% do VB retorna zero', () => {
    // VB = 4478.03; 6% = 268,68; gasto = 10×22 = 220 < 268,68 → 0
    expect(calcTransporte(10, 22, 4478.03)).toBe(0);
  });

  test('gasto superior ao desconto — retorna diferença', () => {
    // gasto = 20×22 = 440; desconto = 0,06×4478,03 = 268,68 → 440−268,68 ≈ 171,32
    expect(calcTransporte(20, 22, 4478.03)).toBeCloseTo(171.32, 1);
  });
});

// ─── calcPreEscolar ───────────────────────────────────────────────────────────

describe('calcPreEscolar', () => {
  test('zero filhos retorna zero', () => {
    expect(calcPreEscolar(0, false)).toBe(0);
  });

  test('1 filho sem cota-parte → R$ 526,64', () => {
    expect(calcPreEscolar(1, false)).toBeCloseTo(526.64, 2);
  });

  test('1 filho com cota-parte (50%) → R$ 263,32', () => {
    expect(calcPreEscolar(1, true)).toBeCloseTo(263.32, 2);
  });

  test('2 filhos sem cota-parte → R$ 1.053,28', () => {
    expect(calcPreEscolar(2, false)).toBeCloseTo(1053.28, 2);
  });
});

// ─── calcContracheque — integração ───────────────────────────────────────────
// Caso base: DE, Classe C Nível 1, Doutorado, RPPS, sem benefícios extras

describe('calcContracheque — DE C1 Doutorado, abr/2026, RPPS, sem benefícios', () => {
  const r = calcContracheque({
    periodo: 'abr2026', regime: 'DE', classe: 'C', nivel: 1,
    titulacao: 'dout',  previdencia: 'rpps',
    dependentes: 0,     descsimpl: true,
  });

  test('VB = R$ 9.616,10', () => expect(r.vb).toBeCloseTo(9616.10, 2));
  test('RT doutorado DE C1 = R$ 11.058,51', () => expect(r.rt).toBeCloseTo(11058.51, 2));
  test('base CPSS = VB + RT = R$ 20.674,61', () => expect(r.baseCPSS).toBeCloseTo(20674.61, 2));
  test('RPPS positivo', () => expect(r.rppsDesc).toBeGreaterThan(0));
  test('IRRF positivo', () => expect(r.irrf).toBeGreaterThan(0));
  test('líquido = bruto − totalDescontos', () => {
    expect(r.liquido).toBeCloseTo(r.bruto - r.totalDescontos, 2);
  });
  test('líquido menor que bruto', () => expect(r.liquido).toBeLessThan(r.bruto));
});

// Caso com benefícios: 40h, B3, Mestrado, auxílio alimentação + transporte

describe('calcContracheque — 40h B3 Mestrado, abr/2026, com auxílios', () => {
  const r = calcContracheque({
    periodo: 'abr2026', regime: '40h', classe: 'B', nivel: 3,
    titulacao: 'mestrado', previdencia: 'rpps',
    dependentes: 1, descsimpl: false,
    auxAlimentacao: true,
    auxTransporte: true, transpGastoDiario: 15, transpDias: 22,
  });

  test('VB correto (40h B3)', () => expect(r.vb).toBeCloseTo(5233.25, 2));
  test('RT mestrado 40h B3', () => expect(r.rt).toBeCloseTo(1962.47, 2));
  test('aux. alimentação incluso no bruto', () => expect(r.alimValor).toBeCloseTo(1192.00, 2));
  test('aux. transporte incluso no bruto', () => expect(r.transpValor).toBeGreaterThan(0));
  test('bruto > baseCPSS (auxílios somados)', () => expect(r.bruto).toBeGreaterThan(r.baseCPSS));
  test('líquido = bruto − totalDescontos', () => {
    expect(r.liquido).toBeCloseTo(r.bruto - r.totalDescontos, 2);
  });
});

// ─── calcProgressao ───────────────────────────────────────────────────────────

describe('calcProgressao', () => {
  const etapas = calcProgressao({
    posicaoAtual: 'A1',
    dataAtual:    '2024-01-01',
    regime:       'DE',
    titulacao:    'mestrado',
    reajuste2027:  5,
    mesesPorNivel: 25,
  });

  test('retorna todas as posições da carreira', () => {
    expect(etapas.length).toBe(PROGRESSAO_SEQUENCIA.length);
  });

  test('primeira posição é A1', () => {
    expect(etapas[0].posicao).toBe('A1');
  });

  test('última posição é T1 (Titular)', () => {
    expect(etapas[etapas.length - 1].posicao).toBe('T1');
  });

  test('VB cresce ao longo da carreira', () => {
    const vbs = etapas.map(e => e.vb);
    for (let i = 1; i < vbs.length; i++) {
      expect(vbs[i]).toBeGreaterThanOrEqual(vbs[i - 1]);
    }
  });

  test('cada etapa tem bruto = vb + rt', () => {
    etapas.forEach(e => {
      expect(e.bruto).toBeCloseTo(e.vb + e.rt, 2);
    });
  });
});
