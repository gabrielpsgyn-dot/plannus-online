import { LINK_TYPES, STATUS, TECHNICAL_MODULES } from "./contracts.js";

function issue(code, message, recordId, severity = "error") {
  return { code, message, recordId, severity };
}

export function validateState(state) {
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
