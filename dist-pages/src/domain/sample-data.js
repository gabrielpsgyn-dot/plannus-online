import { APP_VERSION, DEFAULT_UI, SCHEMA_VERSION } from "./contracts.js";

const today = "2026-03-23";

export function createSampleState() {
  return {
    version: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    obra: {
      id: "obra-1",
      nome: "Residencial Horizonte",
      codigo: "PLN-HZT-001",
      cliente: "Construtora Horizonte",
      tipoObra: "Vertical",
      cidade: "Sao Paulo",
      dataInicioOficial: "2026-03-24",
      dataTerminoMeta: "2026-08-30",
      status: "PLANEJAMENTO",
      calendarioPadraoId: "cal-1",
      unidadePadraoTempo: "dia-util",
      versaoEstado: 1,
    },
    entities: {
      obras: [],
      eaps: [
        { id: "eap-1", obraId: "obra-1", codigoEAP: "1", nome: "Estrutura", nivel: 1, parentId: null, ordem: 1, ativo: true },
        { id: "eap-2", obraId: "obra-1", codigoEAP: "1.1", nome: "Pilares", nivel: 2, parentId: "eap-1", ordem: 1, ativo: true },
        { id: "eap-3", obraId: "obra-1", codigoEAP: "1.2", nome: "Alvenaria", nivel: 2, parentId: "eap-1", ordem: 2, ativo: true },
        { id: "eap-4", obraId: "obra-1", codigoEAP: "1.3", nome: "Revestimento", nivel: 2, parentId: "eap-1", ordem: 3, ativo: true },
      ],
      locations: [
        { id: "loc-obra", obraId: "obra-1", tipoLocal: "obra", nome: "Obra", codigo: "OBR", ordem: 1, parentId: null, torre: null, bloco: "A", pavimento: null, unidade: null, area: null, metadados: {} },
        { id: "loc-p1", obraId: "obra-1", tipoLocal: "pavimento", nome: "Pavimento 1", codigo: "P01", ordem: 1, parentId: "loc-obra", torre: "T1", bloco: "A", pavimento: 1, unidade: null, area: "Tipo", metadados: { repetitivo: true } },
        { id: "loc-p2", obraId: "obra-1", tipoLocal: "pavimento", nome: "Pavimento 2", codigo: "P02", ordem: 2, parentId: "loc-obra", torre: "T1", bloco: "A", pavimento: 2, unidade: null, area: "Tipo", metadados: { repetitivo: true } },
        { id: "loc-p3", obraId: "obra-1", tipoLocal: "pavimento", nome: "Pavimento 3", codigo: "P03", ordem: 3, parentId: "loc-obra", torre: "T1", bloco: "A", pavimento: 3, unidade: null, area: "Tipo", metadados: { repetitivo: true } },
        { id: "loc-p4", obraId: "obra-1", tipoLocal: "pavimento", nome: "Pavimento 4", codigo: "P04", ordem: 4, parentId: "loc-obra", torre: "T1", bloco: "A", pavimento: 4, unidade: null, area: "Tipo", metadados: { repetitivo: true } },
      ],
      services: [
        { id: "srv-1", obraId: "obra-1", codigoServico: "EST-PIL", nome: "Execucao de pilares", unidadeMedicao: "m3", categoria: "Estrutura", disciplina: "Civil", permiteParalelo: false, exigeEquipe: true, exigeQuantidade: true, exigeProdutividade: true, corVisual: "#0f4c5c", ordem: 1, ativo: true },
        { id: "srv-2", obraId: "obra-1", codigoServico: "ALV-VED", nome: "Alvenaria de vedacao", unidadeMedicao: "m2", categoria: "Vedacao", disciplina: "Civil", permiteParalelo: true, exigeEquipe: true, exigeQuantidade: true, exigeProdutividade: true, corVisual: "#1f7a8c", ordem: 2, ativo: true },
        { id: "srv-3", obraId: "obra-1", codigoServico: "REV-INT", nome: "Revestimento interno", unidadeMedicao: "m2", categoria: "Acabamento", disciplina: "Civil", permiteParalelo: true, exigeEquipe: true, exigeQuantidade: true, exigeProdutividade: true, corVisual: "#bfdbf7", ordem: 3, ativo: true },
      ],
      quantities: [
        { id: "qty-1", obraId: "obra-1", serviceId: "srv-1", locationId: "loc-p1", quantidade: 42, unidade: "m3", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-2", obraId: "obra-1", serviceId: "srv-1", locationId: "loc-p2", quantidade: 40, unidade: "m3", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-3", obraId: "obra-1", serviceId: "srv-1", locationId: "loc-p3", quantidade: 43, unidade: "m3", fatorComplexidade: 1.05, observacoes: "" },
        { id: "qty-4", obraId: "obra-1", serviceId: "srv-1", locationId: "loc-p4", quantidade: 41, unidade: "m3", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-5", obraId: "obra-1", serviceId: "srv-2", locationId: "loc-p1", quantidade: 260, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-6", obraId: "obra-1", serviceId: "srv-2", locationId: "loc-p2", quantidade: 255, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-7", obraId: "obra-1", serviceId: "srv-2", locationId: "loc-p3", quantidade: 264, unidade: "m2", fatorComplexidade: 1.03, observacoes: "" },
        { id: "qty-8", obraId: "obra-1", serviceId: "srv-2", locationId: "loc-p4", quantidade: 259, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-9", obraId: "obra-1", serviceId: "srv-3", locationId: "loc-p1", quantidade: 520, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-10", obraId: "obra-1", serviceId: "srv-3", locationId: "loc-p2", quantidade: 520, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
        { id: "qty-11", obraId: "obra-1", serviceId: "srv-3", locationId: "loc-p3", quantidade: 520, unidade: "m2", fatorComplexidade: 1.04, observacoes: "" },
        { id: "qty-12", obraId: "obra-1", serviceId: "srv-3", locationId: "loc-p4", quantidade: 520, unidade: "m2", fatorComplexidade: 1, observacoes: "" },
      ],
      teams: [
        { id: "team-1", obraId: "obra-1", nome: "Equipe Estrutura A", codigo: "EQ-EST-A", tipoEquipe: "Estrutura", serviceIdsPermitidos: ["srv-1"], produtividadeBase: 12, unidadeProdutividade: "m3/dia", custoDia: 4200, capacidadeSimultanea: 1, ativa: true, calendarioId: "cal-1" },
        { id: "team-2", obraId: "obra-1", nome: "Equipe Alvenaria A", codigo: "EQ-ALV-A", tipoEquipe: "Vedacao", serviceIdsPermitidos: ["srv-2"], produtividadeBase: 90, unidadeProdutividade: "m2/dia", custoDia: 2800, capacidadeSimultanea: 1, ativa: true, calendarioId: "cal-1" },
        { id: "team-3", obraId: "obra-1", nome: "Equipe Revestimento A", codigo: "EQ-REV-A", tipoEquipe: "Acabamento", serviceIdsPermitidos: ["srv-3"], produtividadeBase: 130, unidadeProdutividade: "m2/dia", custoDia: 3100, capacidadeSimultanea: 1, ativa: true, calendarioId: "cal-1" },
      ],
      workers: [
        { id: "wrk-1", obraId: "obra-1", nome: "Carlos Mota", matricula: "1001", funcao: "Encarregado", categoria: "Estrutura", produtivo: true, tipoMaoDeObra: "Direta", salarioCarteira: 4200, encargosPercentual: 0.78, custoMensalTotal: 7476, tetoSemProducao: 5, equipeId: "team-1", frenteServicoAtual: "srv-1", status: "ATIVO" },
        { id: "wrk-2", obraId: "obra-1", nome: "Ana Rocha", matricula: "2001", funcao: "Pedreira", categoria: "Vedacao", produtivo: true, tipoMaoDeObra: "Direta", salarioCarteira: 3200, encargosPercentual: 0.72, custoMensalTotal: 5504, tetoSemProducao: 4, equipeId: "team-2", frenteServicoAtual: "srv-2", status: "ATIVO" },
        { id: "wrk-3", obraId: "obra-1", nome: "Jonas Ribeiro", matricula: "3001", funcao: "Revestidor", categoria: "Acabamento", produtivo: true, tipoMaoDeObra: "Direta", salarioCarteira: 3400, encargosPercentual: 0.72, custoMensalTotal: 5848, tetoSemProducao: 4, equipeId: "team-3", frenteServicoAtual: "srv-3", status: "ATIVO" },
      ],
      calendars: [
        { id: "cal-1", obraId: "obra-1", nome: "Calendario Padrao Obra", diasUteisSemana: [1, 2, 3, 4, 5], feriadosFixos: ["2026-04-21", "2026-05-01"], feriadosMoveis: [], excecoes: [{ data: "2026-04-04", tipo: "MUTIRAO", util: true }], jornadaHorasDia: 8 },
      ],
      dependencies: [
        { id: "dep-1", obraId: "obra-1", predecessorServiceId: "srv-1", successorServiceId: "srv-2", tipoLigacao: "FS", lagDias: 0, escopoAplicacao: "MESMO_LOCAL", obrigatoria: true },
        { id: "dep-2", obraId: "obra-1", predecessorServiceId: "srv-2", successorServiceId: "srv-3", tipoLigacao: "FS", lagDias: 0, escopoAplicacao: "MESMO_LOCAL", obrigatoria: true },
      ],
      teamRules: [
        { id: "rule-1", obraId: "obra-1", serviceId: "srv-1", regraPipeline: "CONTINUO", numeroEquipes: 1, criterioDistribuicao: "LOCAL_ORDENADO", defasagemInicial: 0, reaproveitaEquipeAnterior: true, sentidoFluxo: "CRESCENTE" },
        { id: "rule-2", obraId: "obra-1", serviceId: "srv-2", regraPipeline: "CONTINUO", numeroEquipes: 1, criterioDistribuicao: "LOCAL_ORDENADO", defasagemInicial: 1, reaproveitaEquipeAnterior: true, sentidoFluxo: "CRESCENTE" },
        { id: "rule-3", obraId: "obra-1", serviceId: "srv-3", regraPipeline: "CONTINUO", numeroEquipes: 1, criterioDistribuicao: "LOCAL_ORDENADO", defasagemInicial: 1, reaproveitaEquipeAnterior: true, sentidoFluxo: "CRESCENTE" },
      ],
      tasks: [],
      measurements: [
        { id: "med-1", obraId: "obra-1", taskId: "task:obra-1:srv-1:loc-p1", dataReferencia: today, quantidadeExecutada: 30, percentualExecutado: 71.43, statusApontado: "EM_ANDAMENTO", equipeRealId: "team-1", observacao: "Concretagem concluida, aguardando forma complementar.", origem: "campo" },
        { id: "med-2", obraId: "obra-1", taskId: "task:obra-1:srv-2:loc-p1", dataReferencia: today, quantidadeExecutada: 120, percentualExecutado: 46.15, statusApontado: "EM_ANDAMENTO", equipeRealId: "team-2", observacao: "Alvenaria liberada em metade do pavimento.", origem: "campo" },
      ],
      baselines: [],
      logs: [],
    },
    planning: { generatedAt: null, hasDivergedFromBaseline: false, lastEngineResult: null, currentScenario: "Base" },
    baseline: { activeBaselineId: null },
    tracking: { referenceDate: today },
    ui: { ...DEFAULT_UI },
    audit: { integrityHash: null, lastSavedAt: null },
  };
}
