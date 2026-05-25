// Carrega data.js e calc.js (que usam variáveis globais, sem módulos ES)
// dentro de uma Function para capturar todos os const/let/function no mesmo escopo.
const fs   = require('fs');
const path = require('path');

const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'),  'utf8');
const calcCode = fs.readFileSync(path.join(__dirname, '../js/calc.js'),  'utf8');

// eslint-disable-next-line no-new-func
const load = new Function(`
  ${dataCode}
  ${calcCode}
  return {
    calcRPPS,
    calcIRRF,
    calcReducaoIRRF2026,
    getVB,
    getRT,
    calcContracheque,
    calcProgressao,
    calcAdicionalRisco,
    calcAdicionalNoturno,
    calcSaude,
    calcTransporte,
    calcPreEscolar,
    RPPS_TABLES,
    IRRF_TABLE,
    VB,
    RT_TABELA,
    IRRF_DESCONTO_SIMPLIFICADO,
    IRRF_DEDUCAO_DEPENDENTE,
    PROGRESSAO_SEQUENCIA,
  };
`);

module.exports = load();
