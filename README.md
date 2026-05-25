# Simulador Professor EBTT

![Testes](https://github.com/educainfo/simulador-ebtt/actions/workflows/tests.yml/badge.svg)

Simulador de contracheque e progressão de carreira para professores da **Educação Básica, Técnica e Tecnológica (EBTT)** dos Institutos Federais (IFs), CEFET e Colégio Pedro II.

Acesse em: **[educainfo.github.io/simulador-ebtt](https://educainfo.github.io/simulador-ebtt)**

---

## Funcionalidades

### Aba Simulador
- Cálculo detalhado do contracheque com **dois cenários simultâneos** para comparação lado a lado.
- Seleção de **período**: Abr/2026 e projeção 2027 (com percentual de reajuste configurável).
- Seleção de **regime de trabalho**: 20h, 40h ou Dedicação Exclusiva (DE).
- Seleção de **classe e nível** na carreira (A1, B1–B4, C1–C4, Titular).
- Seleção de **titulação / RSC**: Graduação, Aperfeiçoamento, Especialização (RSC-I), Mestrado (RSC-II) ou Doutorado (RSC-III).
- Cálculo automático de **RPPS** (previdência progressiva) e **IRRF** (tabela progressiva mensal com redução complementar 2026).
- Chips opcionais de benefícios e descontos:
  | Benefícios | Descontos |
  |---|---|
  | Auxílio Alimentação | Contribuição Sindical |
  | Saúde Suplementar (Portaria MGI 2.778/2026) | Outros descontos |
  | Auxílio Transporte | |
  | Auxílio Pré-Escolar | |
  | Anuênio (até 35%) | |
  | Adicional de Risco / Insalubridade | |
  | Adicional Noturno | |
  | GAE — Gratificação de Atividades de Extensão (160% do VB) | |
  | Função CD/FG | |
  | Abono de Permanência | |

### Aba Progressão
- Projeção da evolução salarial ao longo de toda a carreira.
- Configuração de classe, nível atual, data de ingresso no nível e regime.
- Estimativa de data e valor para cada progressão futura.

### Aba Tabelas
- Tabelas completas de Vencimento Básico (VB) e Retribuição por Titulação (RT) por período, regime e posição na carreira.

---

## Base Legal

| Norma | Conteúdo |
|---|---|
| Lei 12.772/2012 | Plano de Carreiras e Cargos de Magistério Federal |
| MP 1.286/2024 | Nova estrutura de classes (A, B, C e Titular) |
| Lei 15.191/2025 | Tabelas salariais e IRRF |
| Lei 15.270/2025 | Complementação salarial |
| Portaria MGI 2.778/2026 | Saúde suplementar — subsídio per capita |
| Portaria Intermin. MPS/MF 1/2026 | Alíquotas RPPS progressivas |

> **Atenção:** Os valores são **estimados**. Confirme sempre no SIAPE ou no holerite oficial.

---

## Tecnologias

- HTML5, CSS3 e JavaScript puro (sem frameworks ou bundlers)
- [Bootstrap 5.3](https://getbootstrap.com/) para layout e componentes de UI
- Funciona **100% no navegador**, sem servidor ou back-end
- [Jest 29](https://jestjs.io/) para testes automatizados das funções de cálculo

---

## Estrutura do Projeto

```
simulador-ebtt/
├── index.html                      # Estrutura e marcação HTML
├── css/
│   └── styles.css                  # Estilos customizados
├── js/
│   ├── data.js                     # Tabelas salariais, alíquotas e constantes legais
│   ├── calc.js                     # Lógica de cálculo (VB, RT, RPPS, IRRF, adicionais)
│   └── app.js                      # Interface, estado e interações do usuário
├── tests/
│   ├── helpers.js                  # Carrega data.js + calc.js no contexto do Node
│   └── calc.test.js                # 48 testes unitários e de integração
├── .github/workflows/tests.yml     # Workflow do GitHub Actions
├── jest.config.js
└── package.json
```

---

## Como executar localmente

Basta abrir o arquivo `index.html` diretamente no navegador — não são necessários servidor ou instalação de dependências.

```bash
# Opcional: servidor local simples com Node.js
npx serve .
```

## Testes

Os testes cobrem as funções de cálculo de `calc.js` — RPPS, IRRF, VB, RT, auxílios e o contracheque completo — verificando os valores contra as tabelas legais vigentes.

```bash
npm install
npm test
```

Os testes rodam automaticamente no **GitHub Actions** a cada push ou pull request.

---

## Contribuições

Contribuições são bem-vindas! Ao abrir um PR, verifique:

- Se os valores inseridos possuem **fonte legal** (lei, decreto ou portaria).
- Se os cálculos foram validados contra um holerite real ou simulação oficial do SIAPE.
- Se `npm test` continua passando após a alteração.

---

## Licença

Distribuído sob a licença [MIT](LICENSE).
