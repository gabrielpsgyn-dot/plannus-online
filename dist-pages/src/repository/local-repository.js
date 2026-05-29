import { APP_KEY, APP_VERSION, SCHEMA_VERSION, TECHNICAL_MODULES } from "../domain/contracts.js";
import { createSampleState } from "../domain/sample-data.js";

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

export function loadState() {
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

export function saveState(state) {
  const next = structuredClone(state);
  next.version = APP_VERSION;
  next.schemaVersion = SCHEMA_VERSION;
  next.audit.lastSavedAt = new Date().toISOString();
  localStorage.setItem(APP_KEY, JSON.stringify(next));
}

export function resetState() {
  const sample = createSampleState();
  sample.entities.logs.push(log("RESET", "Estado restaurado para o dataset inicial.", { obraId: sample.obra.id }));
  saveState(sample);
  return sample;
}
