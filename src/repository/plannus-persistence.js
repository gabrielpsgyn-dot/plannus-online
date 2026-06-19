import { APP_KEY } from "../domain/contracts.js";
import { loadState, saveState } from "./local-repository.js";
import {
  getMe,
  deleteOnlineObra as deleteOnlineObraRequest,
  grantObraPermission,
  createOnlineObra as createOnlineObraRequest,
  deleteEapTemplate as deleteEapTemplateRequest,
  listObraPermissions,
  listOnlineObras,
  loadEapTemplate as loadEapTemplateRequest,
  listEapTemplates as listEapTemplatesRequest,
  listServices as listServicesRequest,
  listUsers,
  loadOnlineObra,
  PLANNUS_ONLINE_CONFIG,
  revokeObraPermission,
  saveOnlineObra,
  saveEapTemplate as saveEapTemplateRequest,
  saveEapTemplates as saveEapTemplatesRequest,
  saveServicesCatalog as saveServicesCatalogRequest,
  upsertUser,
} from "./plannus-online-repository.js";

const ONLINE_META_KEY = "plannus.online.meta";
const ONLINE_STATUS_KEY = "plannus.online.status";
const LOCAL_OBRAS_KEY = "plannus.local.obras";
const LOCAL_OBRA_STATE_PREFIX = "plannus.local.obra.state.";

function logRepo(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_REPOSITORY] ${message}`);
  else console.log(`[PLANNUS_REPOSITORY] ${message}`, payload);
}

function logSync(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_SYNC] ${message}`);
  else console.log(`[PLANNUS_SYNC] ${message}`, payload);
}

function logObras(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_OBRAS] ${message}`);
  else console.log(`[PLANNUS_OBRAS] ${message}`, payload);
}
function logUsers(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_USERS] ${message}`);
  else console.log(`[PLANNUS_USERS] ${message}`, payload);
}
function logPermissions(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_PERMISSIONS] ${message}`);
  else console.log(`[PLANNUS_PERMISSIONS] ${message}`, payload);
}
function logSave(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_SAVE] ${message}`);
  else console.log(`[PLANNUS_SAVE] ${message}`, payload);
}

function nowIso() {
  return new Date().toISOString();
}

function loadMeta() {
  try {
    return JSON.parse(localStorage.getItem(ONLINE_META_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

function saveMeta(meta) {
  localStorage.setItem(ONLINE_META_KEY, JSON.stringify(meta));
}

function setStatus(text) {
  localStorage.setItem(ONLINE_STATUS_KEY, text || "");
}

function getStatus() {
  return localStorage.getItem(ONLINE_STATUS_KEY) || "";
}

function resolveRemoteState(payload) {
  if (payload?.state) return payload.state;
  if (payload?.obra?.state_json) return payload.obra.state_json;
  if (payload?.obra?.state) return payload.obra.state;
  return null;
}

function resolveRemoteRevision(payload) {
  return Number(payload?.revision ?? payload?.obra?.revision ?? 0) || 0;
}

function resolveRemoteUpdatedAt(payload) {
  return payload?.updated_at ?? payload?.obra?.updated_at ?? null;
}

function resolveRemoteObraNome(payload) {
  return payload?.obra_nome ?? payload?.obra?.nome ?? null;
}

function stableStringifyForSave(value) {
  const seen = new WeakSet();
  const walk = (v) => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) return "[Circular]";
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    const out = {};
    Object.keys(v).sort().forEach((k) => {
      const child = v[k];
      if (child === undefined) return;
      out[k] = walk(child);
    });
    return out;
  };
  try {
    return JSON.stringify(walk(value));
  } catch (error) {
    return JSON.stringify(String(error?.message || error));
  }
}

function buildOnlineSaveFingerprint(state) {
  if (!state || typeof state !== "object") return "";
  const clone = structuredClone(state);
  delete clone.ui;
  delete clone.dashboard;
  delete clone.__plannusAux;
  delete clone.__plannusSaveFingerprint;
  if (clone.planning && typeof clone.planning === "object") {
    delete clone.planning.lastEngineResult;
  }
  return stableStringifyForSave(clone);
}

function backupCurrentLocalState() {
  const raw = localStorage.getItem(APP_KEY);
  if (!raw) return null;
  const backupKey = `plannus.backup.before_online_load.${Date.now()}`;
  localStorage.setItem(backupKey, raw);
  return backupKey;
}

function extractObrasList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.obras)) return payload.obras;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function getLocalObraStateKey(obraId) {
  const id = String(obraId || "").trim();
  return `${LOCAL_OBRA_STATE_PREFIX}${id || "local"}`;
}

function readLocalObrasIndex() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_OBRAS_KEY) || "{}");
  } catch (_) {
    return {};
  }
}

function writeLocalObrasIndex(index) {
  try {
    localStorage.setItem(LOCAL_OBRAS_KEY, JSON.stringify(index || {}));
    return true;
  } catch (_) {
    return false;
  }
}

export function createPlannusPersistence() {
  return {
    config: PLANNUS_ONLINE_CONFIG,
    hasLocalState() {
      return Boolean(localStorage.getItem(APP_KEY));
    },
    loadLocal() {
      return loadState();
    },
    saveLocal(state) {
      saveState(state);
      return { ok: true };
    },
    getCurrentConsolidatedPlannusState(currentState) {
      const source = currentState ? structuredClone(currentState) : structuredClone(loadState());
      if (!source || typeof source !== "object") return {};
      // Remove estado puramente visual/transiente (modais, filtros, hover, seleção, etc).
      delete source.ui;
      delete source.dashboard;
      if (source.planning && typeof source.planning === "object") {
        delete source.planning.lastEngineResult;
      }
      Object.defineProperty(source, "__plannusSaveFingerprint", {
        value: buildOnlineSaveFingerprint(source),
        enumerable: false,
        configurable: true,
      });
      logSave("State consolidado capturado para persistencia online.", {
        keys: Object.keys(source),
        hasObra: Boolean(source.obra),
        hasEntities: Boolean(source.entities),
      });
      return source;
    },
    getSyncSnapshot() {
      const meta = loadMeta();
      return { meta, statusText: getStatus(), config: PLANNUS_ONLINE_CONFIG };
    },
    getSelectedObraMeta() {
      return loadMeta();
    },
    async listOnlineObras() {
      logSync("Listando obras online.");
      const result = await listOnlineObras();
      if (!result.ok) return result;
      const obras = extractObrasList(result.data);
      logObras("Lista recebida.", { total: obras.length });
      return { ...result, obras };
    },
    async listServicesCatalog() {
      const result = await listServicesRequest();
      if (result.ok) logSync("Catalogo de servicos carregado.");
      return result;
    },
    async listEapTemplates() {
      const result = await listEapTemplatesRequest();
      if (result.ok) logSync("Catalogo de EAP carregado.");
      return result;
    },
    async loadEapTemplate(key) {
      const result = await loadEapTemplateRequest(key);
      if (result.ok) logSync("EAP carregada.", { key });
      return result;
    },
    async saveEapTemplates(payload) {
      const result = await saveEapTemplatesRequest(payload);
      if (result.ok) logSync("Catalogo de EAP salvo.", { total: Array.isArray(payload) ? payload.length : 0 });
      return result;
    },
    async saveEapTemplate(key, payload) {
      const result = await saveEapTemplateRequest(key, payload);
      if (result.ok) logSync("EAP salva.", { key });
      return result;
    },
    async deleteEapTemplate(key) {
      const result = await deleteEapTemplateRequest(key);
      if (result.ok) logSync("EAP excluida.", { key });
      return result;
    },
    async saveServicesCatalog(payload) {
      const result = await saveServicesCatalogRequest(payload);
      if (result.ok) logSync("Catalogo de servicos salvo.", { total: Array.isArray(payload) ? payload.length : 0 });
      return result;
    },
    async createOnlineObra(payload) {
      const result = await createOnlineObraRequest(payload);
      if (result.ok) logObras("Obra criada online.", result.data?.obra || payload);
      return result;
    },
    async deleteOnlineObra(obraId) {
      const result = await deleteOnlineObraRequest(obraId);
      if (result.ok) logObras("Obra excluida online.", { obraId });
      return result;
    },
    async getMe() {
      const result = await getMe();
      if (result.ok) logUsers("Usuario atual carregado.", result.data?.usuario || result.data);
      return result;
    },
    async listUsers() {
      const result = await listUsers();
      if (result.ok) logUsers("Lista de usuarios carregada.");
      return result;
    },
    async upsertUser(payload) {
      const result = await upsertUser(payload);
      if (result.ok) logUsers("Usuario salvo.", payload);
      return result;
    },
    async listObraPermissions(obraId) {
      const result = await listObraPermissions(obraId);
      if (result.ok) logPermissions("Permissoes carregadas.", { obraId });
      return result;
    },
    async grantObraPermission(obraId, payload) {
      const result = await grantObraPermission(obraId, payload);
      if (result.ok) logPermissions("Permissao concedida/atualizada.", { obraId, payload });
      return result;
    },
    async revokeObraPermission(obraId, email) {
      const result = await revokeObraPermission(obraId, email);
      if (result.ok) logPermissions("Permissao revogada.", { obraId, email });
      return result;
    },
    removeLocalObraCache(obraId) {
      const id = String(obraId || "").trim();
      if (!id) return { ok: false, erro: "obraId obrigatorio." };
      const meta = loadMeta();
      const index = readLocalObrasIndex();
      const existed = Boolean(index[id]);
      delete index[id];
      const indexOk = writeLocalObrasIndex(index);
      try {
        localStorage.removeItem(getLocalObraStateKey(id));
      } catch (_) {}
      try {
        if (String(meta?.obraId || "") === id) {
          localStorage.removeItem(ONLINE_META_KEY);
          localStorage.removeItem(ONLINE_STATUS_KEY);
          localStorage.removeItem("plannus.online.selected");
        }
      } catch (_) {}
      return { ok: true, removed: existed, indexOk };
    },
    async connectOnline() {
      if (!PLANNUS_ONLINE_CONFIG.enabled) return { ok: false, erro: "Modo online desabilitado." };
      const result = await listOnlineObras();
      setStatus(result.ok ? "Online conectado." : `Falha de conexao: ${result.erro}`);
      return result;
    },
    async loadOnline(obraId = PLANNUS_ONLINE_CONFIG.defaultObraId, obraNome = null) {
      if (!PLANNUS_ONLINE_CONFIG.enabled) return { ok: false, erro: "Modo online desabilitado." };
      logSync("Carregando obra online.", { obraId });
      const result = await loadOnlineObra(obraId);
      if (!result.ok) {
        setStatus(`Falha ao carregar online (${result.status || "rede"}): ${result.erro}`);
        return result;
      }
      const remoteState = resolveRemoteState(result.data);
      if (!remoteState) {
        const errorResult = { ok: false, status: result.status, erro: "Resposta online sem campo state." };
        setStatus(errorResult.erro);
        return errorResult;
      }
      const backupKey = backupCurrentLocalState();
      saveState(remoteState);
      const meta = {
        obraId,
        obraNome: obraNome || resolveRemoteObraNome(result.data) || remoteState?.obra?.nome || null,
        revision: resolveRemoteRevision(result.data),
        updatedAt: resolveRemoteUpdatedAt(result.data),
        lastSyncAt: nowIso(),
        lastLocalSaveAt: nowIso(),
        lastOnlineSaveAt: nowIso(),
        pendingOnlineSave: false,
        conflict: false,
        lastError: null,
        lastSavedStateSignature: buildOnlineSaveFingerprint(remoteState),
      };
      saveMeta(meta);
      setStatus(`Obra ${obraId} carregada online com sucesso.`);
      logRepo("Carga online aplicada e sincronizada localmente.", { obraId, backupKey, revision: meta.revision });
      return { ok: true, state: remoteState, meta, backupKey, data: result.data };
    },
    async openOnlineObra(obra) {
      const obraId = obra?.id || obra?.obra_id || obra?.obraId || PLANNUS_ONLINE_CONFIG.defaultObraId;
      const obraNome = obra?.nome || obra?.obra_nome || obra?.obraNome || null;
      return this.loadOnline(obraId, obraNome);
    },
    async saveHybrid(state, obraId = null) {
      const currentMeta = loadMeta();
      const resolvedObraId = obraId || currentMeta.obraId || PLANNUS_ONLINE_CONFIG.defaultObraId;
      logSync("Iniciando save hibrido (local -> online).", { obraId: resolvedObraId });
      saveState(state);
      const previousMeta = loadMeta();
      const revision = Number(previousMeta.revision || 0);
      const stateFingerprint = String(state?.__plannusSaveFingerprint || buildOnlineSaveFingerprint(state)).trim();
      const lastSavedFingerprint = String(previousMeta.lastSavedStateSignature || "").trim();
      const localSaveAt = nowIso();
      if (stateFingerprint && lastSavedFingerprint && stateFingerprint === lastSavedFingerprint && !previousMeta.pendingOnlineSave && !previousMeta.conflict) {
        const metaSkipped = {
          ...previousMeta,
          obraId: resolvedObraId,
          lastSyncAt: nowIso(),
          lastLocalSaveAt: localSaveAt,
          pendingOnlineSave: false,
          conflict: false,
          lastError: null,
          lastSavedStateSignature: stateFingerprint,
        };
        saveMeta(metaSkipped);
        setStatus("Nada novo para salvar online.");
        logSync("Save online ignorado porque o estado nao mudou.", { obraId: resolvedObraId, signature: stateFingerprint });
        return { ok: true, localSaved: true, onlineSaved: false, skipped: true, meta: metaSkipped };
      }
      if (!PLANNUS_ONLINE_CONFIG.enabled) {
        const metaDisabled = {
          ...previousMeta,
          obraId: resolvedObraId,
          pendingOnlineSave: true,
          conflict: false,
          lastSyncAt: nowIso(),
          lastLocalSaveAt: localSaveAt,
          lastError: "Modo online desabilitado.",
        };
        saveMeta(metaDisabled);
        setStatus("Online desabilitado. Estado salvo localmente com pendencia online.");
        return { ok: false, localSaved: true, pendingOnlineSave: true, erro: "Modo online desabilitado." };
      }
      const result = await saveOnlineObra(resolvedObraId, state, revision);
      if (result.ok) {
        const data = result.data || {};
        const meta = {
          obraId: resolvedObraId,
          obraNome: previousMeta.obraNome || state?.obra?.nome || null,
          revision: Number(data.revision || revision),
          updatedAt: data.updated_at || null,
          lastSyncAt: nowIso(),
          lastLocalSaveAt: localSaveAt,
          lastOnlineSaveAt: nowIso(),
          pendingOnlineSave: false,
          conflict: false,
          lastError: null,
          lastSavedStateSignature: stateFingerprint || buildOnlineSaveFingerprint(state),
        };
        saveMeta(meta);
        setStatus(`Online salvo com sucesso. Revision ${meta.revision}.`);
        logSync("Save online concluido.", { obraId: resolvedObraId, revisionAnterior: revision, revisionNova: meta.revision });
        logSave("Salvar online concluido com sucesso.", { obraId: resolvedObraId, revisionAnterior: revision, revisionNova: meta.revision, pendingOnlineSave: false, conflict: false, at: meta.lastOnlineSaveAt });
        return { ok: true, localSaved: true, onlineSaved: true, meta, data };
      }
      if (result.conflito) {
        const meta = {
          ...previousMeta,
          obraId: resolvedObraId,
          lastSyncAt: nowIso(),
          lastLocalSaveAt: localSaveAt,
          pendingOnlineSave: true,
          conflict: true,
          revisionConflitoBanco: result.data?.revision_banco ?? null,
          revisionEnviada: result.data?.revision_enviada ?? revision,
          lastError: result.erro || "Conflito 409",
        };
        saveMeta(meta);
        setStatus(`Conflito de revisao (${meta.revisionEnviada} -> banco ${meta.revisionConflitoBanco}).`);
        logSave("Conflito 409 no salvar online.", { obraId: resolvedObraId, revisionEnviada: meta.revisionEnviada, revisionConflitoBanco: meta.revisionConflitoBanco, pendingOnlineSave: true, conflict: true, erro: meta.lastError });
        return { ok: false, localSaved: true, conflito: true, pendingOnlineSave: true, erro: result.erro, data: result.data, meta };
      }
      const meta = {
        ...previousMeta,
        obraId: resolvedObraId,
        lastSyncAt: nowIso(),
        lastLocalSaveAt: localSaveAt,
        pendingOnlineSave: true,
        conflict: false,
        lastError: result.erro || "Falha no save online.",
      };
      saveMeta(meta);
      setStatus(`Falha no save online: ${result.erro}. Estado mantido localmente.`);
      logSave("Salvar online falhou; estado local preservado.", { obraId: resolvedObraId, revisionAnterior: revision, pendingOnlineSave: true, conflict: false, erro: result.erro, at: localSaveAt });
      return { ok: false, localSaved: true, pendingOnlineSave: true, erro: result.erro, status: result.status };
    },
  };
}
