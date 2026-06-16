export const PLANNUS_ONLINE_CONFIG = Object.freeze({
  enabled: true,
  apiBase: "https://plannus-api.gabrielpsgyn.workers.dev",
  defaultObraId: "obra_demo_001",
  autosave: false,
});

function logOnline(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_ONLINE] ${message}`);
  else console.log(`[PLANNUS_ONLINE] ${message}`, payload);
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

function buildUrl(path) {
  const base = String(PLANNUS_ONLINE_CONFIG.apiBase || "").replace(/\/+$/, "");
  return `${base}${path}`;
}

export async function listOnlineObras() {
  const url = buildUrl("/api/obras");
  try {
    const response = await fetch(url);
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return { ok: false, status: response.status, erro: data?.erro || "Falha ao listar obras online.", data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao listar obras.", { error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao listar obras online.", data: null };
  }
}

export async function loadOnlineObra(obraId) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}`);
  try {
    const response = await fetch(url);
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return { ok: false, status: response.status, erro: data?.erro || "Falha ao carregar obra online.", data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao carregar obra.", { obraId, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao carregar obra online.", data: null };
  }
}

export async function saveOnlineObra(obraId, state, revision) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}/save`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, state }),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        status: response.status,
        conflito: response.status === 409 || data?.conflito === true,
        erro: data?.erro || "Falha ao salvar obra online.",
        data,
      };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao salvar obra.", { obraId, revision, error: String(error) });
    return { ok: false, status: 0, networkError: true, conflito: false, erro: "Erro de rede ao salvar obra online.", data: null };
  }
}

export async function createOnlineObra(payload) {
  const url = buildUrl("/api/obras");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return { ok: false, status: response.status, erro: data?.erro || "Falha ao criar obra online.", data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao criar obra.", { payload, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao criar obra online.", data: null };
  }
}

export async function deleteOnlineObra(obraId) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}`);
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) {
      return { ok: false, status: response.status, erro: data?.erro || "Falha ao excluir obra online.", data };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao excluir obra.", { obraId, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao excluir obra online.", data: null };
  }
}

export async function getMe() {
  const url = buildUrl("/api/me");
  try {
    const response = await fetch(url);
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao consultar usuario atual.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao consultar /api/me.", { error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao consultar usuario atual.", data: null };
  }
}

export async function listUsers() {
  const url = buildUrl("/api/usuarios");
  try {
    const response = await fetch(url);
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao listar usuarios.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao listar usuarios.", { error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao listar usuarios.", data: null };
  }
}

export async function upsertUser(payload) {
  const url = buildUrl("/api/usuarios");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao salvar usuario.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao salvar usuario.", { error: String(error), payload });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao salvar usuario.", data: null };
  }
}

export async function deleteUser(email) {
  const url = buildUrl("/api/usuarios");
  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao excluir usuario.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao excluir usuario.", { email, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao excluir usuario.", data: null };
  }
}

export async function listObraPermissions(obraId) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}/permissoes`);
  try {
    const response = await fetch(url);
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao listar permissoes da obra.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao listar permissoes.", { obraId, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao listar permissoes da obra.", data: null };
  }
}

export async function grantObraPermission(obraId, payload) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}/permissoes`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao conceder permissao.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao conceder permissao.", { obraId, payload, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao conceder permissao.", data: null };
  }
}

export async function revokeObraPermission(obraId, email) {
  const url = buildUrl(`/api/obras/${encodeURIComponent(obraId)}/permissoes/revogar`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await readJsonSafe(response);
    if (!response.ok || data?.ok === false) return { ok: false, status: response.status, erro: data?.erro || "Falha ao revogar permissao.", data };
    return { ok: true, status: response.status, data };
  } catch (error) {
    logOnline("Erro de rede ao revogar permissao.", { obraId, email, error: String(error) });
    return { ok: false, status: 0, networkError: true, erro: "Erro de rede ao revogar permissao.", data: null };
  }
}
