import { DEFAULT_UI, ENTITY_KEYS, TECHNICAL_MODULES } from "../domain/contracts.js";
import { calculateKpis, createBaselineSnapshot, runPlanningEngine } from "../domain/engine.js";
import { loadState, resetState, saveState } from "../repository/local-repository.js";
import { importMspProject } from "../services/msp-import.js";
import { validateState } from "../domain/validators.js";

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

export function createStore() {
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
