import { STATUS, TECHNICAL_MODULES } from "./contracts.js";
import { addWorkingDays, nextWorkingDate } from "./calendar.js";
import { validateState } from "./validators.js";
import { diffDays, formatDate, maxISODate } from "../services/date-utils.js";

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

export function runPlanningEngine(state) {
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

export function calculateKpis(state) {
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

export function createBaselineSnapshot(state, name = "Baseline 1", createdBy = "PLANNUS") {
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
