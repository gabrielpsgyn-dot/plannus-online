(function () {

// FILE: src/domain/contracts.js
const APP_KEY = "plannus.app.state";
const APP_VERSION = "1.0.1";
const SCHEMA_VERSION = 1;
const STATUS = Object.freeze({
  NAO_INICIADO: "NAO_INICIADO",
  LIBERADO: "LIBERADO",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  PARALISADO: "PARALISADO",
  CONCLUIDO: "CONCLUIDO",
  ATRASADO: "ATRASADO",
  BLOQUEADO: "BLOQUEADO",
  INCONSISTENTE: "INCONSISTENTE",
});
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", group: "Operacao" },
  { key: "obra", label: "Obra", group: "Estrutura" },
  { key: "eap", label: "EAP", group: "Estrutura" },
  { key: "locais", label: "Locais", group: "Estrutura" },
  { key: "servicos", label: "Servicos", group: "Estrutura" },
  { key: "quantidades", label: "Quantidades", group: "Estrutura" },
  { key: "equipes", label: "Equipes", group: "Recursos" },
  { key: "funcionarios", label: "Funcionarios", group: "Recursos" },
  { key: "calendarios", label: "Calendarios", group: "Regras" },
  { key: "predecessoras", label: "Predecessoras", group: "Regras" },
  { key: "planejamento", label: "Motor de Planejamento", group: "Planejamento" },
  { key: "baseline", label: "Baseline", group: "Planejamento" },
  { key: "acompanhamento", label: "Acompanhamento", group: "Planejamento" },
  { key: "curtoPrazo", label: "Curto Prazo", group: "Planejamento" },
  { key: "gantt", label: "Gantt", group: "Visualizacao" },
  { key: "lob", label: "Linha de Balanco", group: "Visualizacao" },
  { key: "relatorios", label: "Relatorios", group: "Visualizacao" },
  { key: "auditoria", label: "Auditoria Tecnica", group: "Sistema" },
  { key: "configuracoes", label: "Configuracoes", group: "Sistema" },
];
const DEFAULT_UI = Object.freeze({
  activeView: "dashboard",
  selectedTaskId: null,
  trackingEditorTaskId: null,
  trackingContextMenu: null,
  filters: {
    status: "ALL",
    horizonDays: 14,
    serviceId: "ALL",
    locationId: "ALL",
    ganttScale: "week",
    timelineGroup: "task",
    longRangeFocus: "all",
    periodPreset: "7",
    discipline: "ALL",
    teamId: "ALL",
    criticality: "ALL",
    deviation: "ALL",
    inconsistency: "ALL",
    responsible: "ALL",
    density: "detailed",
    acompanhamentoMode: "task_local",
    search: "",
  },
  notices: [],
});
const ENTITY_KEYS = Object.freeze(["obras", "eaps", "locations", "services", "quantities", "teams", "workers", "calendars", "dependencies", "teamRules", "tasks", "measurements", "baselines", "logs"]);
const TECHNICAL_MODULES = Object.freeze({
  REPOSITORY: "repository",
  MIGRATION: "migration",
  VALIDATION: "validation",
  ENGINE: "engine",
  BASELINE: "baseline",
  TRACKING: "tracking",
  IMPORT: "import",
  EXPORT: "export",
  UI: "ui",
});
const LINK_TYPES = ["FS", "SS", "FF", "SF"];


// FILE: src/services/date-utils.js
function parseISODate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
function toISODate(date) { return date.toISOString().slice(0, 10); }
function addDays(date, days) { const copy = new Date(date.getTime()); copy.setUTCDate(copy.getUTCDate() + days); return copy; }
function diffDays(startISO, endISO) { return Math.round((parseISODate(endISO) - parseISODate(startISO)) / 86400000); }
function formatDate(iso) { return iso ? parseISODate(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"; }
function maxISODate(values) { return values.filter(Boolean).sort().at(-1) ?? null; }


// FILE: src/domain/calendar.js

function isWorkingDay(calendar, isoDate) {
  const date = parseISODate(isoDate);
  const weekday = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  const exception = calendar.excecoes?.find((item) => item.data === isoDate);
  if (exception) return Boolean(exception.util);
  if (calendar.feriadosFixos?.includes(isoDate) || calendar.feriadosMoveis?.includes(isoDate)) return false;
  return calendar.diasUteisSemana.includes(weekday);
}

function nextWorkingDate(calendar, preferredISO) {
  let current = parseISODate(preferredISO);
  while (!isWorkingDay(calendar, toISODate(current))) current = addDays(current, 1);
  return toISODate(current);
}

function addWorkingDays(calendar, startISO, days) {
  let remaining = Math.max(0, Math.ceil(days));
  let current = parseISODate(startISO);
  if (remaining === 0) return nextWorkingDate(calendar, startISO);
  while (remaining > 0) {
    if (isWorkingDay(calendar, toISODate(current))) {
      remaining -= 1;
      if (remaining === 0) break;
    }
    current = addDays(current, 1);
  }
  return nextWorkingDate(calendar, toISODate(current));
}


// FILE: src/domain/sample-data.js

const today = "2026-03-23";

function createSampleState() {
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


// FILE: src/domain/validators.js

function issue(code, message, recordId, severity = "error") {
  return { code, message, recordId, severity };
}

function validateState(state) {
  const issues = [];
  const { obra, entities } = state;
  if (!obra?.id) issues.push(issue("OBRA_MISSING", "Obra principal inexistente.", "obra"));
  if (!entities.calendars.find((item) => item.id === obra.calendarioPadraoId)) issues.push(issue("CALENDAR_MISSING", "Calendario padrao nao encontrado.", obra.calendarioPadraoId));
  for (const service of entities.services.filter((item) => item.ativo)) {
    const teams = entities.teams.filter((team) => team.serviceIdsPermitidos.includes(service.id) && team.ativa);
    if (service.exigeEquipe && teams.length === 0) issues.push(issue("SERVICE_TEAM_MISSING", `Servico ${service.nome} sem equipe compativel.`, service.id));
  }
  for (const quantity of entities.quantities) {
    if (quantity.quantidade < 0) issues.push(issue("NEGATIVE_QUANTITY", "Quantidade negativa nao permitida.", quantity.id));
    if (!entities.services.find((service) => service.id === quantity.serviceId)) issues.push(issue("SERVICE_REFERENCE_BROKEN", "Quantidade referencia servico inexistente.", quantity.id));
    if (!entities.locations.find((location) => location.id === quantity.locationId)) issues.push(issue("LOCATION_REFERENCE_BROKEN", "Quantidade referencia local inexistente.", quantity.id));
  }
  for (const dependency of entities.dependencies) {
    if (dependency.predecessorServiceId === dependency.successorServiceId) issues.push(issue("SELF_DEPENDENCY", "Autodependencia nao permitida.", dependency.id));
    if (!LINK_TYPES.includes(dependency.tipoLigacao)) issues.push(issue("INVALID_LINK_TYPE", "Tipo de ligacao invalido.", dependency.id));
  }
  const graph = new Map(entities.services.map((service) => [service.id, []]));
  for (const dependency of entities.dependencies) if (graph.has(dependency.predecessorServiceId)) graph.get(dependency.predecessorServiceId).push(dependency.successorServiceId);
  const seen = new Set();
  const trail = new Set();
  function visit(node) {
    if (trail.has(node)) { issues.push(issue("DEPENDENCY_CYCLE", "Ciclo de predecessoras detectado.", node)); return; }
    if (seen.has(node)) return;
    seen.add(node);
    trail.add(node);
    for (const target of graph.get(node) ?? []) visit(target);
    trail.delete(node);
  }
  for (const node of graph.keys()) visit(node);
  for (const measurement of entities.measurements) {
    if (measurement.percentualExecutado > 100 || measurement.percentualExecutado < 0) issues.push(issue("MEASUREMENT_PERCENT_INVALID", "Percentual de medicao fora da faixa 0-100.", measurement.id));
    if (measurement.quantidadeExecutada < 0) issues.push(issue("MEASUREMENT_NEGATIVE", "Medicao negativa nao permitida.", measurement.id));
  }
  for (const task of entities.tasks) if (task.quantidade > 0 && task.duracaoPlanejadaDias < 1) issues.push(issue("TASK_DURATION_INVALID", "Task produtiva nao pode ter duracao menor que 1 dia util.", task.id));
  return {
    valid: !issues.some((item) => item.severity === "error"),
    issues,
    module: TECHNICAL_MODULES.VALIDATION,
    blockingTasks: issues.filter((item) => item.severity === "error").map((item) => item.recordId),
    recommendedStatus: issues.length ? STATUS.INCONSISTENTE : STATUS.LIBERADO,
  };
}


// FILE: src/domain/engine.js

const EAP_BY_SERVICE = new Map([["srv-1", "eap-2"], ["srv-2", "eap-3"], ["srv-3", "eap-4"]]);

function roundDuration(quantity, productivity) {
  return Math.max(1, Math.ceil(quantity / productivity));
}

function stableTaskId(obraId, serviceId, locationId) {
  return `task:${obraId}:${serviceId}:${locationId}`;
}

function log(module, action, message, context = {}, level = "INFO") {
  return {
    id: `log-${module}-${action}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    obraId: context.obraId ?? "obra-unknown",
    timestamp: new Date().toISOString(),
    nivel: level,
    modulo: module,
    acao: action,
    mensagem: message,
    contexto: context,
  };
}

function choosePrimaryTeam(serviceId, teams) {
  return teams.find((team) => team.serviceIdsPermitidos.includes(serviceId) && team.ativa) ?? null;
}

function aggregateProgress(task, measurements) {
  const list = measurements.filter((item) => item.taskId === task.id).sort((a, b) => a.dataReferencia.localeCompare(b.dataReferencia));
  if (!list.length) return { actualStartISO: null, actualEndISO: null, percentComplete: 0 };
  const latest = list.at(-1);
  return {
    actualStartISO: list[0].dataReferencia,
    actualEndISO: latest.percentualExecutado >= 100 ? latest.dataReferencia : null,
    percentComplete: Math.min(100, latest.percentualExecutado),
  };
}

function statusFromTracking(task, referenceDate) {
  if (task.bloqueios?.length) return STATUS.BLOQUEADO;
  if (task.inconsistente) return STATUS.INCONSISTENTE;
  if (task.actualEndISO || task.percentComplete >= 100) return STATUS.CONCLUIDO;
  if (task.actualStartISO || task.percentComplete > 0) return referenceDate > task.plannedEndISO ? STATUS.ATRASADO : STATUS.EM_ANDAMENTO;
  return referenceDate > task.plannedEndISO ? STATUS.ATRASADO : STATUS.NAO_INICIADO;
}

function dependencyDate(predecessor, dependency, calendar) {
  const lag = dependency.lagDias ?? 0;
  switch (dependency.tipoLigacao) {
    case "SS": return addWorkingDays(calendar, predecessor.plannedStartISO, lag + 1);
    case "FF": return addWorkingDays(calendar, predecessor.plannedEndISO, lag);
    case "SF": return addWorkingDays(calendar, predecessor.plannedStartISO, lag);
    case "FS":
    default: return addWorkingDays(calendar, predecessor.plannedEndISO, lag + 1);
  }
}

function runPlanningEngine(state) {
  const validation = validateState(state);
  const logs = [log(TECHNICAL_MODULES.ENGINE, "VALIDATE", `Validacao executada com ${validation.issues.length} inconsistencias.`, { obraId: state.obra.id, issues: validation.issues })];
  if (!validation.valid) {
    return {
      nextTasks: state.entities.tasks.map((task) => ({ ...task, status: STATUS.INCONSISTENTE, inconsistente: true })),
      result: { valid: false, issues: validation.issues, summary: "Calculo bloqueado por inconsistencias estruturais." },
      logs,
    };
  }

  const calendar = state.entities.calendars.find((item) => item.id === state.obra.calendarioPadraoId);
  const workStartISO = nextWorkingDate(calendar, state.obra.dataInicioOficial);
  const locations = state.entities.locations.slice().sort((a, b) => a.ordem - b.ordem);
  const services = state.entities.services.filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem);
  const tasks = [];

  for (const service of services) {
    const teamRule = state.entities.teamRules.find((item) => item.serviceId === service.id);
    const team = choosePrimaryTeam(service.id, state.entities.teams);
    const quantities = state.entities.quantities
      .filter((item) => item.serviceId === service.id && item.quantidade > 0)
      .sort((a, b) => (locations.find((loc) => loc.id === a.locationId)?.ordem ?? 999) - (locations.find((loc) => loc.id === b.locationId)?.ordem ?? 999));

    let previousTeamEnd = workStartISO;
    quantities.forEach((quantity, index) => {
      const location = locations.find((item) => item.id === quantity.locationId);
      const productivity = team?.produtividadeBase ? team.produtividadeBase / (quantity.fatorComplexidade || 1) : 0;
      const duration = productivity > 0 ? roundDuration(quantity.quantidade, productivity) : 0;
      const lag = index === 0 ? 0 : Number(teamRule?.defasagemInicial ?? 0);
      const plannedStartISO = index === 0 ? workStartISO : addWorkingDays(calendar, previousTeamEnd, lag);
      const task = {
        id: stableTaskId(state.obra.id, service.id, location.id),
        obraId: state.obra.id,
        serviceId: service.id,
        locationId: location.id,
        equipeId: team?.id ?? null,
        eapId: EAP_BY_SERVICE.get(service.id) ?? state.entities.eaps[0]?.id ?? null,
        quantidade: quantity.quantidade,
        produtividadePlanejada: productivity,
        duracaoPlanejadaDias: duration,
        baselineStartISO: null,
        baselineEndISO: null,
        plannedStartISO,
        plannedEndISO: productivity > 0 ? addWorkingDays(calendar, plannedStartISO, duration) : null,
        actualStartISO: null,
        actualEndISO: null,
        percentComplete: 0,
        status: STATUS.NAO_INICIADO,
        predecessorTaskIds: [],
        successorTaskIds: [],
        isCritical: false,
        sourceRule: teamRule?.regraPipeline ?? "MANUAL",
        bloqueios: [],
        observacoes: `Task gerada por servico ${service.nome} no local ${location.nome}.`,
        inconsistente: !team || productivity <= 0,
      };
      tasks.push(task);
      previousTeamEnd = task.plannedEndISO ?? previousTeamEnd;
    });
  }

  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  for (const dependency of state.entities.dependencies) {
    for (const task of tasks.filter((item) => item.serviceId === dependency.successorServiceId)) {
      const predecessor = tasks.find((item) => item.serviceId === dependency.predecessorServiceId && item.locationId === task.locationId);
      if (!predecessor) {
        task.bloqueios.push(`Predecessora nao resolvida para ${dependency.id}`);
        task.inconsistente = true;
        continue;
      }
      task.predecessorTaskIds.push(predecessor.id);
      predecessor.successorTaskIds.push(task.id);
    }
  }

  const teamAvailability = new Map();
  for (const task of tasks) {
    const teamFreeDate = task.equipeId ? teamAvailability.get(task.equipeId) ?? workStartISO : workStartISO;
    const predecessorDates = task.predecessorTaskIds.map((id) => {
      const predecessor = taskMap.get(id);
      const dependency = state.entities.dependencies.find((item) => item.predecessorServiceId === predecessor.serviceId && item.successorServiceId === task.serviceId);
      return dependencyDate(predecessor, dependency, calendar);
    });
    const candidateStart = maxISODate([task.plannedStartISO, teamFreeDate, ...predecessorDates]) ?? workStartISO;
    task.plannedStartISO = nextWorkingDate(calendar, candidateStart);
    task.plannedEndISO = task.produtividadePlanejada > 0 ? addWorkingDays(calendar, task.plannedStartISO, task.duracaoPlanejadaDias) : null;
    if (task.equipeId && task.plannedEndISO) teamAvailability.set(task.equipeId, task.plannedEndISO);
  }

  const baseline = state.entities.baselines.find((item) => item.id === state.baseline.activeBaselineId);
  for (const task of tasks) {
    if (baseline) {
      const snapshot = baseline.tasksSnapshot.find((item) => item.id === task.id);
      task.baselineStartISO = snapshot?.plannedStartISO ?? null;
      task.baselineEndISO = snapshot?.plannedEndISO ?? null;
    }
    Object.assign(task, aggregateProgress(task, state.entities.measurements));
    task.status = statusFromTracking(task, state.tracking.referenceDate);
  }

  const plannedFinish = maxISODate(tasks.map((task) => task.plannedEndISO));
  tasks.forEach((task) => { task.isCritical = task.plannedEndISO === plannedFinish || task.successorTaskIds.length === 0; });

  logs.push(log(TECHNICAL_MODULES.ENGINE, "GENERATE_TASKS", `Motor gerou ${tasks.length} tasks.`, { obraId: state.obra.id, taskCount: tasks.length }));
  logs.push(log(TECHNICAL_MODULES.ENGINE, "SCHEDULE", `Planejamento posicionado ate ${plannedFinish}.`, { obraId: state.obra.id, plannedFinish }));
  return {
    nextTasks: tasks,
    result: {
      valid: true,
      issues: validation.issues,
      plannedFinish,
      summary: `Motor executado com ${tasks.length} tasks e termino previsto em ${formatDate(plannedFinish)}.`,
      metrics: {
        taskCount: tasks.length,
        delayedTasks: tasks.filter((task) => task.status === STATUS.ATRASADO).length,
        inconsistencies: tasks.filter((task) => task.inconsistente).length,
        averageIdleDays: state.entities.teams.length
          ? state.entities.teams.reduce((sum, team) => {
              const teamTasks = tasks.filter((task) => task.equipeId === team.id).sort((a, b) => a.plannedStartISO.localeCompare(b.plannedStartISO));
              let idle = 0;
              for (let index = 1; index < teamTasks.length; index += 1) idle += Math.max(0, diffDays(teamTasks[index - 1].plannedEndISO, teamTasks[index].plannedStartISO) - 1);
              return sum + idle;
            }, 0) / state.entities.teams.length
          : 0,
      },
      preview: tasks.slice(0, 8).map((task) => ({ nome: task.id, inicio: formatDate(task.plannedStartISO), termino: formatDate(task.plannedEndISO), status: task.status })),
    },
    logs,
  };
}

function calculateKpis(state) {
  const tasks = state.entities.tasks;
  const baseline = state.entities.baselines.find((item) => item.id === state.baseline.activeBaselineId);
  const totalQuantity = tasks.reduce((sum, task) => sum + (task.quantidade || 0), 0);
  const completedQuantity = tasks.reduce((sum, task) => sum + ((task.quantidade || 0) * ((task.percentComplete || 0) / 100)), 0);
  const plannedNowQuantity = tasks.reduce((sum, task) => sum + (task.plannedEndISO && task.plannedEndISO <= state.tracking.referenceDate ? task.quantidade : 0), 0);
  const baselineQuantity = baseline ? baseline.tasksSnapshot.reduce((sum, task) => sum + (task.plannedEndISO && task.plannedEndISO <= state.tracking.referenceDate ? task.quantidade : 0), 0) : 0;
  const ppcDenominator = tasks.filter((task) => task.plannedStartISO <= state.tracking.referenceDate && task.plannedEndISO >= state.tracking.referenceDate).length;
  const ppcNumerator = tasks.filter((task) => task.status === STATUS.CONCLUIDO && task.actualEndISO <= task.plannedEndISO).length;
  const laborCost = tasks.reduce((sum, task) => sum + ((state.entities.teams.find((item) => item.id === task.equipeId)?.custoDia ?? 0) * (task.duracaoPlanejadaDias ?? 0)), 0);
  return {
    percentualConcluidoFisico: totalQuantity > 0 ? (completedQuantity / totalQuantity) * 100 : 0,
    percentualPlanejado: totalQuantity > 0 ? (plannedNowQuantity / totalQuantity) * 100 : 0,
    desvioPlanejadoReal: totalQuantity > 0 ? ((completedQuantity - plannedNowQuantity) / totalQuantity) * 100 : 0,
    desvioBaselineReal: totalQuantity > 0 ? ((completedQuantity - baselineQuantity) / totalQuantity) * 100 : 0,
    ppc: ppcDenominator > 0 ? (ppcNumerator / ppcDenominator) * 100 : 0,
    tarefasAtrasadas: tasks.filter((task) => task.status === STATUS.ATRASADO).length,
    tarefasCriticas: tasks.filter((task) => task.isCritical).length,
    frentesAtivas: new Set(tasks.filter((task) => task.status === STATUS.EM_ANDAMENTO).map((task) => task.locationId)).size,
    produtividadeMediaEquipe: tasks.length ? tasks.reduce((sum, task) => sum + (task.produtividadePlanejada || 0), 0) / tasks.length : 0,
    ociosidadeEquipes: state.entities.teams.map((team) => ({ teamId: team.id, nome: team.nome, diasPlanejados: tasks.filter((task) => task.equipeId === team.id).reduce((sum, task) => sum + (task.duracaoPlanejadaDias || 0), 0) })),
    prazoProjetado: maxISODate(tasks.map((task) => task.plannedEndISO)),
    custoEstimadoMaoDeObra: laborCost,
  };
}

function createBaselineSnapshot(state, name = "Baseline 1", createdBy = "PLANNUS") {
  const tasksSnapshot = state.entities.tasks.map((task) => ({ ...task, predecessorTaskIds: [...task.predecessorTaskIds], successorTaskIds: [...task.successorTaskIds], bloqueios: [...task.bloqueios] }));
  const regrasSnapshot = state.entities.teamRules.map((rule) => ({ ...rule }));
  const hashIntegridade = btoa(unescape(encodeURIComponent(JSON.stringify(tasksSnapshot.map((task) => [task.id, task.plannedStartISO, task.plannedEndISO, task.equipeId]))))).slice(0, 32);
  return {
    id: `baseline-${Date.now()}`,
    obraId: state.obra.id,
    nome: name,
    dataCriacao: new Date().toISOString(),
    criadoPor: createdBy,
    tasksSnapshot,
    regrasSnapshot,
    hashIntegridade,
    ativa: true,
  };
}


// FILE: src/repository/local-repository.js

function log(action, message, context = {}) {
  return {
    id: `repo-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    obraId: context.obraId ?? "obra-1",
    timestamp: new Date().toISOString(),
    nivel: "INFO",
    modulo: TECHNICAL_MODULES.REPOSITORY,
    acao: action,
    mensagem: message,
    contexto: context,
  };
}

function migrateState(rawState) {
  const state = structuredClone(rawState);
  if (!state.schemaVersion || state.schemaVersion < SCHEMA_VERSION) state.schemaVersion = SCHEMA_VERSION;
  state.version = APP_VERSION;
  return state;
}

function loadState() {
  const raw = localStorage.getItem(APP_KEY);
  if (!raw) {
    const sample = createSampleState();
    sample.entities.logs.push(log("BOOTSTRAP", "Estado inicial de exemplo criado.", { obraId: sample.obra.id }));
    return sample;
  }
  try {
    const state = migrateState(JSON.parse(raw));
    state.entities.logs.push(log("LOAD", "Estado carregado do armazenamento local.", { obraId: state.obra.id }));
    return state;
  } catch (error) {
    const sample = createSampleState();
    sample.entities.logs.push({ ...log("LOAD_ERROR", "Falha ao carregar estado. Dataset inicial restaurado.", { obraId: sample.obra.id, reason: String(error) }), nivel: "ERROR" });
    return sample;
  }
}

function saveState(state) {
  const next = structuredClone(state);
  next.version = APP_VERSION;
  next.schemaVersion = SCHEMA_VERSION;
  next.audit.lastSavedAt = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(next));
}

function resetState() {
  const sample = createSampleState();
  sample.entities.logs.push(log("RESET", "Estado restaurado para o dataset inicial.", { obraId: sample.obra.id }));
  saveState(sample);
  return sample;
}

// FILE: src/repository/plannus-online-repository.js
const PLANNUS_ONLINE_CONFIG = Object.freeze({
  enabled: true,
  apiBase: "https://plannus-api.gabrielpsgyn.workers.dev",
  defaultObraId: "obra_demo_001",
  autosave: false,
});
const ONLINE_META_KEY = "plannus.online.meta";
const ONLINE_STATUS_KEY = "plannus.online.status";

function logOnline(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_ONLINE] ${message}`);
  else console.log(`[PLANNUS_ONLINE] ${message}`, payload);
}
function logSync(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_SYNC] ${message}`);
  else console.log(`[PLANNUS_SYNC] ${message}`, payload);
}
function logRepository(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_REPOSITORY] ${message}`);
  else console.log(`[PLANNUS_REPOSITORY] ${message}`, payload);
}
function readOnlineMeta() {
  try { return JSON.parse(localStorage.getItem(ONLINE_META_KEY) || "{}"); } catch (_) { return {}; }
}
function writeOnlineMeta(meta) { localStorage.setItem(ONLINE_META_KEY, JSON.stringify(meta)); }
function readSyncStatus() { return localStorage.getItem(ONLINE_STATUS_KEY) || ""; }
function writeSyncStatus(text) { localStorage.setItem(ONLINE_STATUS_KEY, text || ""); }
function nowIso() { return new Date().toISOString(); }
function backupBeforeOnlineLoad() {
  const raw = localStorage.getItem(APP_KEY);
  if (!raw) return null;
  const key = `plannus.backup.before_online_load.${Date.now()}`;
  localStorage.setItem(key, raw);
  return key;
}
async function readJsonSafe(response) {
  try { return await response.json(); } catch (_) { return null; }
}
function resolveOnlineState(payload) {
  if (payload?.state) return payload.state;
  if (payload?.obra?.state_json) return payload.obra.state_json;
  if (payload?.obra?.state) return payload.obra.state;
  return null;
}
function resolveOnlineRevision(payload) {
  return Number(payload?.revision ?? payload?.obra?.revision ?? 0) || 0;
}
function resolveOnlineUpdatedAt(payload) {
  return payload?.updated_at ?? payload?.obra?.updated_at ?? null;
}
function baseUrl(path) {
  const base = String(PLANNUS_ONLINE_CONFIG.apiBase || "").replace(/\/+$/, "");
  return `${base}${path}`;
}
async function listOnlineObras() {
  try {
    const response = await fetch(baseUrl("/api/obras"));
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao listar obras online.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao listar obras.", { error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao listar obras online." };
  }
}
async function loadOnlineObra(obraId) {
  try {
    const response = await fetch(baseUrl(`/api/obras/${encodeURIComponent(obraId)}`));
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao carregar obra online.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao carregar obra.", { obraId, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao carregar obra online." };
  }
}
async function saveOnlineObra(obraId, state, revision) {
  try {
    const response = await fetch(baseUrl(`/api/obras/${encodeURIComponent(obraId)}/save`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, state }),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return { ok: false, status: response.status, conflito: response.status === 409 || data?.conflito === true, erro: data?.erro || "Falha ao salvar obra online.", data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao salvar obra.", { obraId, revision, error: String(error) });
    return { ok: false, status: 0, networkError: true, conflito: false, erro: "Erro de rede ao salvar obra online." };
  }
}
function createPlannusPersistence() {
  return {
    config: PLANNUS_ONLINE_CONFIG,
    getSyncSnapshot() {
      return { meta: readOnlineMeta(), statusText: readSyncStatus(), config: PLANNUS_ONLINE_CONFIG };
    },
    async connectOnline() {
      if (!PLANNUS_ONLINE_CONFIG.enabled) return { ok: false, erro: "Modo online desabilitado." };
      const result = await listOnlineObras();
      writeSyncStatus(result.ok ? "Conectado ao endpoint online." : `Falha de conexao: ${result.erro}`);
      return result;
    },
    async listOnlineObras() {
      logSync("Listando obras online.");
      return listOnlineObras();
    },
    async loadOnline(obraId = PLANNUS_ONLINE_CONFIG.defaultObraId) {
      if (!PLANNUS_ONLINE_CONFIG.enabled) return { ok: false, erro: "Modo online desabilitado." };
      const result = await loadOnlineObra(obraId);
      if (!result.ok) {
        writeSyncStatus(`Falha ao carregar online (${result.status || "rede"}): ${result.erro}`);
        return result;
      }
      const remoteState = resolveOnlineState(result.data);
      if (!remoteState) {
        const fail = { ok: false, status: result.status, erro: "Resposta online sem state." };
        writeSyncStatus(fail.erro);
        return fail;
      }
      const backupKey = backupBeforeOnlineLoad();
      saveState(remoteState);
      const meta = {
        obraId,
        revision: resolveOnlineRevision(result.data),
        updatedAt: resolveOnlineUpdatedAt(result.data),
        lastSyncAt: nowIso(),
        pendingOnlineSave: false,
        conflict: false,
      };
      writeOnlineMeta(meta);
      writeSyncStatus(`Obra ${obraId} carregada online.`);
      logRepository("Carga online aplicada.", { obraId, revision: meta.revision, backupKey });
      return { ok: true, state: remoteState, meta, backupKey, data: result.data };
    },
    async saveHybrid(state, obraId = PLANNUS_ONLINE_CONFIG.defaultObraId) {
      saveState(state);
      const previousMeta = readOnlineMeta();
      const revision = Number(previousMeta.revision || 0);
      if (!PLANNUS_ONLINE_CONFIG.enabled) {
        const metaDisabled = { ...previousMeta, obraId, lastSyncAt: nowIso(), pendingOnlineSave: true, conflict: false };
        writeOnlineMeta(metaDisabled);
        writeSyncStatus("Online desabilitado. Salvo local com pendencia online.");
        return { ok: false, localSaved: true, pendingOnlineSave: true, erro: "Modo online desabilitado." };
      }
      const result = await saveOnlineObra(obraId, state, revision);
      if (result.ok) {
        const data = result.data || {};
        const meta = {
          obraId,
          revision: Number(data.revision || revision),
          updatedAt: data.updated_at || null,
          lastSyncAt: nowIso(),
          pendingOnlineSave: false,
          conflict: false,
        };
        writeOnlineMeta(meta);
        writeSyncStatus(`Online salvo com sucesso. Revision ${meta.revision}.`);
        logSync("Save online concluido.", { obraId, revisionAnterior: revision, revisionNova: meta.revision });
        return { ok: true, localSaved: true, onlineSaved: true, meta, data };
      }
      if (result.conflito) {
        const meta = {
          ...previousMeta,
          obraId,
          lastSyncAt: nowIso(),
          pendingOnlineSave: true,
          conflict: true,
          revisionConflitoBanco: result.data?.revision_banco ?? null,
          revisionEnviada: result.data?.revision_enviada ?? revision,
        };
        writeOnlineMeta(meta);
        writeSyncStatus(`Conflito de revisao (${meta.revisionEnviada} -> banco ${meta.revisionConflitoBanco}).`);
        return { ok: false, localSaved: true, conflito: true, pendingOnlineSave: true, erro: result.erro, meta, data: result.data };
      }
      const meta = { ...previousMeta, obraId, lastSyncAt: nowIso(), pendingOnlineSave: true, conflict: false };
      writeOnlineMeta(meta);
      writeSyncStatus(`Falha no save online: ${result.erro}. Estado mantido localmente.`);
      return { ok: false, localSaved: true, pendingOnlineSave: true, erro: result.erro, status: result.status };
    },
  };
}


// FILE: src/services/import-export.js
function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `plannus-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCsv(filename, headers, rows) {
  const csv = [headers.join(";"), ...rows.map((row) => row.map((cell) => JSON.stringify(cell ?? "")).join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importStateFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(String(reader.result))); } catch (error) { reject(error); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}


// FILE: src/services/msp-import.js
function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

function toISO(value) {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (match) {
    let year = Number(match[3]);
    if (year < 100) {
      year += 2000;
    }
    return `${year}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
  }
  return null;
}

function parsePredToken(token) {
  const raw = String(token || "").trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(/^(\d+)\s*([A-Za-z]{2})?\s*([+-]\s*\d+)?/);
  if (!match) {
    return null;
  }
  const rawType = String(match[2] || "FS").toUpperCase();
  const relationMap = { TI: "FS", II: "SS", TT: "FF", IT: "SF", FS: "FS", SS: "SS", FF: "FF", SF: "SF" };
  return {
    predTaskId: Number(match[1]),
    type: relationMap[rawType] || "FS",
    lagDays: match[3] ? parseInt(match[3].replace(/\s+/g, ""), 10) || 0 : 0,
  };
}

function splitPreds(raw) {
  return String(raw || "").split(/[;,]/).map(parsePredToken).filter(Boolean);
}

function detectDelimiter(line) {
  if (line.includes("\t")) {
    return "\t";
  }
  return line.split(";").length >= line.split(",").length ? ";" : ",";
}

function parseTable(raw) {
  const lines = String(raw || "").replace(/^\ufeff/, "").split(/\r?\n/).filter((line) => String(line).trim());
  if (!lines.length) {
    return { headers: [], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const split = (line) => line.split(delimiter).map((cell) => String(cell || "").trim());
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

function mapColumns(headers) {
  const normalized = headers.map(norm);
  const findIndex = (variants) => variants.map(norm).map((variant) => normalized.indexOf(variant)).find((index) => index >= 0) ?? -1;
  return {
    id: findIndex(["id", "id da tarefa", "task id"]),
    level: findIndex(["nivel", "nÃ­vel", "level", "outline level", "outline"]),
    name: findIndex(["nome", "task name", "name", "nome da tarefa"]),
    start: findIndex(["inicio", "inÃ­cio", "start", "data de inicio", "data de inÃ­cio"]),
    finish: findIndex(["termino", "tÃ©rmino", "finish", "data de termino", "data de tÃ©rmino"]),
    predecessors: findIndex(["predecessoras", "predecessors", "pred", "predecessor"]),
    resources: findIndex(["nomes dos recursos", "resource names", "resources", "resource names"]),
    wbs: findIndex(["wbs", "eap"]),
  };
}

function parseResources(raw) {
  return String(raw || "")
    .split(/[;,/|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferLocationKind(name) {
  const value = norm(name);
  if (!value) {
    return "pavimento_tipo";
  }
  if (/\b(area comum|academia|spa|salao|sal[aÃ£]o|piscina|lazer|churrasqueira|play|gourmet|hall)\b/.test(value)) {
    return "area_comum";
  }
  if (/\b(terreo|t[eÃ©]rreo|subsolo|cobertura|barrilete|atico|Ã¡tico|rooftop)\b/.test(value)) {
    return "especial";
  }
  return "pavimento_tipo";
}

function dayDiff(startISO, endISO) {
  const start = Date.parse(`${startISO}T00:00:00Z`);
  const end = Date.parse(`${endISO}T00:00:00Z`);
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function importMspProject(rawText, options) {
  const table = parseTable(rawText);
  const columns = mapColumns(table.headers);
  const required = ["level", "name", "start", "finish"];
  const missing = required.filter((key) => columns[key] < 0);
  if (missing.length) {
    throw new Error(`Colunas obrigatorias ausentes para MSP: ${missing.join(", ")}`);
  }

  const obraId = options.obraId;
  const serviceLevel = Number(options.serviceLevel || 2);
  const locationLevel = Number(options.locationLevel || serviceLevel + 1);
  const importedRows = [];
  let currentService = null;
  let currentServiceWbs = null;

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex += 1) {
    const row = table.rows[rowIndex];
    const level = Number(row[columns.level]);
    const name = String(row[columns.name] || "").trim();
    if (!name || !Number.isFinite(level)) {
      continue;
    }
    const startISO = toISO(row[columns.start]);
    const finishISO = toISO(row[columns.finish]);
    if (!startISO || !finishISO) {
      continue;
    }
    const mspId = columns.id >= 0 ? Number(row[columns.id]) : rowIndex + 1;
    const resources = columns.resources >= 0 ? parseResources(row[columns.resources]) : [];
    const predRaw = columns.predecessors >= 0 ? String(row[columns.predecessors] || "") : "";
    const wbs = columns.wbs >= 0 ? String(row[columns.wbs] || "") : "";

    if (level === serviceLevel) {
      currentService = name;
      currentServiceWbs = wbs;
      continue;
    }

    if (level >= locationLevel && currentService) {
      importedRows.push({
        mspId,
        level,
        serviceName: currentService,
        serviceWbs: currentServiceWbs,
        taskName: name,
        locationName: name,
        startISO,
        finishISO,
        resources,
        predecessors: splitPreds(predRaw),
      });
    }
  }

  if (!importedRows.length) {
    throw new Error("Nenhuma task importavel encontrada com os niveis informados.");
  }

  const serviceMap = new Map();
  const locationMap = new Map();
  const teamMap = new Map();
  const eapMap = new Map();
  const tasks = [];
  const quantities = [];

  importedRows.forEach((row, index) => {
    const serviceKey = slug(row.serviceName);
    const locationKey = slug(row.locationName);
    const eapId = `eap-import-${serviceKey}`;
    if (!eapMap.has(serviceKey)) {
      eapMap.set(serviceKey, {
        id: eapId,
        obraId,
        codigoEAP: row.serviceWbs || `IMP.${eapMap.size + 1}`,
        nome: row.serviceName,
        nivel: serviceLevel,
        parentId: null,
        ordem: eapMap.size + 1,
        ativo: true,
      });
    }
    if (!serviceMap.has(serviceKey)) {
      serviceMap.set(serviceKey, {
        id: `srv-import-${serviceKey}`,
        obraId,
        codigoServico: `IMP-${String(serviceMap.size + 1).padStart(3, "0")}`,
        nome: row.serviceName,
        unidadeMedicao: "vb",
        categoria: "Importado MSP",
        disciplina: "Planejamento",
        permiteParalelo: true,
        exigeEquipe: false,
        exigeQuantidade: false,
        exigeProdutividade: false,
        corVisual: ["#0f4c5c", "#1f7a8c", "#2a9d8f", "#e09f3e", "#c44536"][serviceMap.size % 5],
        ordem: serviceMap.size + 1,
        ativo: true,
      });
    }
    if (!locationMap.has(locationKey)) {
      locationMap.set(locationKey, {
        id: `loc-import-${locationKey}`,
        obraId,
        tipoLocal: inferLocationKind(row.locationName),
        nome: row.locationName,
        codigo: `LOC-${String(locationMap.size + 1).padStart(3, "0")}`,
        ordem: locationMap.size + 1,
        parentId: null,
        torre: null,
        bloco: null,
        pavimento: null,
        unidade: null,
        area: null,
        metadados: { origem: "MSP", imported: true },
      });
    }
    const service = serviceMap.get(serviceKey);
    const location = locationMap.get(locationKey);
    const taskId = `task:import:${obraId}:${row.mspId}`;
    const primaryTeamName = row.resources[0] || `Equipe ${service.nome}`;
    const teamKey = slug(primaryTeamName);
    if (!teamMap.has(teamKey)) {
      teamMap.set(teamKey, {
        id: `team-import-${teamKey}`,
        obraId,
        nome: primaryTeamName,
        codigo: `EQ-IMP-${String(teamMap.size + 1).padStart(3, "0")}`,
        tipoEquipe: "MSP Importada",
        serviceIdsPermitidos: [service.id],
        produtividadeBase: 1,
        unidadeProdutividade: "task/dia",
        custoDia: 0,
        capacidadeSimultanea: 1,
        ativa: true,
        calendarioId: options.calendarioPadraoId,
      });
    } else if (!teamMap.get(teamKey).serviceIdsPermitidos.includes(service.id)) {
      teamMap.get(teamKey).serviceIdsPermitidos.push(service.id);
    }
    const duration = dayDiff(row.startISO, row.finishISO);
    tasks.push({
      id: taskId,
      obraId,
      serviceId: service.id,
      locationId: location.id,
      equipeId: teamMap.get(teamKey).id,
      eapId,
      quantidade: 1,
      produtividadePlanejada: 1 / duration,
      duracaoPlanejadaDias: duration,
      baselineStartISO: null,
      baselineEndISO: null,
      plannedStartISO: row.startISO,
      plannedEndISO: row.finishISO,
      actualStartISO: null,
      actualEndISO: null,
      percentComplete: 0,
      status: "NAO_INICIADO",
      predecessorTaskIds: [],
      successorTaskIds: [],
      isCritical: false,
      sourceRule: "MSP_IMPORT",
      bloqueios: [],
      observacoes: `Importado do MSP Project. Nome original: ${row.taskName}`,
      inconsistente: false,
      externalReference: { mspId: row.mspId, resources: row.resources, predecessors: row.predecessors },
    });
    quantities.push({
      id: `qty-import-${index + 1}`,
      obraId,
      serviceId: service.id,
      locationId: location.id,
      quantidade: 1,
      unidade: "vb",
      fatorComplexidade: 1,
      observacoes: "Quantidade sintetica criada a partir da importacao MSP.",
    });
  });

  const taskByMspId = new Map(tasks.map((task) => [task.externalReference.mspId, task]));
  importedRows.forEach((row) => {
    const task = taskByMspId.get(row.mspId);
    row.predecessors.forEach((pred) => {
      const predecessorTask = taskByMspId.get(pred.predTaskId);
      if (predecessorTask) {
        task.predecessorTaskIds.push(predecessorTask.id);
        predecessorTask.successorTaskIds.push(task.id);
      }
    });
  });

  const maxEnd = tasks.map((task) => task.plannedEndISO).sort().at(-1);
  tasks.forEach((task) => {
    task.isCritical = task.plannedEndISO === maxEnd || task.successorTaskIds.length === 0;
  });

  return {
    importedState: {
      eaps: [...eapMap.values()],
      services: [...serviceMap.values()],
      locations: [...locationMap.values()],
      teams: [...teamMap.values()],
      quantities,
      tasks,
      dependencies: [],
      teamRules: [],
    },
    summary: {
      taskCount: tasks.length,
      serviceCount: serviceMap.size,
      locationCount: locationMap.size,
      teamCount: teamMap.size,
      importedFinish: maxEnd,
    },
  };
}


// FILE: src/app/store.js

function audit(module, action, message, context = {}, level = "INFO") {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    obraId: context.obraId ?? "obra-1",
    timestamp: new Date().toISOString(),
    nivel: level,
    modulo: module,
    acao: action,
    mensagem: message,
    contexto: context,
  };
}

function appendNotice(state, type, text) {
  return { ...state.ui, notices: [{ id: `notice-${Date.now()}`, type, text }, ...state.ui.notices].slice(0, 6) };
}

function replaceEntity(list, entity) {
  const index = list.findIndex((item) => item.id === entity.id);
  if (index >= 0) { const copy = list.slice(); copy[index] = entity; return copy; }
  return [...list, entity];
}

function reduce(state, action) {
  switch (action.type) {
    case "INIT": return loadState();
    case "SET_VIEW": return { ...state, ui: { ...state.ui, activeView: action.view } };
    case "SET_FILTER": return { ...state, ui: { ...state.ui, filters: { ...state.ui.filters, [action.key]: action.value } } };
    case "UPSERT_ENTITY": {
      if (!ENTITY_KEYS.includes(action.entityKey)) return state;
      const next = structuredClone(state);
      next.entities[action.entityKey] = replaceEntity(next.entities[action.entityKey], action.payload);
      next.entities.logs.push(audit(TECHNICAL_MODULES.UI, "UPSERT_ENTITY", `Registro salvo em ${action.entityKey}.`, { obraId: state.obra.id, entityKey: action.entityKey, id: action.payload.id }));
      next.ui = appendNotice(next, "success", `Registro ${action.payload.id} salvo em ${action.entityKey}.`);
      return next;
    }
    case "DELETE_ENTITY": {
      const next = structuredClone(state);
      next.entities[action.entityKey] = next.entities[action.entityKey].filter((item) => item.id !== action.id);
      next.entities.logs.push(audit(TECHNICAL_MODULES.UI, "DELETE_ENTITY", `Registro removido de ${action.entityKey}.`, { obraId: state.obra.id, entityKey: action.entityKey, id: action.id }, "WARNING"));
      next.ui = appendNotice(next, "warning", `Registro ${action.id} removido.`);
      return next;
    }
    case "RUN_ENGINE": {
      const next = structuredClone(state);
      const engine = runPlanningEngine(next);
      next.entities.tasks = engine.nextTasks;
      next.entities.logs.push(...engine.logs);
      next.planning.generatedAt = new Date().toISOString();
      next.planning.lastEngineResult = engine.result;
      next.ui = appendNotice(next, engine.result.valid ? "success" : "error", engine.result.summary);
      return next;
    }
    case "CREATE_BASELINE": {
      const next = structuredClone(state);
      const validation = validateState(state);
      if (!validation.valid || next.entities.tasks.length === 0) {
        next.entities.logs.push(audit(TECHNICAL_MODULES.BASELINE, "CREATE_BLOCKED", "Baseline bloqueada por inconsistencias ou ausencia de tasks.", { obraId: state.obra.id, issues: validation.issues }, "ERROR"));
        next.ui = appendNotice(next, "error", "Baseline bloqueada: execute um plano valido antes de congelar.");
        return next;
      }
      next.entities.baselines = next.entities.baselines.map((baseline) => ({ ...baseline, ativa: false }));
      const baseline = createBaselineSnapshot(next, action.name, action.createdBy);
      next.entities.baselines.push(baseline);
      next.baseline.activeBaselineId = baseline.id;
      next.entities.logs.push(audit(TECHNICAL_MODULES.BASELINE, "CREATE", "Baseline congelada.", { obraId: state.obra.id, baselineId: baseline.id }));
      next.ui = appendNotice(next, "success", `Baseline ${baseline.nome} criada.`);
      return next;
    }
    case "RECORD_MEASUREMENT": {
      const next = structuredClone(state);
      if (!next.entities.tasks.find((item) => item.id === action.payload.taskId)) {
        next.entities.logs.push(audit(TECHNICAL_MODULES.TRACKING, "MEASUREMENT_BLOCKED", "Medicao rejeitada por task inexistente.", { obraId: state.obra.id, taskId: action.payload.taskId }, "ERROR"));
        next.ui = appendNotice(next, "error", "Medicao rejeitada: task inexistente.");
        return next;
      }
      next.entities.measurements = replaceEntity(next.entities.measurements, action.payload);
      next.entities.logs.push(audit(TECHNICAL_MODULES.TRACKING, "MEASUREMENT_SAVE", "Medicao registrada.", { obraId: state.obra.id, measurementId: action.payload.id }));
      next.ui = appendNotice(next, "success", `Medicao ${action.payload.id} registrada.`);
      return reduce(next, { type: "RUN_ENGINE" });
    }
    case "IMPORT_MSP": {
      const next = structuredClone(state);
      const imported = importMspProject(action.rawText, {
        obraId: next.obra.id,
        calendarioPadraoId: next.obra.calendarioPadraoId,
        serviceLevel: action.serviceLevel,
        locationLevel: action.locationLevel,
      });
      next.entities.eaps = imported.importedState.eaps;
      next.entities.services = imported.importedState.services;
      next.entities.locations = imported.importedState.locations;
      next.entities.teams = imported.importedState.teams;
      next.entities.quantities = imported.importedState.quantities;
      next.entities.tasks = imported.importedState.tasks;
      next.entities.dependencies = imported.importedState.dependencies;
      next.entities.teamRules = imported.importedState.teamRules;
      next.entities.measurements = [];
      next.entities.baselines = [];
      next.baseline.activeBaselineId = null;
      next.planning.generatedAt = new Date().toISOString();
      next.planning.currentScenario = "MSP Import";
      next.planning.lastEngineResult = {
        valid: true,
        summary: `MSP importado com ${imported.summary.taskCount} tasks, ${imported.summary.serviceCount} servicos e ${imported.summary.teamCount} equipes.`,
        metrics: imported.summary,
        preview: imported.importedState.tasks.slice(0, 8).map((task) => ({
          nome: task.id,
          inicio: task.plannedStartISO,
          termino: task.plannedEndISO,
          status: task.status,
        })),
      };
      next.entities.logs.push(audit(TECHNICAL_MODULES.IMPORT, "IMPORT_MSP", "Importacao MSP concluida.", { obraId: state.obra.id, summary: imported.summary }));
      next.ui = appendNotice(next, "success", `MSP importado: ${imported.summary.taskCount} tasks carregadas.`);
      return next;
    }
    case "IMPORT_STATE": return action.payload;
    case "RESET_STATE": return resetState();
    case "DISMISS_NOTICE": return { ...state, ui: { ...state.ui, notices: state.ui.notices.filter((notice) => notice.id !== action.id) } };
    default: return state;
  }
}

function createStore() {
  let state = reduce({}, { type: "INIT" });
  let listeners = [];
  function refresh() {
    state.dashboard = { kpis: calculateKpis(state) };
    state.ui = { ...DEFAULT_UI, ...state.ui };
    saveState(state);
    listeners.forEach((listener) => listener(state));
  }
  function dispatch(action) { state = reduce(state, action); refresh(); }
  function subscribe(listener) { listeners.push(listener); return () => { listeners = listeners.filter((item) => item !== listener); }; }
  refresh();
  return { getState: () => state, dispatch, subscribe };
}


// FILE: src/ui/app.js

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatNumber(value, digits = 2) {
  return Number(value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function findService(state, serviceId) {
  return state.entities.services.find((item) => item.id === serviceId) ?? null;
}

function findLocation(state, locationId) {
  return state.entities.locations.find((item) => item.id === locationId) ?? null;
}

function findTeam(state, teamId) {
  return state.entities.teams.find((item) => item.id === teamId) ?? null;
}

function taskLabel(state, task) {
  const service = findService(state, task.serviceId);
  const location = findLocation(state, task.locationId);
  return `${service?.nome ?? "Servico"} | ${location?.nome ?? "Local"}`;
}

function statusLabel(status) {
  return String(status ?? "").replaceAll("_", " ");
}

function locationDisplayName(state, locationId) {
  const location = findLocation(state, locationId);
  const raw = String(location?.nome ?? locationId ?? "Local").trim();
  if (/^PAV\s+/i.test(raw)) return raw.toUpperCase();
  if (/^\d+$/.test(raw)) return `PAV ${raw}`;
  return raw.toUpperCase();
}

function calendarForState(state, task = null) {
  const calendarId = task?.calendarId || findTeam(state, task?.equipeId)?.calendarioId || state.obra.calendarioPadraoId;
  return state.entities.calendars.find((item) => item.id === calendarId) ?? state.entities.calendars[0];
}

function buildWorkingAxis(state, referenceDate, horizonDays) {
  const calendar = calendarForState(state);
  const days = [];
  let cursor = referenceDate;
  let guard = 0;
  while (days.length <= horizonDays && guard < 365) {
    if (isWorkingDay(calendar, cursor)) {
      days.push({
        iso: cursor,
        label: new Date(`${cursor}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "2-digit" }),
        dow: new Date(`${cursor}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" }).toUpperCase(),
      });
    }
    cursor = addIsoDays(cursor, 1);
    guard += 1;
  }
  return days;
}

function locationColor(index) {
  return ["#1d4ed8", "#0f766e", "#b45309", "#be123c", "#7c3aed", "#0891b2"][index % 6];
}

function locationColorById(state, locationId) {
  const visibleLocations = state.entities.locations.filter((item) => item.tipoLocal !== "obra");
  const index = visibleLocations.findIndex((item) => item.id === locationId);
  return locationColor(Math.max(0, index));
}

function periodDaysFromPreset(preset) {
  if (preset === "2") return 2;
  if (preset === "7") return 7;
  if (preset === "14") return 14;
  if (preset === "30") return 30;
  return 0;
}

function taskDiscipline(state, task) {
  return findService(state, task.serviceId)?.disciplina ?? "Outros";
}

function taskDeviation(task, referenceDate) {
  if (task.status === STATUS.CONCLUIDO && task.actualEndISO && task.plannedEndISO) {
    const delta = diffDays(task.plannedEndISO, task.actualEndISO);
    return delta;
  }
  if (task.plannedEndISO) {
    return Math.max(0, diffDays(task.plannedEndISO, referenceDate));
  }
  return 0;
}

function taskInconsistencyReason(task) {
  if (task.inconsistente && task.bloqueios?.length) return task.bloqueios[0];
  if (task.inconsistente) return "Inconsistencia estrutural";
  if (task.bloqueios?.length) return task.bloqueios[0];
  return "";
}

function startsWithinTwoDays(task, referenceDate) {
  if (!task.plannedStartISO || task.actualStartISO || task.status === STATUS.CONCLUIDO || task.status === STATUS.BLOQUEADO || task.status === STATUS.INCONSISTENTE) {
    return false;
  }
  const delta = diffDays(referenceDate, task.plannedStartISO);
  return delta >= 0 && delta <= 2;
}

function taskCellState(task, dayISO) {
  if (task.status === STATUS.INCONSISTENTE) return "inconsistent";
  if (task.status === STATUS.BLOQUEADO) return "blocked";
  const inPlannedWindow = task.plannedStartISO && task.plannedEndISO && dayISO >= task.plannedStartISO && dayISO <= task.plannedEndISO;
  const inActualWindow = task.actualStartISO && dayISO >= task.actualStartISO && dayISO <= (task.actualEndISO || dayISO);
  if (task.actualEndISO && dayISO > task.actualEndISO) return "done";
  if (task.actualEndISO && dayISO >= task.actualStartISO && dayISO <= task.actualEndISO) return "done";
  if (task.percentComplete > 0 && inPlannedWindow) return task.status === STATUS.ATRASADO ? "partial-delay" : "partial";
  if (inPlannedWindow && task.status === STATUS.ATRASADO) return "delay";
  if (inPlannedWindow) return "planned";
  if (inActualWindow) return "partial";
  return "none";
}

function visibleAcompanhamentoTasks(state) {
  const referenceDate = state.tracking.referenceDate;
  const filters = state.ui.filters;
  return state.entities.tasks.filter((task) => {
    const service = findService(state, task.serviceId);
    const location = findLocation(state, task.locationId);
    const team = findTeam(state, task.equipeId);
    const label = `${taskLabel(state, task)} ${team?.nome ?? ""} ${task.observacoes ?? ""}`.toLowerCase();
    if (filters.search && !label.includes(filters.search.toLowerCase())) return false;
    if (filters.status !== "ALL" && task.status !== filters.status) return false;
    if (filters.serviceId !== "ALL" && task.serviceId !== filters.serviceId) return false;
    if (filters.locationId !== "ALL" && task.locationId !== filters.locationId) return false;
    if (filters.teamId !== "ALL" && (filters.teamId === "NONE" ? Boolean(task.equipeId) : task.equipeId !== filters.teamId)) return false;
    if (filters.discipline !== "ALL" && (service?.disciplina ?? "") !== filters.discipline) return false;
    if (filters.criticality === "critical" && !task.isCritical) return false;
    if (filters.criticality === "non_critical" && task.isCritical) return false;
    const deviation = taskDeviation(task, referenceDate);
    if (filters.deviation === "late" && deviation <= 0) return false;
    if (filters.deviation === "starting_soon" && !startsWithinTwoDays(task, referenceDate)) return false;
    if (filters.deviation === "ahead" && task.actualEndISO && task.plannedEndISO && diffDays(task.plannedEndISO, task.actualEndISO) >= 0) return false;
    if (filters.deviation === "no_update" && (task.percentComplete > 0 || task.actualStartISO)) return false;
    if (filters.inconsistency === "ALL") return true;
    return taskInconsistencyReason(task).toLowerCase().includes(filters.inconsistency.toLowerCase());
  }).sort((a, b) => a.plannedStartISO.localeCompare(b.plannedStartISO));
}

function acompanhamentoKpis(state, tasks) {
  const referenceDate = state.tracking.referenceDate;
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === STATUS.CONCLUIDO).length;
  const inProgress = tasks.filter((task) => task.status === STATUS.EM_ANDAMENTO).length;
  const delayed = tasks.filter((task) => task.status === STATUS.ATRASADO).length;
  const startingSoon = tasks.filter((task) => startsWithinTwoDays(task, referenceDate)).length;
  const blocked = tasks.filter((task) => task.status === STATUS.BLOQUEADO).length;
  const inconsistent = tasks.filter((task) => task.status === STATUS.INCONSISTENTE).length;
  const visibleQuantity = tasks.reduce((sum, task) => sum + (task.quantidade || 0), 0);
  const executedQuantity = tasks.reduce((sum, task) => sum + ((task.quantidade || 0) * ((task.percentComplete || 0) / 100)), 0);
  const plannedQuantity = tasks.reduce((sum, task) => sum + (task.plannedEndISO && task.plannedEndISO <= referenceDate ? (task.quantidade || 0) : 0), 0);
  const ppcBase = tasks.filter((task) => task.plannedEndISO && task.plannedEndISO <= referenceDate).length;
  const ppcDone = tasks.filter((task) => task.status === STATUS.CONCLUIDO && task.actualEndISO && task.actualEndISO <= task.plannedEndISO).length;
  return {
    total,
    completed,
    inProgress,
    delayed,
    startingSoon,
    blocked,
    inconsistent,
    physicalReal: visibleQuantity ? (executedQuantity / visibleQuantity) * 100 : 0,
    physicalPlanned: visibleQuantity ? (plannedQuantity / visibleQuantity) * 100 : 0,
    physicalDeviation: visibleQuantity ? ((executedQuantity - plannedQuantity) / visibleQuantity) * 100 : 0,
    ppc: ppcBase ? (ppcDone / ppcBase) * 100 : 0,
    activeFronts: new Set(tasks.filter((task) => task.status === STATUS.EM_ANDAMENTO).map((task) => task.locationId)).size,
    activeTeams: new Set(tasks.filter((task) => task.status === STATUS.EM_ANDAMENTO).map((task) => task.equipeId).filter(Boolean)).size,
  };
}

function makePill(status) {
  return `<span class="pill status-${status}">${status.replaceAll("_", " ")}</span>`;
}

function table(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function renderSidebar(activeView) {
  const groups = [...new Set(NAV_ITEMS.map((item) => item.group))];
  return `
    <aside class="sidebar">
      <div class="brand">
        <h1>PLANNUS</h1>
        <p>Motor profissional de planejamento, producao e controle de obras.</p>
      </div>
      ${groups.map((group) => `
        <div class="nav-group">
          <h2>${group}</h2>
          ${NAV_ITEMS.filter((item) => item.group === group).map((item) => `
            <button class="nav-btn ${item.key === activeView ? "active" : ""}" data-action="change-view" data-view="${item.key}">
              ${item.label}
            </button>
          `).join("")}
        </div>
      `).join("")}
    </aside>
  `;
}

function renderNotices(items) {
  return items.map((notice) => `
    <div class="alert ${notice.type}">
      ${escapeHtml(notice.text)}
      <button class="btn-secondary" data-action="dismiss-notice" data-id="${notice.id}" style="float:right">Fechar</button>
    </div>
  `).join("");
}

function renderDashboard(state) {
  const kpi = state.dashboard.kpis;
  const engine = state.planning.lastEngineResult;
  const syncSnapshot = persistence.getSyncSnapshot();
  const syncMeta = syncSnapshot.meta || {};
  const syncStatus = syncSnapshot.statusText || "Sem sincronizacao online nesta sessao.";
  return `
    <div class="grid cards">
      <section class="card"><span class="muted">Concluido fisico</span><strong>${formatNumber(kpi.percentualConcluidoFisico)}%</strong><span class="muted">Executado / total</span></section>
      <section class="card"><span class="muted">Planejado</span><strong>${formatNumber(kpi.percentualPlanejado)}%</strong><span class="muted">Planejado ate a data</span></section>
      <section class="card"><span class="muted">Desvio real x plano</span><strong>${formatNumber(kpi.desvioPlanejadoReal)} p.p.</strong><span class="muted">Realizado - planejado</span></section>
      <section class="card"><span class="muted">PPC</span><strong>${formatNumber(kpi.ppc)}%</strong><span class="muted">Concluidas no prazo</span></section>
      <section class="card"><span class="muted">Atrasadas</span><strong>${kpi.tarefasAtrasadas}</strong><span class="muted">Tasks fora do plano</span></section>
      <section class="card"><span class="muted">Prazo projetado</span><strong>${formatDate(kpi.prazoProjetado)}</strong><span class="muted">Termino previsto atual</span></section>
    </div>
    <div class="grid two" style="margin-top:18px">
      <section class="panel">
        <h3>Leitura gerencial</h3>
        <div class="sticky-note">
          <strong>Estado oficial</strong>
          <p>${escapeHtml(engine?.summary ?? "Motor ainda nao executado nesta sessao.")}</p>
          <p class="muted">Cenario: ${escapeHtml(state.planning.currentScenario || "Base")} | Baselines: ${state.entities.baselines.length}</p>
        </div>
      </section>
      <section class="panel">
        <h3>Alertas tecnicos</h3>
        <ul>
          ${state.entities.tasks.filter((task) => [STATUS.ATRASADO, STATUS.BLOQUEADO, STATUS.INCONSISTENTE].includes(task.status)).slice(0, 8).map((task) => `<li>${escapeHtml(task.id)} - ${task.status}</li>`).join("") || "<li>Nenhum alerta critico registrado.</li>"}
        </ul>
      </section>
    </div>
    <section class="panel" style="margin-top:18px">
      <h3>Online Sync</h3>
      <p class="muted">${escapeHtml(syncStatus)}</p>
      <p class="muted">obraId=${escapeHtml(syncMeta.obraId || PLANNUS_ONLINE_CONFIG.defaultObraId)} | revision=${Number(syncMeta.revision || 0)} | pending=${String(Boolean(syncMeta.pendingOnlineSave))} | conflict=${String(Boolean(syncMeta.conflict))}</p>
      <div class="toolbar"><button class="btn-secondary" data-action="open-online-config">Abrir painel online</button></div>
    </section>
  `;
}

function renderObra(state) {
  const obra = state.obra;
  return `
    <section class="panel">
      <h3>Cadastro da obra</h3>
      <div class="grid three" style="margin-top:14px">
        <div class="field"><label>Nome</label><input value="${escapeHtml(obra.nome)}" data-form="obra.nome" /></div>
        <div class="field"><label>Codigo</label><input value="${escapeHtml(obra.codigo)}" data-form="obra.codigo" /></div>
        <div class="field"><label>Cliente</label><input value="${escapeHtml(obra.cliente)}" data-form="obra.cliente" /></div>
        <div class="field"><label>Tipo</label><input value="${escapeHtml(obra.tipoObra)}" data-form="obra.tipoObra" /></div>
        <div class="field"><label>Cidade</label><input value="${escapeHtml(obra.cidade)}" data-form="obra.cidade" /></div>
        <div class="field"><label>Inicio oficial</label><input type="date" value="${obra.dataInicioOficial}" data-form="obra.dataInicioOficial" /></div>
        <div class="field"><label>Termino meta</label><input type="date" value="${obra.dataTerminoMeta}" data-form="obra.dataTerminoMeta" /></div>
        <div class="field"><label>Status</label><input value="${escapeHtml(obra.status)}" data-form="obra.status" /></div>
        <div class="field"><label>Versao</label><input type="number" value="${obra.versaoEstado}" data-form="obra.versaoEstado" /></div>
      </div>
      <div class="toolbar" style="margin-top:14px"><button class="btn" data-action="save-obra">Salvar obra</button></div>
    </section>
  `;
}

function renderEntityPanel(title, rows, columns, seedKind) {
  return `
    <section class="panel">
      <div class="section-title">
        <h3>${title}</h3>
        <button class="btn-secondary" data-action="seed-entity" data-kind="${seedKind}">Novo registro guiado</button>
      </div>
      ${table([...columns, "Acoes"], rows.length ? rows : [`<tr><td colspan="${columns.length + 1}">Nenhum registro.</td></tr>`])}
    </section>
  `;
}

function renderSimpleEntity(state, entityKey, title, columns, rowBuilder, seedKind) {
  const rows = state.entities[entityKey].map((item) => `<tr>${rowBuilder(item)}<td><button class="btn-secondary" data-action="delete-entity" data-entity="${entityKey}" data-id="${item.id}">Excluir</button></td></tr>`);
  return renderEntityPanel(title, rows, columns, seedKind);
}

function renderPlanning(state) {
  const preview = state.planning.lastEngineResult?.preview ?? [];
  const summary = state.planning.lastEngineResult?.metrics ?? {};
  const selectedServiceId = state.ui.filters.serviceId !== "ALL" ? state.ui.filters.serviceId : state.entities.services[0]?.id;
  const selectedLocationId = state.ui.filters.locationId !== "ALL" ? state.ui.filters.locationId : state.entities.locations.find((item) => item.tipoLocal !== "obra")?.id;
  const selectedService = findService(state, selectedServiceId);
  const selectedLocation = findLocation(state, selectedLocationId);
  const selectedRule = state.entities.teamRules.find((item) => item.serviceId === selectedServiceId);
  const selectedDependency = state.entities.dependencies.find((item) => item.successorServiceId === selectedServiceId) ?? state.entities.dependencies[0];
  const selectedQuantity = state.entities.quantities.find((item) => item.serviceId === selectedServiceId && item.locationId === selectedLocationId);
  const selectedTeam = state.entities.teams.find((item) => item.serviceIdsPermitidos.includes(selectedServiceId));
  return `
    <div class="grid two">
      <section class="panel">
        <h3>Motor e importacao</h3>
        <p class="muted">Fluxo oficial: validar, gerar, sequenciar, aplicar calendario, consolidar indicadores e registrar auditoria. Para MSP, importar primeiro e depois ajustar equipes, locais e baseline.</p>
        <div class="toolbar">
          <button class="btn" data-action="run-engine">Executar motor</button>
          <button class="btn-secondary" data-action="create-baseline">Criar baseline</button>
          <button class="btn-secondary" data-action="export-json">Exportar JSON</button>
        </div>
        <div class="import-box">
          <div class="field">
            <label>Arquivo MSP exportado em CSV/TSV</label>
            <input type="file" id="msp-file" accept=".csv,.tsv,.txt" />
          </div>
          <div class="grid two">
            <div class="field"><label>Nivel do servico</label><input id="msp-service-level" type="number" min="1" value="2" /></div>
            <div class="field"><label>Nivel do local</label><input id="msp-location-level" type="number" min="2" value="3" /></div>
          </div>
          <div class="field">
            <label>Ou cole a exportacao do Project</label>
            <textarea id="msp-text" placeholder="Cole aqui o CSV/TSV exportado do MS Project"></textarea>
          </div>
          <div class="toolbar">
            <button class="btn-secondary" data-action="import-msp">Importar MSP</button>
            <span class="muted">Recursos do MSP sao convertidos em equipes iniciais.</span>
          </div>
        </div>
      </section>
      <section class="panel">
        <h3>Configuracao tecnica</h3>
        <div class="grid two">
          <div class="field">
            <label>Servico</label>
            <select data-filter="serviceId">${state.entities.services.map((service) => `<option value="${service.id}" ${service.id === selectedServiceId ? "selected" : ""}>${escapeHtml(service.nome)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label>Pavimento / Local</label>
            <select data-filter="locationId">${state.entities.locations.filter((item) => item.tipoLocal !== "obra").map((location) => `<option value="${location.id}" ${location.id === selectedLocationId ? "selected" : ""}>${escapeHtml(location.nome)}</option>`).join("")}</select>
          </div>
        </div>
        <div class="grid two" style="margin-top:12px">
          <div class="sticky-note">
            <strong>Predecessora do servico</strong>
            <div class="field" style="margin-top:10px">
              <label>Servico predecessor</label>
              <select id="cfg-predecessor-service">${state.entities.services.map((service) => `<option value="${service.id}" ${service.id === selectedDependency?.predecessorServiceId ? "selected" : ""}>${escapeHtml(service.nome)}</option>`).join("")}</select>
            </div>
            <div class="grid two">
              <div class="field"><label>Tipo</label><select id="cfg-predecessor-type">${["FS","SS","FF","SF"].map((type) => `<option value="${type}" ${type === selectedDependency?.tipoLigacao ? "selected" : ""}>${type}</option>`).join("")}</select></div>
              <div class="field"><label>Lag (dias)</label><input id="cfg-predecessor-lag" type="number" value="${selectedDependency?.lagDias ?? 0}" /></div>
            </div>
            <button class="btn-secondary" data-action="save-predecessor">Salvar predecessora</button>
          </div>
          <div class="sticky-note">
            <strong>Tempo e equipes</strong>
            <div class="grid two" style="margin-top:10px">
              <div class="field"><label>Defasagem inicial</label><input id="cfg-team-lag" type="number" value="${selectedRule?.defasagemInicial ?? 0}" /></div>
              <div class="field"><label>Numero de equipes</label><input id="cfg-team-count" type="number" min="1" value="${selectedRule?.numeroEquipes ?? 1}" /></div>
              <div class="field"><label>Produtividade base</label><input id="cfg-team-productivity" type="number" min="0" step="0.01" value="${selectedTeam?.produtividadeBase ?? 0}" /></div>
              <div class="field"><label>Duracao do pavimento</label><input id="cfg-task-duration" type="number" min="1" value="${state.entities.tasks.find((task) => task.serviceId === selectedServiceId && task.locationId === selectedLocationId)?.duracaoPlanejadaDias ?? 1}" /></div>
            </div>
            <button class="btn-secondary" data-action="save-config">Salvar configuracoes</button>
          </div>
        </div>
        <div class="sticky-note" style="margin-top:12px">
          <strong>Escopo selecionado</strong>
          <p>Servico: ${escapeHtml(selectedService?.nome ?? "-")} | Pavimento/Local: ${escapeHtml(selectedLocation?.nome ?? "-")} | Quantidade: ${formatNumber(selectedQuantity?.quantidade ?? 0)} ${escapeHtml(selectedQuantity?.unidade ?? "")}</p>
        </div>
      </section>
    </div>
    <div class="grid two" style="margin-top:18px">
      <section class="panel">
        <h3>Resumo do processamento</h3>
        <div class="metric-strip">
          <div class="metric-box"><span>Tasks</span><strong>${summary.taskCount ?? state.entities.tasks.length}</strong></div>
          <div class="metric-box"><span>Servicos</span><strong>${summary.serviceCount ?? state.entities.services.length}</strong></div>
          <div class="metric-box"><span>Locais</span><strong>${summary.locationCount ?? state.entities.locations.length}</strong></div>
          <div class="metric-box"><span>Equipes</span><strong>${summary.teamCount ?? state.entities.teams.length}</strong></div>
        </div>
        ${table(["Frente", "Inicio", "Termino", "Status"], preview.length ? preview.map((item) => `<tr><td>${escapeHtml(item.nome)}</td><td>${escapeHtml(item.inicio)}</td><td>${escapeHtml(item.termino)}</td><td>${makePill(item.status)}</td></tr>`) : ['<tr><td colspan="4">Sem preview disponivel.</td></tr>'])}
      </section>
      <section class="panel">
        <h3>Selecao rapida</h3>
        <div class="selection-chips">
          ${state.entities.services.map((service) => `<button class="selector-chip ${service.id === selectedServiceId ? "active" : ""}" data-action="pick-service" data-id="${service.id}">${escapeHtml(service.nome)}</button>`).join("")}
        </div>
        <div class="selection-chips" style="margin-top:12px">
          ${state.entities.locations.filter((item) => item.tipoLocal !== "obra").map((location, index) => `<button class="selector-chip ${location.id === selectedLocationId ? "active" : ""}" data-action="pick-location" data-id="${location.id}" style="border-color:${locationColor(index)}33;color:${locationColor(index)}">${escapeHtml(location.nome)}</button>`).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderBaseline(state) {
  return `
    <section class="panel">
      <h3>Baseline</h3>
      <p class="muted">A baseline e sempre um snapshot travado do plano aprovado.</p>
      ${table(["Nome", "Criada", "Por", "Hash", "Ativa"], state.entities.baselines.length ? state.entities.baselines.map((baseline) => `
        <tr>
          <td>${escapeHtml(baseline.nome)}</td>
          <td>${formatDate(baseline.dataCriacao.slice(0, 10))}</td>
          <td>${escapeHtml(baseline.criadoPor)}</td>
          <td class="mono">${baseline.hashIntegridade}</td>
          <td>${baseline.ativa ? "Sim" : "Nao"}</td>
        </tr>
      `) : ['<tr><td colspan="5">Nenhuma baseline criada.</td></tr>'])}
    </section>
  `;
}

function renderTracking(state) {
  const tasks = visibleAcompanhamentoTasks(state);
  const kpis = acompanhamentoKpis(state, tasks);
  const preset = state.ui.filters.periodPreset;
  const horizon = periodDaysFromPreset(preset) || 7;
  const ref = state.tracking.referenceDate;
  const periodDays = buildWorkingAxis(state, ref, horizon);
  const selectedTask = state.entities.tasks.find((task) => task.id === state.ui.selectedTaskId) ?? tasks[0] ?? null;
  const selectedService = selectedTask ? findService(state, selectedTask.serviceId) : null;
  const selectedLocation = selectedTask ? findLocation(state, selectedTask.locationId) : null;
  const selectedTeam = selectedTask ? findTeam(state, selectedTask.equipeId) : null;
  const editorTask = state.entities.tasks.find((task) => task.id === state.ui.trackingEditorTaskId) ?? null;
  const contextTask = state.entities.tasks.find((task) => task.id === state.ui.trackingContextMenu?.taskId) ?? null;
  const detailMeasurements = selectedTask ? state.entities.measurements.filter((item) => item.taskId === selectedTask.id).sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia)) : [];
  const selectedPredecessors = selectedTask ? selectedTask.predecessorTaskIds.map((id) => state.entities.tasks.find((task) => task.id === id)).filter(Boolean) : [];
  const selectedSuccessors = selectedTask ? selectedTask.successorTaskIds.map((id) => state.entities.tasks.find((task) => task.id === id)).filter(Boolean) : [];
  const relatedLogs = selectedTask ? state.entities.logs.slice().reverse().filter((log) => JSON.stringify(log.contexto || {}).includes(selectedTask.id)).slice(0, 8) : [];
  const summaryBlocks = [
    { label: "Atrasadas", value: kpis.delayed, filterKey: "status", filterValue: STATUS.ATRASADO },
    { label: "Iniciam em 2 dias", value: kpis.startingSoon, filterKey: "deviation", filterValue: "starting_soon" },
    { label: "Frentes ativas", value: kpis.activeFronts, filterKey: "status", filterValue: STATUS.EM_ANDAMENTO },
    { label: "Bloqueadas", value: kpis.blocked, filterKey: "status", filterValue: STATUS.BLOQUEADO },
  ];
  const rows = tasks.map((task, index) => {
    const service = findService(state, task.serviceId);
    const location = findLocation(state, task.locationId);
    const team = findTeam(state, task.equipeId);
    const deviation = taskDeviation(task, ref);
    const inconsistency = taskInconsistencyReason(task);
    const latestMeasurement = state.entities.measurements.filter((item) => item.taskId === task.id).sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia))[0];
    return `
      <tr class="ac-row ${task.status === STATUS.ATRASADO ? "late" : ""} ${task.id === selectedTask?.id ? "selected" : ""}" data-action="select-task" data-id="${task.id}">
        <td>${index + 1}</td>
        <td>${escapeHtml(service?.nome ?? "-")}</td>
        <td>${escapeHtml(service?.disciplina ?? "-")}</td>
        <td>${escapeHtml(locationDisplayName(state, task.locationId))}</td>
        <td>${escapeHtml(team?.nome ?? "Sem equipe")}</td>
        <td>${formatNumber(task.quantidade)}</td>
        <td>${formatNumber(task.quantidade * (task.percentComplete / 100))}</td>
        <td>${formatNumber(task.percentComplete)}%</td>
        <td>${formatDate(task.baselineStartISO)}</td>
        <td>${formatDate(task.baselineEndISO)}</td>
        <td>${formatDate(task.plannedStartISO)}</td>
        <td>${formatDate(task.plannedEndISO)}</td>
        <td>${formatDate(task.actualStartISO)}</td>
        <td>${formatDate(task.actualEndISO)}</td>
        <td>${makePill(task.status)}</td>
        <td>${deviation > 0 ? `+${deviation} dias` : deviation < 0 ? `${deviation} dias` : "No prazo"}</td>
        <td>${startsWithinTwoDays(task, ref) ? '<span class="soon-chip">D+2</span>' : "-"}</td>
        <td>${task.status === STATUS.ATRASADO ? "Sim" : "Nao"}</td>
        <td>${escapeHtml(inconsistency || task.bloqueios.join(", ") || "-")}</td>
        <td>${escapeHtml(latestMeasurement?.observacao ?? task.observacoes ?? "-")}</td>
      </tr>
    `;
  }).join("");

  return `
    <section class="track-screen">
      <div class="track-top">
        <div class="track-title">
          <div class="track-name">ACOMPANHAMENTO</div>
          <div class="track-sub">Centro oficial de leitura e registro do realizado da obra.</div>
          <div class="track-project">Projeto: <span>${escapeHtml(state.obra.nome)}</span></div>
        </div>
        <div class="track-controls">
          <div class="track-kpis">
            <button class="track-kpi" data-action="quick-filter" data-key="status" data-value="${STATUS.ATRASADO}"><span>Atrasadas</span><strong>${kpis.delayed}</strong></button>
            <button class="track-kpi" data-action="quick-filter" data-key="deviation" data-value="starting_soon"><span>Iniciam em 2 dias</span><strong>${kpis.startingSoon}</strong></button>
            <div class="track-kpi"><span>PPC</span><strong>${formatNumber(kpis.ppc)}%</strong></div>
            <div class="track-kpi"><span>Fim projetado</span><strong>${formatDate(state.dashboard.kpis.prazoProjetado)}</strong></div>
          </div>
          <div class="track-actions">
            <button class="btn-secondary" data-action="set-today">Hoje</button>
            <button class="btn-secondary" data-action="run-engine">Atualizar</button>
            <button class="btn" data-action="focus-register">Registrar avanco</button>
            <button class="btn-secondary" data-action="export-tracking-csv">Exportar CSV</button>
          </div>
        </div>
      </div>

      <div class="track-toolbar">
        <div class="track-mode segmented">
          ${[
            { value: "task_local", label: "Servico + Local" },
            { value: "service", label: "Servico" },
            { value: "team", label: "Equipe" },
          ].map((mode) => `<button class="${state.ui.filters.acompanhamentoMode === mode.value ? "active" : ""}" data-action="set-tracking-mode" data-value="${mode.value}">${mode.label}</button>`).join("")}
        </div>
        <div class="track-filters">
          <div class="field"><label>Periodo</label><select data-filter="periodPreset">${[{v:"2",l:"Prox. 2 dias"},{v:"7",l:"Prox. 7 dias"},{v:"14",l:"Prox. 14 dias"},{v:"30",l:"Prox. 30 dias"}].map((item)=>`<option value="${item.v}" ${preset===item.v?"selected":""}>${item.l}</option>`).join("")}</select></div>
          <div class="field"><label>Status</label><select data-filter="status"><option value="ALL">Todos</option>${Object.values(STATUS).map((status)=>`<option value="${status}" ${state.ui.filters.status===status?"selected":""}>${statusLabel(status)}</option>`).join("")}</select></div>
          <div class="field"><label>Servico</label><select data-filter="serviceId"><option value="ALL">Todos</option>${state.entities.services.map((service)=>`<option value="${service.id}" ${state.ui.filters.serviceId===service.id?"selected":""}>${escapeHtml(service.nome)}</option>`).join("")}</select></div>
          <div class="field"><label>Equipe</label><select data-filter="teamId"><option value="ALL">Todas</option><option value="NONE" ${state.ui.filters.teamId==="NONE"?"selected":""}>Sem equipe</option>${state.entities.teams.map((team)=>`<option value="${team.id}" ${state.ui.filters.teamId===team.id?"selected":""}>${escapeHtml(team.nome)}</option>`).join("")}</select></div>
          <div class="field field-wide"><label>Busca</label><input data-action="search-tracking" value="${escapeHtml(state.ui.filters.search)}" placeholder="Servico, pavimento, equipe, observacao" /></div>
        </div>
      </div>

      <section class="card plannerWrap track-planner-card">
        <h2><span class="hint">Colunas = ServiÃ§os â€¢ Linhas = dias Ãºteis â€¢ Blocos = Pavimento em execuÃ§Ã£o</span></h2>
        ${renderAcompanhamentoCanvas(state, tasks, ref, horizon)}
      </section>

      <div class="track-bottom">
        <section class="card track-detail-card">
          <h2><span>Leitura operacional</span><span class="hint">Selecione um bloco para registrar avanÃ§o e entender impacto.</span></h2>
          <div class="body">
            ${selectedTask ? `
              <div class="sticky-note">
                <strong>${escapeHtml(taskLabel(state, selectedTask))}</strong>
                <p class="muted">${escapeHtml(selectedService?.disciplina ?? "-")} | ${escapeHtml(selectedTeam?.nome ?? "Sem equipe")} | ${statusLabel(selectedTask.status)}</p>
              </div>
              <div class="detail-grid">
                <div><span class="muted">Servico</span><strong>${escapeHtml(selectedService?.nome ?? "-")}</strong></div>
                <div><span class="muted">Pavimento</span><strong>${escapeHtml(locationDisplayName(state, selectedTask.locationId))}</strong></div>
                <div><span class="muted">Equipe</span><strong>${escapeHtml(selectedTeam?.nome ?? "Sem equipe")}</strong></div>
                <div><span class="muted">Quantidade</span><strong>${formatNumber(selectedTask.quantidade)}</strong></div>
                <div><span class="muted">Baseline</span><strong>${formatDate(selectedTask.baselineStartISO)} a ${formatDate(selectedTask.baselineEndISO)}</strong></div>
                <div><span class="muted">Plano atual</span><strong>${formatDate(selectedTask.plannedStartISO)} a ${formatDate(selectedTask.plannedEndISO)}</strong></div>
                <div><span class="muted">Real</span><strong>${formatDate(selectedTask.actualStartISO)} a ${formatDate(selectedTask.actualEndISO)}</strong></div>
                <div><span class="muted">Desvio</span><strong>${taskDeviation(selectedTask, ref) > 0 ? `+${taskDeviation(selectedTask, ref)} dias` : taskDeviation(selectedTask, ref) < 0 ? `${taskDeviation(selectedTask, ref)} dias` : "No prazo"}</strong></div>
              </div>
              <div class="ac-side-actions">
                <button class="btn" data-action="focus-register">Registrar avanco</button>
                <button class="btn-secondary" data-action="open-gantt">Abrir no Gantt</button>
                <button class="btn-secondary" data-action="open-lob">Abrir na LOB</button>
              </div>
              <div class="import-box" id="tracking-register-box" style="margin-top:12px">
                <h4>Registrar avanco</h4>
                <div class="field"><label>Data referencia</label><input type="date" id="measurement-date" value="${ref}" /></div>
                <div class="field"><label>Quantidade executada</label><input id="measurement-quantity" type="number" min="0" step="0.01" value="${formatNumber(selectedTask.quantidade * (selectedTask.percentComplete / 100),2).replace(".","").replace(",",".")}" /></div>
                <div class="field"><label>Percentual executado</label><input id="measurement-percent" type="number" min="0" max="100" step="0.01" value="${selectedTask.percentComplete || 0}" /></div>
                <div class="field"><label>Observacao</label><input id="measurement-note" value="${escapeHtml(detailMeasurements[0]?.observacao ?? "")}" /></div>
                <input type="hidden" id="measurement-task" value="${selectedTask.id}" />
                <div class="toolbar"><button class="btn" data-action="save-measurement">Salvar medicao</button></div>
              </div>
            ` : `<div class="empty-board">Selecione um bloco do planner para abrir a leitura operacional.</div>`}
          </div>
        </section>

        <section class="card track-support-card">
          <h2><span>Suporte tÃ©cnico</span><span class="hint">DependÃªncias, histÃ³rico, auditoria e quadro tabular.</span></h2>
          <div class="body track-support-body">
            <div class="track-summary-row">
              ${summaryBlocks.map((block) => `<button class="summary-card" data-action="quick-filter" data-key="${block.filterKey}" data-value="${block.filterValue}"><span>${block.label}</span><strong>${block.value}</strong></button>`).join("")}
            </div>
            ${selectedTask ? `
              <div class="panel" style="margin-top:12px">
                <h4>Dependencias</h4>
                <div class="side-list">
                  <div class="side-item"><strong>Predecessoras</strong><span>${selectedPredecessors.length ? selectedPredecessors.map((task) => escapeHtml(taskLabel(state, task))).join(" | ") : "Nenhuma"}</span></div>
                  <div class="side-item"><strong>Sucessoras</strong><span>${selectedSuccessors.length ? selectedSuccessors.map((task) => escapeHtml(taskLabel(state, task))).join(" | ") : "Nenhuma"}</span></div>
                </div>
              </div>
              <div class="panel" style="margin-top:12px">
                <h4>Historico de medicoes</h4>
                ${table(["Data", "Acumulado", "%", "Origem", "Obs."], detailMeasurements.length ? detailMeasurements.map((item) => `<tr><td>${formatDate(item.dataReferencia)}</td><td>${formatNumber(item.quantidadeExecutada)}</td><td>${formatNumber(item.percentualExecutado)}%</td><td>${escapeHtml(item.origem)}</td><td>${escapeHtml(item.observacao)}</td></tr>`) : ['<tr><td colspan="5">Nenhuma medicao para esta atividade.</td></tr>'])}
              </div>
              <div class="panel" style="margin-top:12px">
                <h4>Auditoria resumida</h4>
                ${relatedLogs.length ? `<div class="side-list">${relatedLogs.map((log) => `<div class="side-item"><strong>${escapeHtml(log.acao)}</strong><span>${escapeHtml(log.mensagem)}</span><small>${new Date(log.timestamp).toLocaleString("pt-BR")}</small></div>`).join("")}</div>` : `<div class="empty-board">Sem logs especificos desta atividade.</div>`}
              </div>
            ` : ""}
            <details class="ac-secondary-details" style="margin-top:12px">
              <summary>Quadro tabular de apoio</summary>
              <div class="ac-grid-scroll ac-secondary-table" style="margin-top:12px">
                <table class="ac-grid">
                  <thead>
                    <tr>
                      <th class="sticky-col">Ordem</th>
                      <th class="sticky-col second">Servico</th>
                      <th>Disciplina</th>
                      <th>Local</th>
                      <th>Equipe</th>
                      <th>%</th>
                      <th>BL Ini</th>
                      <th>BL Fim</th>
                      <th>PL Ini</th>
                      <th>PL Fim</th>
                      <th>RL Ini</th>
                      <th>RL Fim</th>
                      <th>Status</th>
                      <th>Desvio</th>
                      <th>Bloqueio</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows || `<tr><td colspan="15">Nenhuma atividade encontrada para os filtros atuais.</td></tr>`}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </section>
      </div>
      ${state.ui.trackingContextMenu && contextTask ? `
        <div class="ac-context-backdrop" data-action="close-context-menu"></div>
        <div class="ac-context-menu" style="left:${state.ui.trackingContextMenu.x}px;top:${state.ui.trackingContextMenu.y}px">
          <button data-action="context-open-editor">Editar bloco</button>
          <button data-action="context-mark-done">Marcar como executado</button>
          <button data-action="context-block">Marcar bloqueio</button>
          <button data-action="context-delay">Inserir atraso +1 dia</button>
          <button data-action="close-context-menu">Fechar</button>
        </div>
      ` : ""}
      ${editorTask ? `
        <div class="ac-editor-backdrop" data-action="close-tracking-editor"></div>
        <div class="ac-editor-modal">
          <div class="ac-editor-head">
            <div>
              <strong>Editar atividade</strong>
              <div class="muted">${escapeHtml(taskLabel(state, editorTask))}</div>
            </div>
            <button class="btn-secondary" data-action="close-tracking-editor">Fechar</button>
          </div>
          <div class="ac-editor-grid">
            <div class="field"><label>Pavimento</label><select id="tracking-editor-location">${state.entities.locations.filter((item) => item.tipoLocal !== "obra").map((location) => `<option value="${location.id}" ${location.id === editorTask.locationId ? "selected" : ""}>${escapeHtml(locationDisplayName(state, location.id))}</option>`).join("")}</select></div>
            <div class="field"><label>Status</label><select id="tracking-editor-status">${Object.values(STATUS).map((status) => `<option value="${status}" ${status === editorTask.status ? "selected" : ""}>${statusLabel(status)}</option>`).join("")}</select></div>
            <div class="field"><label>Inicio planejado</label><input id="tracking-editor-start" type="date" value="${editorTask.plannedStartISO}" /></div>
            <div class="field"><label>Termino planejado</label><input id="tracking-editor-end" type="date" value="${editorTask.plannedEndISO}" /></div>
            <div class="field"><label>Duracao (dias uteis)</label><input id="tracking-editor-duration" type="number" min="1" step="1" value="${editorTask.duracaoPlanejadaDias}" /></div>
            <div class="field"><label>Equipe</label><select id="tracking-editor-team"><option value="">Sem equipe</option>${state.entities.teams.map((team) => `<option value="${team.id}" ${team.id === editorTask.equipeId ? "selected" : ""}>${escapeHtml(team.nome)}</option>`).join("")}</select></div>
            <div class="field"><label>Inicio real</label><input id="tracking-editor-real-start" type="date" value="${editorTask.actualStartISO ?? ""}" /></div>
            <div class="field"><label>Termino real</label><input id="tracking-editor-real-end" type="date" value="${editorTask.actualEndISO ?? ""}" /></div>
            <div class="field" style="grid-column:1 / -1"><label>Observacao</label><input id="tracking-editor-note" value="${escapeHtml(editorTask.observacoes ?? "")}" /></div>
          </div>
          <div class="ac-editor-actions">
            <button class="btn-secondary" data-action="close-tracking-editor">Cancelar</button>
            <button class="btn" data-action="save-tracking-editor">Salvar ajustes</button>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function renderShortTerm(state) {
  const horizon = Number(state.ui.filters.horizonDays);
  const referenceDate = state.tracking.referenceDate;
  const rows = state.entities.tasks.filter((task) => {
    const delta = diffDays(referenceDate, task.plannedStartISO);
    return delta >= 0 && delta <= horizon;
  }).map((task) => `
    <tr>
      <td>${escapeHtml(taskLabel(state, task))}</td>
      <td>${formatDate(task.plannedStartISO)}</td>
      <td>${formatDate(task.plannedEndISO)}</td>
      <td>${escapeHtml(task.bloqueios.join(", ") || "-")}</td>
      <td>${makePill(task.status)}</td>
    </tr>
  `);
  return `
    <section class="panel">
      <div class="section-title">
        <h3>Curto prazo</h3>
        <div class="field">
          <label>Horizonte</label>
          <select data-filter="horizonDays">${[7, 14, 21, 30].map((value) => `<option value="${value}" ${value === horizon ? "selected" : ""}>${value} dias</option>`).join("")}</select>
        </div>
      </div>
      ${table(["Task", "Inicio", "Termino", "Bloqueios", "Status"], rows.length ? rows : ['<tr><td colspan="5">Nenhuma atividade no horizonte atual.</td></tr>'])}
    </section>
  `;
}

function buildAxis(tasks, scale) {
  const dates = tasks.flatMap((task) => [task.baselineStartISO, task.baselineEndISO, task.plannedStartISO, task.plannedEndISO, task.actualStartISO, task.actualEndISO]).filter(Boolean).sort();
  if (!dates.length) {
    return null;
  }
  const start = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${dates.at(-1)}T00:00:00Z`);
  const ticks = [];
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    let label = iso.slice(8, 10);
    if (scale === "week") {
      label = cursor.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
      cursor.setUTCDate(cursor.getUTCDate() + 7);
    } else if (scale === "month") {
      label = cursor.toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short", year: "2-digit" });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    } else {
      label = cursor.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    ticks.push({ iso, label });
  }
  return { startISO: dates[0], endISO: dates.at(-1), ticks };
}

function dateIndex(baseISO, targetISO, scale) {
  const start = Date.parse(`${baseISO}T00:00:00Z`);
  const target = Date.parse(`${targetISO}T00:00:00Z`);
  const days = Math.max(0, Math.round((target - start) / 86400000));
  if (scale === "month") {
    const startDate = new Date(`${baseISO}T00:00:00Z`);
    const targetDate = new Date(`${targetISO}T00:00:00Z`);
    return ((targetDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12) + (targetDate.getUTCMonth() - startDate.getUTCMonth());
  }
  if (scale === "week") {
    return Math.floor(days / 7);
  }
  return days;
}

function addIsoDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildDayAxis(tasks) {
  const dates = tasks.flatMap((task) => [task.plannedStartISO, task.plannedEndISO, task.actualStartISO, task.actualEndISO, task.baselineStartISO, task.baselineEndISO]).filter(Boolean).sort();
  if (!dates.length) {
    return null;
  }
  const start = dates[0];
  const end = dates.at(-1);
  const totalDays = diffDays(start, end) + 1;
  const days = Array.from({ length: totalDays }, (_, index) => {
    const iso = addIsoDays(start, index);
    const label = new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
    return { iso, label, dow: new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" }) };
  });
  return { startISO: start, endISO: end, days };
}

function buildPlannerColumns(state, sourceTasks = state.entities.tasks) {
  const grouped = new Map();
  sourceTasks.forEach((task) => {
    const service = state.entities.services.find((item) => item.id === task.serviceId);
    const team = state.entities.teams.find((item) => item.id === task.equipeId);
    const serviceKey = service?.id ?? task.serviceId;
    if (!grouped.has(serviceKey)) {
      grouped.set(serviceKey, { service, teams: new Map() });
    }
    const teamKey = task.equipeId || `sem-equipe-${serviceKey}`;
    if (!grouped.get(serviceKey).teams.has(teamKey)) {
      grouped.get(serviceKey).teams.set(teamKey, { team, tasks: [] });
    }
    grouped.get(serviceKey).teams.get(teamKey).tasks.push(task);
  });
  return [...grouped.values()].map((group) => ({
    service: group.service,
    teamColumns: [...group.teams.values()],
  }));
}

function buildAcompanhamentoColumns(state, sourceTasks, mode) {
  if (mode === "service") {
    const grouped = new Map();
    sourceTasks.forEach((task) => {
      const service = findService(state, task.serviceId);
      const key = service?.id ?? task.serviceId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          groupId: key,
          groupName: service?.nome ?? "Servico",
          color: service?.corVisual ?? "#1d4ed8",
          columns: [{ subName: "Consolidado", tasks: [] }],
        });
      }
      grouped.get(key).columns[0].tasks.push(task);
    });
    return [...grouped.values()];
  }
  if (mode === "team") {
    const grouped = new Map();
    sourceTasks.forEach((task) => {
      const team = findTeam(state, task.equipeId);
      const service = findService(state, task.serviceId);
      const teamKey = team?.id ?? `sem-equipe-${task.serviceId}`;
      if (!grouped.has(teamKey)) {
        grouped.set(teamKey, {
          groupId: teamKey,
          groupName: team?.nome ?? "Sem equipe",
          color: "#475569",
          columns: [],
        });
      }
      const group = grouped.get(teamKey);
      let column = group.columns.find((item) => item.subKey === (service?.id ?? task.serviceId));
      if (!column) {
        column = { subKey: service?.id ?? task.serviceId, subName: service?.nome ?? "Servico", tasks: [] };
        group.columns.push(column);
      }
      column.tasks.push(task);
      if (service?.corVisual) {
        group.color = service.corVisual;
      }
    });
    return [...grouped.values()];
  }
  return buildPlannerColumns(state, sourceTasks).map((group, index) => ({
    groupId: group.service?.id ?? `svc-${index}`,
    groupName: group.service?.nome ?? "Servico",
    color: group.service?.corVisual ?? locationColor(index),
    columns: group.teamColumns.map((teamColumn) => ({
      subKey: teamColumn.team?.id ?? `sem-equipe-${index}`,
      subName: teamColumn.team?.nome ?? "Sem equipe",
      tasks: teamColumn.tasks,
    })),
  }));
}

function acompanhamentoBlockClass(task, referenceDate) {
  if (task.status === STATUS.INCONSISTENTE) return "isInconsistent";
  if (task.status === STATUS.BLOQUEADO) return "isBlocked";
  if (task.status === STATUS.CONCLUIDO) return "isMeasured";
  if (task.status === STATUS.ATRASADO) return "isDelayed";
  if (task.percentComplete > 0 || task.actualStartISO) return "isReal";
  if (startsWithinTwoDays(task, referenceDate)) return "isSoon";
  return "isPlanned";
}

function renderAcompanhamentoCanvas(state, tasks, referenceDate, horizonDays) {
  if (!tasks.length) {
    return `<div class="empty-board">Nenhuma atividade encontrada para os filtros atuais.</div>`;
  }
  const axisDays = buildWorkingAxis(state, referenceDate, horizonDays);
  const mode = state.ui.filters.acompanhamentoMode || "task_local";
  const columns = buildAcompanhamentoColumns(state, tasks, mode);
  const rowHeight = 28;
  const colWidth = 220;
  const topHeight = 86;
  const gridWidth = columns.reduce((sum, group) => sum + (group.columns.length * colWidth), 0);
  const gridHeight = topHeight + axisDays.length * rowHeight;
  const modeLabel = mode === "team" ? "Colunas = Equipes â€¢ Subcolunas = Servicos â€¢ Linhas = dias uteis â€¢ Blocos = frente em execucao" : mode === "service" ? "Colunas = Servicos â€¢ Linhas = dias uteis â€¢ Blocos = locais em execucao" : "Colunas = Servicos â€¢ Subcolunas = Equipes â€¢ Linhas = dias uteis â€¢ Blocos = pavimento em execucao";
  let columnCursor = 0;
  const headerGroups = columns.map((group, groupIndex) => {
    const width = group.columns.length * colWidth;
    const color = group.color || locationColor(groupIndex);
    const teamHeaders = group.columns.map((teamColumn) => {
      const left = columnCursor * colWidth;
      columnCursor += 1;
      const progress = teamColumn.tasks.length ? teamColumn.tasks.reduce((sum, task) => sum + (task.percentComplete || 0), 0) / teamColumn.tasks.length : 0;
      return {
        left,
        width: colWidth,
        teamName: teamColumn.subName ?? "Sem equipe",
        tasks: teamColumn.tasks,
        progress,
      };
    });
    return { serviceName: group.groupName ?? "Servico", width, color, teamHeaders };
  });
  const rowLabels = axisDays.map((day, index) => `
    <div class="ac-canvas-date ${day.iso === referenceDate ? "today" : ""}" style="top:${topHeight + index * rowHeight}px;height:${rowHeight}px">
      <div class="railDateMain">
        <span>${escapeHtml(day.label)}</span>
        <small>${escapeHtml(day.dow)}</small>
      </div>
      ${day.iso === referenceDate ? `<span class="todayTag">HOJE</span>` : `<span class="railDateIndex">${String(index + 1).padStart(2, "0")}</span>`}
    </div>
  `).join("");
  const rowLines = axisDays.map((day, index) => `
    <div class="ac-canvas-row ${index % 2 === 0 ? "even" : ""} ${day.iso === referenceDate ? "today" : ""}" style="top:${topHeight + index * rowHeight}px;height:${rowHeight}px;width:${gridWidth}px"></div>
  `).join("");
  const todayOffset = diffDays(referenceDate, referenceDate) * rowHeight;
  const blocks = headerGroups.map((group) => group.teamHeaders.map((header) => header.tasks.map((task) => {
    const startOffset = axisDays.findIndex((day) => day.iso === task.plannedStartISO);
    const endOffset = axisDays.findIndex((day) => day.iso === task.plannedEndISO);
    const clippedStart = Math.max(0, startOffset);
    const clippedEnd = Math.min(axisDays.length - 1, endOffset);
    if (clippedEnd < 0 || clippedStart > horizonDays) {
      return "";
    }
    const top = topHeight + clippedStart * rowHeight + 3;
    const height = Math.max(22, ((clippedEnd - clippedStart) + 1) * rowHeight - 6);
    const baselineStartOffset = task.baselineStartISO ? axisDays.findIndex((day) => day.iso === task.baselineStartISO) : null;
    const baselineEndOffset = task.baselineEndISO ? axisDays.findIndex((day) => day.iso === task.baselineEndISO) : null;
    const baseline = baselineStartOffset !== null && baselineEndOffset !== null
      ? `<div class="ac-ghost ${task.status === STATUS.INCONSISTENTE ? "danger" : ""}" style="left:${header.left + 10}px;top:${topHeight + Math.max(0, baselineStartOffset) * rowHeight + 5}px;width:${colWidth - 20}px;height:${Math.max(14, ((Math.min(axisDays.length - 1, baselineEndOffset) - Math.max(0, baselineStartOffset)) + 1) * rowHeight - 10)}px"></div>`
      : "";
    const actual = task.actualStartISO
      ? `<div class="ac-real-line" style="left:${header.left + colWidth - 12}px;top:${top + 6}px;height:${Math.max(12, (Math.max(0, diffDays(task.actualStartISO, task.actualEndISO || referenceDate)) + 1) * rowHeight - 12)}px"></div>`
      : "";
    const locationName = locationDisplayName(state, task.locationId);
    const serviceName = findService(state, task.serviceId)?.nome ?? "Servico";
    const teamName = findTeam(state, task.equipeId)?.nome ?? "Sem equipe";
    const title = mode === "service" ? locationName : mode === "team" ? serviceName : locationName;
    const subtitle = mode === "service" ? teamName : mode === "team" ? locationName : teamName;
    const locationTone = locationColorById(state, task.locationId);
    const metaLine = mode === "service" ? `${serviceName} â€¢ ${formatNumber(task.percentComplete)}%` : mode === "team" ? `${teamName} â€¢ ${formatNumber(task.percentComplete)}%` : `${serviceName} â€¢ ${formatNumber(task.percentComplete)}%`;
    return `
      ${baseline}
      <button class="ac-block ${acompanhamentoBlockClass(task, referenceDate)}" data-action="select-task" data-id="${task.id}" data-service-id="${task.serviceId}" data-location-id="${task.locationId}" style="left:${header.left + 8}px;top:${top}px;width:${colWidth - 16}px;height:${height}px;--block:${locationTone};--accent:${group.color}">
        <span class="ac-block-title">${escapeHtml(title)}</span>
        <span class="ac-block-sub">${escapeHtml(subtitle)}</span>
        <span class="ac-block-sub">${escapeHtml(metaLine)} â€¢ ${statusLabel(task.status)}</span>
      </button>
      ${actual}
    `;
  }).join("")).join("")).join("");
  const blockRefs = [];
  headerGroups.forEach((group) => {
    group.teamHeaders.forEach((header) => {
      header.tasks.forEach((task) => {
        const startOffset = axisDays.findIndex((day) => day.iso === task.plannedStartISO);
        const endOffset = axisDays.findIndex((day) => day.iso === task.plannedEndISO);
        if (startOffset < 0 || endOffset < 0) return;
        blockRefs.push({
          task,
          x: header.left + (colWidth / 2),
          y: topHeight + startOffset * rowHeight + (((Math.max(22, ((Math.min(axisDays.length - 1, endOffset) - Math.max(0, startOffset)) + 1) * rowHeight - 6))) / 2),
        });
      });
    });
  });
  const lobLinks = [...new Set(blockRefs.map((item) => item.task.locationId))].map((locationId) => {
    const points = blockRefs.filter((item) => item.task.locationId === locationId).sort((a, b) => a.x - b.x);
    if (points.length < 2) return "";
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    return `<path d="${path}" stroke="${locationColorById(state, locationId)}" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="8 6" opacity=".45"></path>`;
  }).join("");
  return `
    <div class="ac-canvas-wrap">
      <div class="ac-canvas-strip">${escapeHtml(modeLabel)}</div>
      <div class="plannerShell acompanhamentoCanvas">
        <div class="plannerRail">
          <div class="plannerRailTop plannerRailTopSplit">
            <div class="railTopCol">
              <strong>Calendario</strong>
              <small>Dias uteis</small>
            </div>
            <div class="railTopCol align-right">
              <strong>EAP â†’</strong>
              <small>Fluxo oficial</small>
            </div>
          </div>
          <div class="plannerRailBody" style="height:${gridHeight - topHeight}px">${rowLabels}</div>
        </div>
        <div class="gridOuter">
          <div class="grid" style="width:${gridWidth}px;height:${gridHeight}px">
            <div class="topHeader">
              ${headerGroups.map((group) => `
                <div class="svcHeader" style="width:${group.width}px">
                  <div class="name" style="border-left:4px solid ${group.color};padding-left:10px">
                    <span class="svcNameText">${escapeHtml(group.serviceName)}</span>
                    <span class="svcSubText">${group.teamHeaders.length} ${group.teamHeaders.length > 1 ? "frentes" : "frente"}</span>
                  </div>
                  <div class="teamsRow">
                    ${group.teamHeaders.map((header) => `<div class="teamCell" style="width:${header.width}px"><div><strong>${escapeHtml(header.teamName)}</strong><span class="teamCellBar"><i style="width:${Math.max(6, header.progress)}%"></i></span></div></div>`).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
            <div class="todayLine" style="top:${topHeight + todayOffset}px;width:${gridWidth}px"></div>
            ${rowLines}
            <svg class="lobOverlay" width="${gridWidth}" height="${gridHeight}" viewBox="0 0 ${gridWidth} ${gridHeight}" preserveAspectRatio="none">${lobLinks}</svg>
            ${blocks}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBlockPlanner(state) {
  const tasks = state.entities.tasks.slice().sort((a, b) => a.plannedStartISO.localeCompare(b.plannedStartISO));
  const axis = buildDayAxis(tasks);
  if (!axis) {
    return `<div class="empty-board">Sem tasks para exibir no planner por blocos.</div>`;
  }
  const columns = buildPlannerColumns(state);
  const selectedServiceId = state.ui.filters.serviceId !== "ALL" ? state.ui.filters.serviceId : null;
  const selectedLocationId = state.ui.filters.locationId !== "ALL" ? state.ui.filters.locationId : null;
  const rowHeight = 30;
  const colWidth = 220;
  const leftWidth = 140;
  const topHeight = 82;
  const dayCount = axis.days.length;
  const totalTeamColumns = columns.reduce((sum, group) => sum + group.teamColumns.length, 0);
  const gridWidth = totalTeamColumns * colWidth;
  const gridHeight = dayCount * rowHeight + topHeight;

  let columnCursor = 0;
  const headerGroups = columns.map((group, groupIndex) => {
    const width = group.teamColumns.length * colWidth;
    const serviceName = group.service?.nome ?? "Servico";
    const teamHeaders = group.teamColumns.map((teamColumn) => {
      const currentLeft = columnCursor * colWidth;
      columnCursor += 1;
      return {
        left: currentLeft,
        name: teamColumn.team?.nome ?? "Sem equipe",
        width: colWidth,
        teamColumn,
      };
    });
    return { serviceName, width, teamHeaders, serviceId: group.service?.id, color: locationColor(groupIndex) };
  });

  const rowLabels = axis.days.map((day, index) => `
    <div class="planner-day-label ${index % 2 === 0 ? "even" : ""}" style="top:${topHeight + index * rowHeight}px;height:${rowHeight}px">
      <span>${escapeHtml(day.label)}</span>
      <small>${escapeHtml(day.dow)}</small>
    </div>
  `).join("");

  const rowLines = axis.days.map((day, index) => `<div class="planner-row-line ${index % 2 === 0 ? "even" : ""}" style="top:${topHeight + index * rowHeight}px;height:${rowHeight}px;width:${gridWidth}px"></div>`).join("");

  const blocks = headerGroups.flatMap((group) => group.teamHeaders.map((header) => {
    return header.teamColumn.tasks.map((task) => {
      const top = topHeight + dateIndex(axis.startISO, task.plannedStartISO, "day") * rowHeight + 3;
      const height = Math.max(24, (diffDays(task.plannedStartISO, task.plannedEndISO) + 1) * rowHeight - 6);
      const locationIndex = state.entities.locations.filter((item) => item.tipoLocal !== "obra").findIndex((item) => item.id === task.locationId);
      const blockColor = locationColor(Math.max(0, locationIndex));
      const isDimmed = (selectedServiceId && task.serviceId !== selectedServiceId) || (selectedLocationId && task.locationId !== selectedLocationId);
      const baseline = task.baselineStartISO && task.baselineEndISO
        ? `<div class="planner-baseline" style="left:${header.left + 14}px;top:${top - 7}px;width:${colWidth - 28}px"></div>`
        : "";
      const actualHeight = task.actualStartISO ? Math.max(10, (diffDays(task.actualStartISO, task.actualEndISO || state.tracking.referenceDate) + 1) * rowHeight - 16) : 0;
      const actualTop = task.actualStartISO ? top + 8 : 0;
      const actual = task.actualStartISO ? `<div class="planner-actual" style="left:${header.left + colWidth - 12}px;top:${actualTop}px;height:${actualHeight}px"></div>` : "";
      return `
        ${baseline}
        <button class="planner-block status-${task.status} ${isDimmed ? "dimmed" : ""}" data-action="select-task" data-id="${task.id}" data-service-id="${task.serviceId}" data-location-id="${task.locationId}" style="left:${header.left + 8}px;top:${top}px;width:${colWidth - 16}px;height:${height}px;--chip:${blockColor}">
          <span class="planner-block-service">${escapeHtml(state.entities.services.find((service) => service.id === task.serviceId)?.nome ?? task.serviceId)}</span>
          <span class="planner-block-meta">${escapeHtml(state.entities.locations.find((location) => location.id === task.locationId)?.nome ?? task.locationId)}</span>
          <span class="planner-block-meta">${formatDate(task.plannedStartISO)} - ${formatDate(task.plannedEndISO)}</span>
        </button>
        ${actual}
      `;
    }).join("");
  })).join("");

  const selectedTask = state.entities.tasks.find((task) => task.id === state.ui.selectedTaskId) ?? tasks[0];
  const selectedService = state.entities.services.find((service) => service.id === selectedTask?.serviceId);
  const selectedTeam = state.entities.teams.find((team) => team.id === selectedTask?.equipeId);

  return `
    <div class="plannerWrap">
      <div class="plannerLegend">
        <div class="legend"><span style="color:#cbd5e1">Baseline</span><span style="color:#e09f3e">Real</span><span style="color:#1f7a8c">Bloco planejado</span></div>
      </div>
      <div class="plannerShell">
        <div class="plannerRail">
          <div class="plannerRailTop">Tempo</div>
          <div class="plannerRailBody" style="height:${gridHeight - topHeight}px">${rowLabels}</div>
        </div>
        <div class="gridOuter">
          <div class="grid" style="--gridW:${gridWidth}px;--dayCount:${dayCount};--rowH:${rowHeight}px;--topH:${topHeight}px;width:${gridWidth}px;height:${gridHeight}px">
            <div class="topHeader">
              ${headerGroups.map((group) => `
                <div class="svcHeader ${group.serviceId === selectedServiceId ? "active" : ""}" style="width:${group.width}px">
                  <button class="svcHeaderTitle svcHeaderBtn" data-action="pick-service" data-id="${group.serviceId}" style="--service:${group.color}">${escapeHtml(group.serviceName)}</button>
                  <div class="teamHeaderRow">
                    ${group.teamHeaders.map((header) => `<div class="teamHeader" style="width:${header.width}px">${escapeHtml(header.name)}</div>`).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
            ${rowLines}
            ${blocks}
          </div>
        </div>
      </div>
      <div class="detail-card">
        <h4>Detalhe selecionado</h4>
        ${selectedTask ? `
          <div class="detail-grid">
            <div><span class="muted">Atividade</span><strong>${escapeHtml(taskLabel(state, selectedTask))}</strong></div>
            <div><span class="muted">Servico</span><strong>${escapeHtml(selectedService?.nome ?? selectedTask.serviceId)}</strong></div>
            <div><span class="muted">Equipe</span><strong>${escapeHtml(selectedTeam?.nome ?? selectedTask.equipeId ?? "Sem equipe")}</strong></div>
            <div><span class="muted">Planejado</span><strong>${formatDate(selectedTask.plannedStartISO)} a ${formatDate(selectedTask.plannedEndISO)}</strong></div>
            <div><span class="muted">Real</span><strong>${formatDate(selectedTask.actualStartISO)} a ${formatDate(selectedTask.actualEndISO)}</strong></div>
            <div><span class="muted">Status</span><strong>${selectedTask.status}</strong></div>
          </div>
        ` : `<p class="muted">Nenhuma task disponivel.</p>`}
      </div>
    </div>
  `;
}

function renderTimelineBoard(state, mode) {
  const scale = mode === "long" ? "month" : state.ui.filters.ganttScale;
  const tasks = state.entities.tasks.slice().sort((a, b) => a.plannedStartISO.localeCompare(b.plannedStartISO));
  const axis = buildAxis(tasks, scale);
  if (!axis) {
    return `<div class="empty-board">Sem tasks para exibir nesta visualizacao.</div>`;
  }
  const groupedByService = new Map();
  tasks.forEach((task) => {
    if (!groupedByService.has(task.serviceId)) {
      groupedByService.set(task.serviceId, []);
    }
    groupedByService.get(task.serviceId).push(task);
  });
  const rows = state.ui.filters.timelineGroup === "service"
    ? [...groupedByService.entries()].map(([serviceId, groupTasks]) => ({
        id: `group-${serviceId}`,
        title: state.entities.services.find((service) => service.id === serviceId)?.nome ?? serviceId,
        subtitle: `${groupTasks.length} task(s) | ${groupTasks.map((task) => state.entities.locations.find((location) => location.id === task.locationId)?.nome ?? task.locationId).join(", ")}`,
        chips: groupTasks.map((task) => ({ task, color: state.entities.services.find((service) => service.id === serviceId)?.corVisual || "#1f7a8c" })),
      }))
    : tasks.map((task) => ({
        id: task.id,
        title: `${state.entities.services.find((service) => service.id === task.serviceId)?.nome ?? task.serviceId}`,
        subtitle: `${state.entities.locations.find((location) => location.id === task.locationId)?.nome ?? task.locationId} | ${task.equipeId ?? "Sem equipe"}`,
        chips: [{ task, color: state.entities.services.find((service) => service.id === task.serviceId)?.corVisual || "#1f7a8c" }],
      }));
  const cellWidth = scale === "day" ? 34 : scale === "week" ? 72 : 110;
  const header = axis.ticks.map((tick) => `<div class="time-cell" style="width:${cellWidth}px">${escapeHtml(tick.label)}</div>`).join("");
  const body = rows.map((row) => {
    const grid = axis.ticks.map(() => `<div class="lane-cell" style="width:${cellWidth}px"></div>`).join("");
    const chips = row.chips.map(({ task, color }) => {
      const left = dateIndex(axis.startISO, task.plannedStartISO, scale) * cellWidth;
      const width = Math.max(cellWidth - 6, (dateIndex(axis.startISO, task.plannedEndISO, scale) - dateIndex(axis.startISO, task.plannedStartISO, scale) + 1) * cellWidth - 6);
      const baseline = task.baselineStartISO && task.baselineEndISO ? `<div class="task-baseline" style="left:${dateIndex(axis.startISO, task.baselineStartISO, scale) * cellWidth}px;width:${Math.max(cellWidth - 12, (dateIndex(axis.startISO, task.baselineEndISO, scale) - dateIndex(axis.startISO, task.baselineStartISO, scale) + 1) * cellWidth - 12)}px"></div>` : "";
      const actual = task.actualStartISO ? `<div class="task-actual" style="left:${dateIndex(axis.startISO, task.actualStartISO, scale) * cellWidth}px;width:${Math.max(14, (dateIndex(axis.startISO, task.actualEndISO || state.tracking.referenceDate, scale) - dateIndex(axis.startISO, task.actualStartISO, scale) + 1) * cellWidth - 14)}px"></div>` : "";
      const dayBlocks = scale === "day" ? `<div class="day-blocks">${Array.from({ length: Math.max(1, diffDays(task.plannedStartISO, task.plannedEndISO) + 1) }, () => `<span class="day-block"></span>`).join("")}</div>` : "";
      return `
        ${baseline}
        <button class="task-chip status-${task.status}" data-action="select-task" data-id="${task.id}" style="left:${left}px;width:${width}px;--chip:${color}">
          <span class="task-chip-title">${escapeHtml(taskLabel(state, task))}</span>
          <span class="task-chip-meta">${escapeHtml(findTeam(state, task.equipeId)?.nome ?? "Sem equipe")} | ${formatNumber(task.percentComplete)}%</span>
          ${dayBlocks}
        </button>
        ${actual}
      `;
    }).join("");
    return `
      <div class="timeline-row">
        <div class="timeline-name">
          <div class="timeline-title">${escapeHtml(row.title)}</div>
          <div class="timeline-subtitle">${escapeHtml(row.subtitle)}</div>
        </div>
        <div class="timeline-lane" style="width:${axis.ticks.length * cellWidth}px">
          <div class="lane-grid">${grid}</div>
          ${chips}
        </div>
      </div>
    `;
  }).join("");
  const selectedTask = state.entities.tasks.find((task) => task.id === state.ui.selectedTaskId) ?? tasks[0];
  const selectedService = state.entities.services.find((service) => service.id === selectedTask?.serviceId);
  const selectedLocation = state.entities.locations.find((location) => location.id === selectedTask?.locationId);
  return `
    <div class="timeline-board">
      <div class="timeline-toolbar">
        ${mode === "gantt" ? `
          <div class="segmented">
            ${["day", "week", "month"].map((value) => `<button class="${state.ui.filters.ganttScale === value ? "active" : ""}" data-action="set-scale" data-value="${value}">${value.toUpperCase()}</button>`).join("")}
          </div>
          <div class="segmented">
            ${["task", "service"].map((value) => `<button class="${state.ui.filters.timelineGroup === value ? "active" : ""}" data-action="set-group" data-value="${value}">${value === "task" ? "Tasks" : "Servicos"}</button>`).join("")}
          </div>
        ` : `<div class="sticky-note small-note"><strong>Longo prazo</strong><p>Comprimido por mes para leitura executiva e fases da obra.</p></div>`}
      </div>
      <div class="timeline-shell">
        <div class="timeline-header">
          <div class="timeline-name head">Frente</div>
          <div class="timeline-scale" style="width:${axis.ticks.length * cellWidth}px">${header}</div>
        </div>
        <div class="timeline-body">${body}</div>
      </div>
      <div class="detail-card">
        <h4>Detalhe selecionado</h4>
        ${selectedTask ? `
          <div class="detail-grid">
            <div><span class="muted">Atividade</span><strong>${escapeHtml(taskLabel(state, selectedTask))}</strong></div>
            <div><span class="muted">Servico</span><strong>${escapeHtml(selectedService?.nome ?? selectedTask.serviceId)}</strong></div>
            <div><span class="muted">Local</span><strong>${escapeHtml(selectedLocation?.nome ?? selectedTask.locationId)}</strong></div>
            <div><span class="muted">Equipe</span><strong>${escapeHtml(findTeam(state, selectedTask.equipeId)?.nome ?? "Nao vinculada")}</strong></div>
            <div><span class="muted">Planejado</span><strong>${formatDate(selectedTask.plannedStartISO)} a ${formatDate(selectedTask.plannedEndISO)}</strong></div>
            <div><span class="muted">Status</span><strong>${selectedTask.status}</strong></div>
          </div>
        ` : `<p class="muted">Nenhuma task disponivel.</p>`}
      </div>
    </div>
  `;
}

function renderGantt(state) {
  return `
    <section class="panel">
      <h3>Planner por blocos</h3>
      <p class="muted">Tempo nas linhas e colunas agrupadas por servico e equipe, no formato matricial do modelo operacional.</p>
      ${renderBlockPlanner(state)}
    </section>
  `;
}

function renderLob(state) {
  const tasks = state.entities.tasks.slice().sort((a, b) => a.locationId.localeCompare(b.locationId) || a.plannedStartISO.localeCompare(b.plannedStartISO));
  const locations = state.entities.locations.slice().sort((a, b) => a.ordem - b.ordem);
  if (!tasks.length) {
    return `<section class="panel"><h3>Linha de Balanco</h3><div class="empty-board">Sem tasks para gerar a LOB.</div></section>`;
  }
  const axis = buildAxis(tasks, "week");
  const width = Math.max(1200, axis.ticks.length * 80 + 120);
  const height = Math.max(420, locations.length * 90 + 80);
  const guides = axis.ticks.map((tick, index) => `<line x1="${100 + index * 80}" y1="0" x2="${100 + index * 80}" y2="${height}" stroke="#eef3f6"></line><text x="${104 + index * 80}" y="18" font-size="11" fill="#607284">${escapeHtml(tick.label)}</text>`).join("");
  const labels = locations.map((location, index) => `<text x="10" y="${54 + index * 90}" font-size="12" fill="#16222d">${escapeHtml(location.nome)}</text>`).join("");
  const lines = state.entities.services.map((service) => {
    const serviceTasks = tasks.filter((task) => task.serviceId === service.id);
    if (!serviceTasks.length) {
      return "";
    }
    const points = serviceTasks.map((task) => {
      const x = 100 + dateIndex(axis.startISO, task.plannedStartISO, "week") * 80;
      const y = 50 + locations.findIndex((location) => location.id === task.locationId) * 90;
      return `${x},${y}`;
    }).join(" ");
    return `<polyline fill="none" stroke="${service.corVisual || "#1f7a8c"}" stroke-width="4" points="${points}"></polyline>`;
  }).join("");
  return `
    <section class="panel">
      <h3>Linha de Balanco</h3>
      <p class="muted">Fluxo por local ao longo do tempo. Cruzamentos e buracos ajudam a detectar conflitos e quebras de pipeline.</p>
      <div class="chart"><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${guides}${labels}${lines}</svg></div>
      <div class="legend">${state.entities.services.map((service) => `<span style="color:${service.corVisual || "#1f7a8c"}">${escapeHtml(service.nome)}</span>`).join("")}</div>
    </section>
  `;
}

function renderReports(state) {
  const kpi = state.dashboard.kpis;
  return `
    <section class="panel">
      <h3>Relatorios</h3>
      <div class="toolbar">
        <button class="btn-secondary" data-action="export-tasks-csv">Exportar tasks CSV</button>
        <button class="btn-secondary" data-action="export-measurements-csv">Exportar acompanhamento CSV</button>
      </div>
      <div class="grid three" style="margin-top:14px">
        <div class="sticky-note"><strong>Atrasos</strong><p>${kpi.tarefasAtrasadas} task(s) atrasadas.</p></div>
        <div class="sticky-note"><strong>Frentes ativas</strong><p>${kpi.frentesAtivas} frente(s) em andamento.</p></div>
        <div class="sticky-note"><strong>Mao de obra</strong><p>Custo estimado de R$ ${formatNumber(kpi.custoEstimadoMaoDeObra)}.</p></div>
      </div>
      <div style="margin-top:18px">
        <h4>Visao de longo prazo</h4>
        ${renderTimelineBoard(state, "long")}
      </div>
    </section>
  `;
}

function renderAudit(state) {
  return `
    <section class="panel">
      <h3>Auditoria tecnica</h3>
      ${table(["Data", "Nivel", "Modulo", "Acao", "Mensagem"], state.entities.logs.length ? state.entities.logs.slice().reverse().slice(0, 40).map((log) => `
        <tr>
          <td>${new Date(log.timestamp).toLocaleString("pt-BR")}</td>
          <td>${escapeHtml(log.nivel)}</td>
          <td>${escapeHtml(log.modulo)}</td>
          <td>${escapeHtml(log.acao)}</td>
          <td>${escapeHtml(log.mensagem)}</td>
        </tr>
      `) : ['<tr><td colspan="5">Sem logs registrados.</td></tr>'])}
    </section>
  `;
}

function renderConfig(state) {
  const syncSnapshot = persistence.getSyncSnapshot();
  const meta = syncSnapshot.meta || {};
  const statusText = syncSnapshot.statusText || "Sem sincronizacao online nesta sessao.";
  const config = syncSnapshot.config || {};
  return `
    <section class="panel">
      <h3>Configuracoes</h3>
      <div class="grid two">
        <div class="sticky-note"><strong>Persistencia</strong><p>Schema ${state.schemaVersion}. Ultimo salvamento: ${state.audit.lastSavedAt ? new Date(state.audit.lastSavedAt).toLocaleString("pt-BR") : "-"}</p></div>
        <div class="sticky-note"><strong>Regra de operacao</strong><p>Fonte unica de verdade, baseline imutavel, sem fallback silencioso.</p></div>
      </div>
      <div class="panel" style="margin-top:14px">
        <h4>Painel tecnico online (fase 1)</h4>
        <div class="toolbar">
          <button class="btn-secondary" data-action="connect-online">Conectar Online</button>
          <button class="btn-secondary" data-action="list-online-obras">Listar Obras Online</button>
          <button class="btn-secondary" data-action="load-online-obra">Carregar Obra Online</button>
          <button class="btn-secondary" data-action="save-online-obra">Salvar Obra Online</button>
          <button class="btn-secondary" data-action="status-sync">Status Sync</button>
        </div>
        <div class="sticky-note" style="margin-top:10px">
          <strong>Status online</strong>
          <p>${escapeHtml(statusText)}</p>
          <p class="muted">enabled=${String(config.enabled)} | obraId=${escapeHtml(meta.obraId || config.defaultObraId || "-")} | revision=${Number(meta.revision || 0)} | pending=${String(Boolean(meta.pendingOnlineSave))} | conflict=${String(Boolean(meta.conflict))}</p>
          <p class="muted">updatedAt=${escapeHtml(meta.updatedAt || "-")} | lastSyncAt=${escapeHtml(meta.lastSyncAt || "-")}</p>
        </div>
      </div>
      <div class="toolbar" style="margin-top:14px"><button class="btn-danger" data-action="reset-state">Restaurar dataset inicial</button></div>
    </section>
  `;
}

function seedEntity(kind, state) {
  const stamp = Date.now();
  switch (kind) {
    case "eap": return { entityKey: "eaps", payload: { id: `eap-${stamp}`, obraId: state.obra.id, codigoEAP: `${state.entities.eaps.length + 1}`, nome: "Nova etapa", nivel: 1, parentId: null, ordem: state.entities.eaps.length + 1, ativo: true } };
    case "location": return { entityKey: "locations", payload: { id: `loc-${stamp}`, obraId: state.obra.id, tipoLocal: "pavimento", nome: `Pavimento ${state.entities.locations.length}`, codigo: `P${state.entities.locations.length}`, ordem: state.entities.locations.length, parentId: "loc-obra", torre: "T1", bloco: "A", pavimento: state.entities.locations.length, unidade: null, area: "Tipo", metadados: {} } };
    case "service": return { entityKey: "services", payload: { id: `srv-${stamp}`, obraId: state.obra.id, codigoServico: `SRV-${state.entities.services.length + 1}`, nome: "Novo servico", unidadeMedicao: "m2", categoria: "Geral", disciplina: "Civil", permiteParalelo: true, exigeEquipe: true, exigeQuantidade: true, exigeProdutividade: true, corVisual: "#607284", ordem: state.entities.services.length + 1, ativo: true } };
    case "quantity": return { entityKey: "quantities", payload: { id: `qty-${stamp}`, obraId: state.obra.id, serviceId: state.entities.services[0]?.id ?? "", locationId: state.entities.locations[1]?.id ?? "", quantidade: 100, unidade: "m2", fatorComplexidade: 1, observacoes: "" } };
    case "team": return { entityKey: "teams", payload: { id: `team-${stamp}`, obraId: state.obra.id, nome: "Nova equipe", codigo: `EQ-${state.entities.teams.length + 1}`, tipoEquipe: "Geral", serviceIdsPermitidos: state.entities.services[0] ? [state.entities.services[0].id] : [], produtividadeBase: 50, unidadeProdutividade: "m2/dia", custoDia: 2500, capacidadeSimultanea: 1, ativa: true, calendarioId: state.obra.calendarioPadraoId } };
    case "worker": return { entityKey: "workers", payload: { id: `wrk-${stamp}`, obraId: state.obra.id, nome: "Novo funcionario", matricula: `${stamp}`, funcao: "Operador", categoria: "Geral", produtivo: true, tipoMaoDeObra: "Direta", salarioCarteira: 2500, encargosPercentual: 0.7, custoMensalTotal: 4250, tetoSemProducao: 4, equipeId: state.entities.teams[0]?.id ?? null, frenteServicoAtual: state.entities.services[0]?.id ?? null, status: "ATIVO" } };
    case "calendar": return { entityKey: "calendars", payload: { id: `cal-${stamp}`, obraId: state.obra.id, nome: "Novo calendario", diasUteisSemana: [1, 2, 3, 4, 5], feriadosFixos: [], feriadosMoveis: [], excecoes: [], jornadaHorasDia: 8 } };
    case "dependency": return { entityKey: "dependencies", payload: { id: `dep-${stamp}`, obraId: state.obra.id, predecessorServiceId: state.entities.services[0]?.id ?? "", successorServiceId: state.entities.services[1]?.id ?? "", tipoLigacao: "FS", lagDias: 0, escopoAplicacao: "MESMO_LOCAL", obrigatoria: true } };
    default: return null;
  }
}

function renderApp(root, store) {
  const state = store.getState();
  const view = state.ui.activeView;
  const servicesMap = new Map(state.entities.services.map((item) => [item.id, item]));
  const locationsMap = new Map(state.entities.locations.map((item) => [item.id, item]));
  const views = {
    dashboard: renderDashboard(state),
    obra: renderObra(state),
    eap: renderSimpleEntity(state, "eaps", "Estrutura Analitica do Projeto", ["Codigo", "Nome", "Nivel", "Pai", "Ordem"], (item) => `<td>${item.codigoEAP}</td><td>${escapeHtml(item.nome)}</td><td>${item.nivel}</td><td>${item.parentId ?? "-"}</td><td>${item.ordem}</td>`, "eap"),
    locais: renderSimpleEntity(state, "locations", "Locais", ["Codigo", "Nome", "Tipo", "Pai", "Ordem"], (item) => `<td>${item.codigo}</td><td>${escapeHtml(item.nome)}</td><td>${item.tipoLocal}</td><td>${item.parentId ?? "-"}</td><td>${item.ordem}</td>`, "location"),
    servicos: renderSimpleEntity(state, "services", "Servicos", ["Codigo", "Nome", "Unidade", "Disciplina", "Equipe obrigatoria"], (item) => `<td>${item.codigoServico}</td><td>${escapeHtml(item.nome)}</td><td>${item.unidadeMedicao}</td><td>${item.disciplina}</td><td>${item.exigeEquipe ? "Sim" : "Nao"}</td>`, "service"),
    quantidades: renderSimpleEntity(state, "quantities", "Quantidades por local", ["Servico", "Local", "Quantidade", "Unidade", "Complexidade"], (item) => `<td>${escapeHtml(servicesMap.get(item.serviceId)?.nome ?? item.serviceId)}</td><td>${escapeHtml(locationsMap.get(item.locationId)?.nome ?? item.locationId)}</td><td>${formatNumber(item.quantidade)}</td><td>${item.unidade}</td><td>${formatNumber(item.fatorComplexidade)}</td>`, "quantity"),
    equipes: renderSimpleEntity(state, "teams", "Equipes", ["Codigo", "Nome", "Produtividade", "Custo/dia", "Capacidade"], (item) => `<td>${item.codigo}</td><td>${escapeHtml(item.nome)}</td><td>${formatNumber(item.produtividadeBase)} ${item.unidadeProdutividade}</td><td>R$ ${formatNumber(item.custoDia)}</td><td>${item.capacidadeSimultanea}</td>`, "team"),
    funcionarios: renderSimpleEntity(state, "workers", "Funcionarios", ["Nome", "Funcao", "Equipe", "Produtivo", "Custo mensal"], (item) => `<td>${escapeHtml(item.nome)}</td><td>${escapeHtml(item.funcao)}</td><td>${escapeHtml(findTeam(state, item.equipeId)?.nome ?? "-")}</td><td>${item.produtivo ? "Sim" : "Nao"}</td><td>R$ ${formatNumber(item.custoMensalTotal)}</td>`, "worker"),
    calendarios: renderSimpleEntity(state, "calendars", "Calendarios", ["Nome", "Dias uteis", "Feriados fixos", "Jornada"], (item) => `<td>${escapeHtml(item.nome)}</td><td>${item.diasUteisSemana.join(", ")}</td><td>${item.feriadosFixos.join(", ") || "-"}</td><td>${item.jornadaHorasDia}h</td>`, "calendar"),
    predecessoras: renderSimpleEntity(state, "dependencies", "Predecessoras", ["Predecessora", "Sucessora", "Tipo", "Lag", "Escopo"], (item) => `<td>${escapeHtml(findService(state, item.predecessorServiceId)?.nome ?? "-")}</td><td>${escapeHtml(findService(state, item.successorServiceId)?.nome ?? "-")}</td><td>${item.tipoLigacao}</td><td>${item.lagDias}</td><td>${item.escopoAplicacao}</td>`, "dependency"),
    planejamento: renderPlanning(state),
    baseline: renderBaseline(state),
    acompanhamento: renderTracking(state),
    curtoPrazo: renderShortTerm(state),
    gantt: renderGantt(state),
    lob: renderLob(state),
    relatorios: renderReports(state),
    auditoria: renderAudit(state),
    configuracoes: renderConfig(state),
  };
  root.innerHTML = `
    <div class="layout">
      ${renderSidebar(view)}
      <main class="main">
        <header class="header">
          <div><h2>${NAV_ITEMS.find((item) => item.key === view)?.label ?? "PLANNUS"}</h2><div class="muted">${escapeHtml(state.obra.nome)} | Referencia ${formatDate(state.tracking.referenceDate)}</div></div>
          <div class="header-actions"><button class="btn-secondary" data-action="run-engine">Recalcular</button><button class="btn-secondary" data-action="create-baseline">Congelar baseline</button><button class="btn-secondary" data-action="open-online-config">Online Sync</button></div>
        </header>
        <section class="content">${renderNotices(state.ui.notices)}${views[view]}</section>
      </main>
    </div>
  `;
  bindEvents(root, store);
}

function bindEvents(root, store) {
  root.querySelectorAll("[data-action='change-view']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_VIEW", view: button.dataset.view })));
  root.querySelectorAll("[data-action='dismiss-notice']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "DISMISS_NOTICE", id: button.dataset.id })));
  root.querySelectorAll("[data-filter]").forEach((input) => input.addEventListener("change", () => store.dispatch({ type: "SET_FILTER", key: input.dataset.filter, value: Number(input.value) || input.value })));
  root.querySelectorAll("[data-action='delete-entity']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "DELETE_ENTITY", entityKey: button.dataset.entity, id: button.dataset.id })));
  root.querySelectorAll("[data-action='seed-entity']").forEach((button) => button.addEventListener("click", () => { const seed = seedEntity(button.dataset.kind, store.getState()); if (seed) store.dispatch({ type: "UPSERT_ENTITY", ...seed }); }));
  root.querySelectorAll("[data-action='run-engine']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "RUN_ENGINE" })));
  root.querySelectorAll("[data-action='create-baseline']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "CREATE_BASELINE", name: `Baseline ${store.getState().entities.baselines.length + 1}`, createdBy: "Usuario local" })));
  root.querySelectorAll("[data-action='set-scale']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "ganttScale", value: button.dataset.value })));
  root.querySelectorAll("[data-action='set-group']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "timelineGroup", value: button.dataset.value })));
  root.querySelectorAll("[data-action='set-tracking-mode']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "acompanhamentoMode", value: button.dataset.value })));
  root.querySelectorAll("[data-action='pick-service']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "serviceId", value: button.dataset.id })));
  root.querySelectorAll("[data-action='pick-location']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "locationId", value: button.dataset.id })));
  root.querySelectorAll("[data-action='open-online-config']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_VIEW", view: "configuracoes" })));
  root.querySelectorAll("[data-action='quick-filter']").forEach((button) => button.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: button.dataset.key, value: button.dataset.value })));
  root.querySelectorAll("[data-action='select-task']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    next.ui.selectedTaskId = button.dataset.id;
    if (button.dataset.serviceId) next.ui.filters.serviceId = button.dataset.serviceId;
    if (button.dataset.locationId) next.ui.filters.locationId = button.dataset.locationId;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  root.querySelectorAll(".ac-block").forEach((block) => {
    block.addEventListener("dblclick", () => {
      const next = structuredClone(store.getState());
      next.ui.selectedTaskId = block.dataset.id;
      next.ui.trackingEditorTaskId = block.dataset.id;
      next.ui.trackingContextMenu = null;
      store.dispatch({ type: "IMPORT_STATE", payload: next });
    });
    block.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const next = structuredClone(store.getState());
      next.ui.selectedTaskId = block.dataset.id;
      next.ui.trackingContextMenu = { taskId: block.dataset.id, x: event.clientX, y: event.clientY };
      store.dispatch({ type: "IMPORT_STATE", payload: next });
    });
  });
  const searchInput = root.querySelector("[data-action='search-tracking']");
  if (searchInput) searchInput.addEventListener("input", () => store.dispatch({ type: "SET_FILTER", key: "search", value: searchInput.value }));
  const todayButton = root.querySelector("[data-action='set-today']");
  if (todayButton) todayButton.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    next.tracking.referenceDate = new Date().toISOString().slice(0, 10);
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  });
  const densityButton = root.querySelector("[data-action='toggle-density']");
  if (densityButton) densityButton.addEventListener("click", () => store.dispatch({ type: "SET_FILTER", key: "density", value: store.getState().ui.filters.density === "summary" ? "detailed" : "summary" }));
  const trackingExportButton = root.querySelector("[data-action='export-tracking-csv']");
  if (trackingExportButton) trackingExportButton.addEventListener("click", () => {
    const state = store.getState();
    const tasks = visibleAcompanhamentoTasks(state);
    exportCsv("plannus-acompanhamento-resumo.csv", ["servico", "local", "equipe", "status", "desvio", "inicia_em_2_dias", "observacao"], tasks.map((task) => [findService(state, task.serviceId)?.nome ?? "", findLocation(state, task.locationId)?.nome ?? "", findTeam(state, task.equipeId)?.nome ?? "", task.status, taskDeviation(task, state.tracking.referenceDate), startsWithinTwoDays(task, state.tracking.referenceDate) ? "Sim" : "Nao", task.observacoes ?? ""]));
  });
  const ganttButton = root.querySelector("[data-action='open-gantt']");
  if (ganttButton) ganttButton.addEventListener("click", () => store.dispatch({ type: "SET_VIEW", view: "gantt" }));
  const lobButton = root.querySelector("[data-action='open-lob']");
  if (lobButton) lobButton.addEventListener("click", () => store.dispatch({ type: "SET_VIEW", view: "lob" }));
  const focusRegisterButton = root.querySelector("[data-action='focus-register']");
  if (focusRegisterButton) focusRegisterButton.addEventListener("click", () => document.getElementById("tracking-register-box")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  root.querySelectorAll("[data-action='close-context-menu']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    next.ui.trackingContextMenu = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  root.querySelectorAll("[data-action='context-open-editor']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    next.ui.trackingEditorTaskId = next.ui.trackingContextMenu?.taskId ?? next.ui.selectedTaskId;
    next.ui.trackingContextMenu = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  root.querySelectorAll("[data-action='context-mark-done']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const task = next.entities.tasks.find((item) => item.id === next.ui.trackingContextMenu?.taskId);
    if (!task) return;
    task.percentComplete = 100;
    task.actualStartISO = task.actualStartISO || next.tracking.referenceDate;
    task.actualEndISO = next.tracking.referenceDate;
    task.status = STATUS.CONCLUIDO;
    task.observacoes = `${task.observacoes ? `${task.observacoes} | ` : ""}Marcada como executada na tela de acompanhamento`;
    next.ui.trackingContextMenu = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
    store.dispatch({ type: "RUN_ENGINE" });
  }));
  root.querySelectorAll("[data-action='context-block']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const task = next.entities.tasks.find((item) => item.id === next.ui.trackingContextMenu?.taskId);
    if (!task) return;
    task.status = STATUS.BLOQUEADO;
    task.bloqueios = [...new Set([...(task.bloqueios || []), "Bloqueio operacional registrado no acompanhamento"])];
    next.ui.trackingContextMenu = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  root.querySelectorAll("[data-action='context-delay']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const task = next.entities.tasks.find((item) => item.id === next.ui.trackingContextMenu?.taskId);
    if (!task) return;
    task.plannedStartISO = addIsoDays(task.plannedStartISO, 1);
    task.plannedEndISO = addIsoDays(task.plannedEndISO, 1);
    task.status = STATUS.ATRASADO;
    task.observacoes = `${task.observacoes ? `${task.observacoes} | ` : ""}Atraso inserido manualmente`;
    next.ui.trackingContextMenu = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  root.querySelectorAll("[data-action='close-tracking-editor']").forEach((button) => button.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    next.ui.trackingEditorTaskId = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
  }));
  const saveTrackingEditorButton = root.querySelector("[data-action='save-tracking-editor']");
  if (saveTrackingEditorButton) saveTrackingEditorButton.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const task = next.entities.tasks.find((item) => item.id === next.ui.trackingEditorTaskId);
    if (!task) return;
    const nextStart = root.querySelector("#tracking-editor-start").value;
    const nextEnd = root.querySelector("#tracking-editor-end").value;
    if (nextEnd < nextStart) { alert("Termino planejado nao pode ficar antes do inicio."); return; }
    task.locationId = root.querySelector("#tracking-editor-location").value;
    task.status = root.querySelector("#tracking-editor-status").value;
    task.plannedStartISO = nextStart;
    task.plannedEndISO = nextEnd;
    task.duracaoPlanejadaDias = Number(root.querySelector("#tracking-editor-duration").value) || task.duracaoPlanejadaDias;
    task.equipeId = root.querySelector("#tracking-editor-team").value || null;
    task.actualStartISO = root.querySelector("#tracking-editor-real-start").value || null;
    task.actualEndISO = root.querySelector("#tracking-editor-real-end").value || null;
    task.observacoes = root.querySelector("#tracking-editor-note").value;
    next.ui.trackingEditorTaskId = null;
    store.dispatch({ type: "IMPORT_STATE", payload: next });
    store.dispatch({ type: "RUN_ENGINE" });
  });
  const exportJsonButton = root.querySelector("[data-action='export-json']");
  if (exportJsonButton) exportJsonButton.addEventListener("click", () => exportState(store.getState()));
  const exportTasksButton = root.querySelector("[data-action='export-tasks-csv']");
  if (exportTasksButton) exportTasksButton.addEventListener("click", () => exportCsv("plannus-tasks.csv", ["id", "serviceId", "locationId", "plannedStartISO", "plannedEndISO", "status", "percentComplete"], store.getState().entities.tasks.map((task) => [task.id, task.serviceId, task.locationId, task.plannedStartISO, task.plannedEndISO, task.status, task.percentComplete])));
  const exportMeasurementsButton = root.querySelector("[data-action='export-measurements-csv']");
  if (exportMeasurementsButton) exportMeasurementsButton.addEventListener("click", () => exportCsv("plannus-acompanhamento.csv", ["id", "taskId", "dataReferencia", "quantidadeExecutada", "percentualExecutado"], store.getState().entities.measurements.map((item) => [item.id, item.taskId, item.dataReferencia, item.quantidadeExecutada, item.percentualExecutado])));
  const saveMeasurementButton = root.querySelector("[data-action='save-measurement']");
  if (saveMeasurementButton) saveMeasurementButton.addEventListener("click", () => {
    const percent = Number(root.querySelector("#measurement-percent").value);
    const quantity = Number(root.querySelector("#measurement-quantity").value);
    if (percent < 0 || percent > 100 || quantity < 0) { alert("Medicao invalida. Percentual deve ficar entre 0 e 100 e quantidade nao pode ser negativa."); return; }
    store.dispatch({ type: "RECORD_MEASUREMENT", payload: { id: `med-${Date.now()}`, obraId: store.getState().obra.id, taskId: root.querySelector("#measurement-task").value, dataReferencia: root.querySelector("#measurement-date").value, quantidadeExecutada: quantity, percentualExecutado: percent, statusApontado: percent >= 100 ? STATUS.CONCLUIDO : STATUS.EM_ANDAMENTO, equipeRealId: null, observacao: root.querySelector("#measurement-note").value, origem: "manual" } });
  });
  const saveObraButton = root.querySelector("[data-action='save-obra']");
  if (saveObraButton) saveObraButton.addEventListener("click", () => {
    const current = structuredClone(store.getState());
    root.querySelectorAll("[data-form^='obra.']").forEach((input) => { const field = input.dataset.form.split(".")[1]; current.obra[field] = input.type === "number" ? Number(input.value) : input.value; });
    store.dispatch({ type: "IMPORT_STATE", payload: current });
  });
  const importMspButton = root.querySelector("[data-action='import-msp']");
  if (importMspButton) importMspButton.addEventListener("click", async () => {
    const file = root.querySelector("#msp-file")?.files?.[0];
    const text = file ? await file.text() : String(root.querySelector("#msp-text")?.value || "");
    if (!text.trim()) { alert("Informe um arquivo ou cole o CSV/TSV do MSP."); return; }
    try { store.dispatch({ type: "IMPORT_MSP", rawText: text, serviceLevel: Number(root.querySelector("#msp-service-level").value), locationLevel: Number(root.querySelector("#msp-location-level").value) }); }
    catch (error) { alert(`Falha na importacao MSP: ${error.message}`); }
  });
  const saveConfigButton = root.querySelector("[data-action='save-config']");
  if (saveConfigButton) saveConfigButton.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const serviceId = next.ui.filters.serviceId !== "ALL" ? next.ui.filters.serviceId : next.entities.services[0]?.id;
    const locationId = next.ui.filters.locationId !== "ALL" ? next.ui.filters.locationId : next.entities.locations.find((item) => item.tipoLocal !== "obra")?.id;
    const ruleIndex = next.entities.teamRules.findIndex((item) => item.serviceId === serviceId);
    const teamIndex = next.entities.teams.findIndex((item) => item.serviceIdsPermitidos.includes(serviceId));
    const taskIndex = next.entities.tasks.findIndex((item) => item.serviceId === serviceId && item.locationId === locationId);
    if (ruleIndex >= 0) {
      next.entities.teamRules[ruleIndex].defasagemInicial = Number(root.querySelector("#cfg-team-lag").value);
      next.entities.teamRules[ruleIndex].numeroEquipes = Number(root.querySelector("#cfg-team-count").value);
    }
    if (teamIndex >= 0) {
      next.entities.teams[teamIndex].produtividadeBase = Number(root.querySelector("#cfg-team-productivity").value);
    }
    if (taskIndex >= 0) {
      next.entities.tasks[taskIndex].duracaoPlanejadaDias = Number(root.querySelector("#cfg-task-duration").value);
    }
    store.dispatch({ type: "IMPORT_STATE", payload: next });
    store.dispatch({ type: "RUN_ENGINE" });
  });
  const savePredecessorButton = root.querySelector("[data-action='save-predecessor']");
  if (savePredecessorButton) savePredecessorButton.addEventListener("click", () => {
    const next = structuredClone(store.getState());
    const serviceId = next.ui.filters.serviceId !== "ALL" ? next.ui.filters.serviceId : next.entities.services[0]?.id;
    const depIndex = next.entities.dependencies.findIndex((item) => item.successorServiceId === serviceId);
    const payload = {
      id: depIndex >= 0 ? next.entities.dependencies[depIndex].id : `dep-${Date.now()}`,
      obraId: next.obra.id,
      predecessorServiceId: root.querySelector("#cfg-predecessor-service").value,
      successorServiceId: serviceId,
      tipoLigacao: root.querySelector("#cfg-predecessor-type").value,
      lagDias: Number(root.querySelector("#cfg-predecessor-lag").value),
      escopoAplicacao: "MESMO_LOCAL",
      obrigatoria: true,
    };
    if (depIndex >= 0) next.entities.dependencies[depIndex] = payload; else next.entities.dependencies.push(payload);
    store.dispatch({ type: "IMPORT_STATE", payload: next });
    store.dispatch({ type: "RUN_ENGINE" });
  });
  const connectOnlineButton = root.querySelector("[data-action='connect-online']");
  if (connectOnlineButton) connectOnlineButton.addEventListener("click", async () => {
    const result = await persistence.connectOnline();
    if (!result.ok) alert(`Falha ao conectar online: ${result.erro}`);
    store.dispatch({ type: "IMPORT_STATE", payload: structuredClone(store.getState()) });
  });
  const listOnlineObrasButton = root.querySelector("[data-action='list-online-obras']");
  if (listOnlineObrasButton) listOnlineObrasButton.addEventListener("click", async () => {
    const result = await persistence.listOnlineObras();
    if (!result.ok) {
      alert(`Falha ao listar obras online: ${result.erro}`);
      return;
    }
    console.log("[PLANNUS_ONLINE] Obras online:", result.data);
    alert("Obras online listadas no console tecnico.");
    store.dispatch({ type: "IMPORT_STATE", payload: structuredClone(store.getState()) });
  });
  const loadOnlineObraButton = root.querySelector("[data-action='load-online-obra']");
  if (loadOnlineObraButton) loadOnlineObraButton.addEventListener("click", async () => {
    const obraId = persistence.config.defaultObraId;
    const result = await persistence.loadOnline(obraId);
    if (!result.ok) {
      alert(`Falha ao carregar obra online: ${result.erro}`);
      return;
    }
    store.dispatch({ type: "IMPORT_STATE", payload: result.state });
    alert(`Obra ${obraId} carregada online. Revision: ${result.meta.revision}.`);
  });
  const saveOnlineObraButton = root.querySelector("[data-action='save-online-obra']");
  if (saveOnlineObraButton) saveOnlineObraButton.addEventListener("click", async () => {
    const obraId = persistence.config.defaultObraId;
    const result = await persistence.saveHybrid(store.getState(), obraId);
    if (result.ok) {
      alert(`Salvo online com sucesso. Revision nova: ${result.meta.revision}.`);
    } else if (result.conflito) {
      alert(`Conflito 409 detectado. Revision enviada ${result.meta.revisionEnviada}, banco ${result.meta.revisionConflitoBanco}.`);
    } else {
      alert(`Salvo localmente com pendencia online: ${result.erro}`);
    }
    store.dispatch({ type: "IMPORT_STATE", payload: structuredClone(store.getState()) });
  });
  const statusSyncButton = root.querySelector("[data-action='status-sync']");
  if (statusSyncButton) statusSyncButton.addEventListener("click", () => {
    const snap = persistence.getSyncSnapshot();
    console.log("[PLANNUS_SYNC] Snapshot:", snap);
    alert("Status de sync atualizado e enviado para o console.");
    store.dispatch({ type: "IMPORT_STATE", payload: structuredClone(store.getState()) });
  });
  const resetButton = root.querySelector("[data-action='reset-state']");
  if (resetButton) resetButton.addEventListener("click", () => { if (confirm("Restaurar o dataset inicial?")) store.dispatch({ type: "RESET_STATE" }); });
}


const persistence = createPlannusPersistence();
const store = createStore();
const root = document.getElementById("app");

function paint() {
  renderApp(root, store);
}

store.subscribe(() => paint());
paint();

})();
