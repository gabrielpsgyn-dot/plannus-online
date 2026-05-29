export const APP_KEY = "plannus.app.state";
export const APP_VERSION = "1.0.0";
export const SCHEMA_VERSION = 1;
export const STATUS = Object.freeze({
  NAO_INICIADO: "NAO_INICIADO",
  LIBERADO: "LIBERADO",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  PARALISADO: "PARALISADO",
  CONCLUIDO: "CONCLUIDO",
  ATRASADO: "ATRASADO",
  BLOQUEADO: "BLOQUEADO",
  INCONSISTENTE: "INCONSISTENTE",
});
export const NAV_ITEMS = [
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
export const DEFAULT_UI = Object.freeze({
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
export const ENTITY_KEYS = Object.freeze(["obras", "eaps", "locations", "services", "quantities", "teams", "workers", "calendars", "dependencies", "teamRules", "tasks", "measurements", "baselines", "logs"]);
export const TECHNICAL_MODULES = Object.freeze({
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
export const LINK_TYPES = ["FS", "SS", "FF", "SF"];
