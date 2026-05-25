// ─── Tabelas salariais — Simulador Professor EBTT ────────────────────────────
// Fontes: UFC (progep.ufc.br), IFPR, MP 1.286/2024, Lei 15.191/2025
// Vigências: jan/2025 e abr/2026

// ── Estrutura da carreira (MP 1.286/2024) ────────────────────────────────────

const ESTRUTURA_CARREIRA = [
  { classe: 'A', label: 'Classe A — Auxiliar',   niveis: [1] },
  { classe: 'B', label: 'Classe B — Assistente', niveis: [1, 2, 3, 4] },
  { classe: 'C', label: 'Classe C — Adjunto',    niveis: [1, 2, 3, 4] },
  { classe: 'T', label: 'Titular',               niveis: [1] },
];

const POSICAO_LABEL = {
  A1: 'Classe A — Nível 1 (Auxiliar)',
  B1: 'Classe B — Nível 1 (Assistente)', B2: 'Classe B — Nível 2',
  B3: 'Classe B — Nível 3',             B4: 'Classe B — Nível 4',
  C1: 'Classe C — Nível 1 (Adjunto)',    C2: 'Classe C — Nível 2',
  C3: 'Classe C — Nível 3',             C4: 'Classe C — Nível 4',
  T1: 'Titular',
};

const PROGRESSAO_SEQUENCIA = ['A1','B1','B2','B3','B4','C1','C2','C3','C4','T1'];

// ── Vencimento Básico ─────────────────────────────────────────────────────────
// Por período → regime (h20/h40/de) → classe+nível

const VB = {
  jan2025: {
    h20: { A1:3090.43, B1:3260.40, B2:3407.12, B3:3560.44, B4:3720.66,
            C1:4595.02, C2:4801.79, C3:5017.87, C4:5243.68, T1:5768.05 },
    h40: { A1:4326.60, B1:4564.56, B2:4769.97, B3:4984.62, B4:5208.93,
            C1:6433.02, C2:6722.51, C3:7025.02, C4:7341.15, T1:8075.27 },
    de:  { A1:6180.86, B1:6520.81, B2:6814.24, B3:7120.88, B4:7441.32,
            C1:9190.03, C2:9603.58, C3:10035.75, C4:10487.35, T1:11536.10 },
  },
  abr2026: {
    h20: { A1:3198.59, B1:3390.51, B2:3560.03, B3:3738.04, B4:3924.94,
            C1:4808.05, C2:5048.45, C3:5300.87, C4:5565.92, T1:6122.51 },
    h40: { A1:4478.03, B1:4746.71, B2:4984.05, B3:5233.25, B4:5494.91,
            C1:6731.27, C2:7067.83, C3:7421.22, C4:7792.28, T1:8571.52 },
    de:  { A1:6397.19, B1:6781.02, B2:7120.07, B3:7476.07, B4:7849.87,
            C1:9616.10, C2:10096.90, C3:10601.75, C4:11131.83, T1:12245.03 },
  },
};

// ── Retribuição por Titulação — percentuais fixos sobre o VB ─────────────────
// RSC equivalências: RSC-I = espec, RSC-II = mestrado, RSC-III = dout
// Usados como fallback para jan/2025 e proj/2027 (sem tabela fixa)

const RT_PERCENT = {
  h20: { aperf:0.050, espec:0.100, mestrado:0.250, dout:0.575  },
  h40: { aperf:0.075, espec:0.150, mestrado:0.375, dout:0.8625 },
  de:  { aperf:0.100, espec:0.200, mestrado:0.500, dout:1.150  },
};

// ── RT — valores fixos da Lei 15.141/2025, vigência abr/2026 ─────────────────
// Fonte: Lei 12.772/2012 compilada, Anexo IV-C, efeitos a partir de 01/04/2026
// Usar estes valores elimina diferenças de arredondamento de ponto flutuante
const RT_TABELA = {
  abr2026: {
    h20: {
      A1: { aperf:  159.93, espec:  319.86, mestrado:  799.65, dout: 1839.19 },
      B1: { aperf:  169.52, espec:  339.05, mestrado:  847.63, dout: 1949.54 },
      B2: { aperf:  178.00, espec:  356.00, mestrado:  890.01, dout: 2047.02 },
      B3: { aperf:  186.90, espec:  373.80, mestrado:  934.51, dout: 2149.37 },
      B4: { aperf:  196.24, espec:  392.49, mestrado:  981.23, dout: 2256.84 },
      C1: { aperf:  240.40, espec:  480.80, mestrado: 1202.01, dout: 2764.63 },
      C2: { aperf:  252.42, espec:  504.84, mestrado: 1262.11, dout: 2902.86 },
      C3: { aperf:  265.04, espec:  530.09, mestrado: 1325.22, dout: 3048.00 },
      C4: { aperf:  278.29, espec:  556.59, mestrado: 1391.48, dout: 3200.40 },
      T1: { aperf:  306.12, espec:  612.25, mestrado: 1530.63, dout: 3520.45 },
    },
    h40: {
      A1: { aperf:  335.85, espec:  671.71, mestrado: 1679.26, dout: 3862.30 },
      B1: { aperf:  356.00, espec:  712.01, mestrado: 1780.01, dout: 4094.03 },
      B2: { aperf:  373.80, espec:  747.61, mestrado: 1869.02, dout: 4298.74 },
      B3: { aperf:  392.49, espec:  784.99, mestrado: 1962.47, dout: 4513.67 },
      B4: { aperf:  412.12, espec:  824.24, mestrado: 2060.59, dout: 4739.36 },
      C1: { aperf:  504.84, espec: 1009.69, mestrado: 2524.22, dout: 5805.71 },
      C2: { aperf:  530.08, espec: 1060.18, mestrado: 2650.43, dout: 6096.00 },
      C3: { aperf:  556.59, espec: 1113.19, mestrado: 2782.95, dout: 6400.80 },
      C4: { aperf:  584.42, espec: 1168.85, mestrado: 2922.10, dout: 6720.84 },
      T1: { aperf:  642.86, espec: 1285.73, mestrado: 3214.31, dout: 7392.93 },
    },
    de: {
      A1: { aperf:  639.72, espec: 1279.44, mestrado: 3198.59, dout:  7356.77 },
      B1: { aperf:  678.10, espec: 1356.20, mestrado: 3390.51, dout:  7798.17 },
      B2: { aperf:  712.00, espec: 1424.01, mestrado: 3560.03, dout:  8188.08 },
      B3: { aperf:  747.60, espec: 1495.22, mestrado: 3738.04, dout:  8597.48 },
      B4: { aperf:  784.98, espec: 1569.98, mestrado: 3924.94, dout:  9027.36 },
      C1: { aperf:  961.61, espec: 1923.22, mestrado: 4808.05, dout: 11058.51 },
      C2: { aperf: 1009.69, espec: 2019.38, mestrado: 5048.45, dout: 11611.44 },
      C3: { aperf: 1060.17, espec: 2120.35, mestrado: 5300.87, dout: 12192.01 },
      C4: { aperf: 1113.18, espec: 2226.37, mestrado: 5565.92, dout: 12801.61 },
      T1: { aperf: 1224.50, espec: 2449.01, mestrado: 6122.51, dout: 14081.78 },
    },
  },
};

const TITULACOES = [
  { value:'none',     label:'Sem RT (Graduação)' },
  { value:'aperf',    label:'Aperfeiçoamento' },
  { value:'espec',    label:'Especialização / RSC-I' },
  { value:'mestrado', label:'Mestrado / RSC-II' },
  { value:'dout',     label:'Doutorado / RSC-III' },
];

// ── GAE — Gratificação de Atividades de Extensão (exclusivo EBTT) ─────────────
const GAE_PERCENTUAL = 1.60; // 160% do VB

// ── Auxílio Alimentação por período ──────────────────────────────────────────
const AUXILIOS_ALIMENTACAO = {
  jan2025:  1175.00,
  abr2026:  1192.00,
  proj2027: 1192.00,
};

// ── IRRF 2026 — tabela progressiva mensal ────────────────────────────────────
// Lei 15.191/2025 e Lei 15.270/2025
const IRRF_TABLE = [
  { limite:2428.80,  aliquota:0,     deducao:0      },
  { limite:2826.65,  aliquota:0.075, deducao:182.16 },
  { limite:3751.05,  aliquota:0.150, deducao:394.16 },
  { limite:4664.68,  aliquota:0.225, deducao:675.49 },
  { limite:Infinity, aliquota:0.275, deducao:908.73 },
];
const IRRF_DEDUCAO_DEPENDENTE  = 189.59;
const IRRF_DESCONTO_SIMPLIFICADO = 607.20; // usa-se o MAIOR entre dep. e este

// Redução complementar 2026 (isenção efetiva para renda base ≤ R$ 7.350)
function calcReducaoIRRF2026(base) {
  if (base <= 5000) return 312.89;
  if (base <= 7350) return Math.max(0, 978.62 - 0.133145 * base);
  return 0;
}

// ── RPPS — alíquotas progressivas por vigência ───────────────────────────────
// jan2025: Portaria Interministerial MPS/MF 1/2025 (SM = R$ 1.518)
// abr2026: Portaria Interministerial MPS/MF 1/2026 (SM = R$ 1.622, reajuste INPC/INSS = 3,9%)
const RPPS_TABLES = {
  jan2025: [
    { limite:1518.00,  aliquota:0.075 },
    { limite:2793.87,  aliquota:0.090 },
    { limite:4190.81,  aliquota:0.120 },
    { limite:8157.41,  aliquota:0.140 },
    { limite:14082.16, aliquota:0.145 },
    { limite:27193.01, aliquota:0.165 },
    { limite:52981.47, aliquota:0.190 },
    { limite:Infinity, aliquota:0.220 },
  ],
  abr2026: [
    { limite:1622.00,  aliquota:0.075 },
    { limite:2902.83,  aliquota:0.090 },
    { limite:4354.25,  aliquota:0.120 },
    { limite:8475.55,  aliquota:0.140 },
    { limite:14631.36, aliquota:0.145 },
    { limite:28253.54, aliquota:0.165 },
    { limite:55047.75, aliquota:0.190 },
    { limite:Infinity, aliquota:0.220 },
  ],
};
RPPS_TABLES.proj2027 = RPPS_TABLES.abr2026; // reajuste 2027 não definido — usa base 2026

// Teto RGPS por período (= limite máximo do benefício do RGPS)
const TETO_RGPS = { jan2025: 8157.41, abr2026: 8475.55, proj2027: 8475.55 };
const TETO_RGPS_2026 = 8475.55; // mantido para referência na UI

// ── Saúde Suplementar — subsídio per capita (Portaria MGI 2.778/2026) ────────
// Matriz: faixa de renda bruta × faixa etária — vigência: 1º de maio de 2026
// Faixas etárias (índice 0–9):
const SAUDE_FAIXAS_ETARIAS = [
  '0–18 anos', '19–23 anos', '24–28 anos', '29–33 anos', '34–38 anos',
  '39–43 anos', '44–48 anos', '49–53 anos', '54–58 anos', '59+ anos',
];

// Faixas salariais (limite superior em R$) — Portaria MGI 2.778/2026:
const SAUDE_FAIXAS_RENDA = [
  { label: 'Até R$ 3.000,99',        limite: 3000.99  },
  { label: 'R$ 3.001,00–6.000,99',   limite: 6000.99  },
  { label: 'R$ 6.001,00–9.000,99',   limite: 9000.99  },
  { label: 'R$ 9.001,00–12.000,99',  limite: 12000.99 },
  { label: 'R$ 12.001,00–15.000,99', limite: 15000.99 },
  { label: 'R$ 15.001,00–18.000,99', limite: 18000.99 },
  { label: 'R$ 18.001,00–21.000,99', limite: 21000.99 },
  { label: 'Acima de R$ 21.001,00',  limite: Infinity  },
];

// Linhas = faixa de renda (0=até 3k … 7=acima 21k)
// Colunas = faixa etária  (0=0-18 … 9=59+)
// Fonte: Portaria MGI nº 2.778, de 2 de abril de 2026 (DOU, vigência mai/2026)
const SAUDE_SUBSIDIO_MATRIX = [
  //  0-18    19-23   24-28   29-33   34-38   39-43   44-48   49-53   54-58    59+
  [ 287.32, 300.88, 304.95, 335.81, 345.84, 357.32, 408.14, 414.63, 421.08, 464.89 ],
  [ 221.94, 234.73, 238.54, 260.23, 269.71, 280.56, 317.49, 322.55, 327.59, 362.90 ],
  [ 181.77, 184.16, 187.76, 201.54, 210.49, 220.69, 237.52, 241.28, 245.05, 265.96 ],
  [ 160.72, 162.96, 166.29, 179.38, 187.76, 197.33, 212.37, 215.74, 219.09, 238.92 ],
  [ 149.25, 151.31, 154.41, 167.42, 175.23, 184.17, 199.10, 202.25, 205.40, 224.87 ],
  [ 137.76, 139.67, 142.54, 155.46, 162.72, 171.02, 185.83, 188.76, 191.71, 210.82 ],
  [ 126.29, 128.04, 130.66, 143.50, 150.21, 157.87, 172.55, 175.28, 178.01, 196.76 ],
  [ 120.55, 122.22, 124.72, 131.54, 137.68, 144.71, 159.27, 161.80, 164.33, 182.71 ],
];

// ── Adicional de Risco / Insalubridade ───────────────────────────────────────
const SALARIO_MINIMO_TABLE = { jan2025: 1518.00, abr2026: 1622.00, proj2027: 1622.00 };
const SALARIO_MINIMO = 1622.00; // 2026 — valor base para cálculos de insalubridade

const ADICIONAL_RISCO = [
  { value:'nenhum',    label:'Nenhum',                          tipo:'fixo',   valor:0    },
  { value:'penoso',    label:'Atividade penosa (3% do VB)',     tipo:'pct_vb', pct:0.03   },
  { value:'insal_min', label:'Insalubridade mínima (5% do SM)',  tipo:'pct_sm', pct:0.05   },
  { value:'insal_med', label:'Insalubridade média (10% do SM)',  tipo:'pct_sm', pct:0.10   },
  { value:'insal_max', label:'Insalubridade máxima (20% do SM)', tipo:'pct_sm', pct:0.20   },
  { value:'perigoso',  label:'Periculosidade (10% do VB)',      tipo:'pct_vb', pct:0.10   },
];

// ── Adicional Noturno ─────────────────────────────────────────────────────────
// 25% da hora normal; hora normal = VB / horas mensais do regime
const HORAS_MENSAIS       = { h20:86.67, h40:173.33, de:173.33 };
const PERCENTUAL_NOTURNO  = 0.25;

// ── Auxílio Pré-escolar federal ───────────────────────────────────────────────
const AUX_PRE_ESCOLAR_FILHO = 526.64; // por filho/mês — Portaria MGI 2.785/2026 (mai/2026)

// ── Transporte ────────────────────────────────────────────────────────────────
// Subsídio legal: servidor paga 6% do VB (distribuído pelos dias úteis)
// Valor recebido = max(0, gasto_diario * dias - 0.06 * VB)
// O auxílio nunca é negativo — se gasto < 6% VB, não recebe nada
const TRANSP_PCT_DESCONTO = 0.06;

// ── Decisão Judicial ──────────────────────────────────────────────────────────
const DECISAO_TIPOS = [
  { value:'nao',   label:'Não'                         },
  { value:'fixo',  label:'Valor fixo (R$)'             },
  { value:'p2605', label:'26,05% da remuneração'       },
  { value:'p2886', label:'28,86% da remuneração'       },
  { value:'p4794', label:'47,94% da remuneração'       },
];
