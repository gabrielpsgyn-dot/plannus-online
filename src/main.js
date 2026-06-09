import { createStore } from "./app/store.js";
import { renderApp } from "./ui/app.js";
import { createPlannusPersistence } from "./repository/plannus-persistence.js";
import { renderObrasSelector } from "./ui/obras-screen.js";

const root = document.getElementById("app");
const persistence = createPlannusPersistence();

let store = null;
let bootState = {
  loading: false,
  onlineOk: null,
  status: "Inicializando...",
  obras: [],
  me: null,
  permissionsState: {
    visible: false,
    obraId: null,
    items: [],
  },
};

function logObras(message, payload) {
  if (payload === undefined) console.log(`[PLANNUS_OBRAS] ${message}`);
  else console.log(`[PLANNUS_OBRAS] ${message}`, payload);
}

function paintApp() {
  if (!store) return;
  renderApp(root, store, persistence);
}

function mountMainAppWithCurrentLocal() {
  store = createStore();
  store.subscribe(() => paintApp());
  paintApp();
}

function renderBootScreen() {
  renderObrasSelector(root, {
    ...bootState,
    hasLocal: persistence.hasLocalState(),
    selectedMeta: persistence.getSelectedObraMeta(),
    onRefresh: async () => {
      await refreshObrasList();
    },
    onCreateObra: async () => {
      const nome = String(window.prompt("Nome da obra:") || "").trim();
      if (!nome) return;
      const codigo = String(window.prompt("Sigla/codigo da obra (opcional):") || "").trim();
      bootState = { ...bootState, loading: true, status: "Criando obra online..." };
      renderBootScreen();
      const createResult = await persistence.createOnlineObra({ nome, codigo, descricao: "" });
      if (!createResult.ok) {
        bootState = { ...bootState, loading: false, status: `Falha ao criar obra: ${createResult.erro}` };
        renderBootScreen();
        return;
      }
      const obra = createResult.data?.obra || null;
      await refreshObrasList();
      if (obra?.id) await openOnlineObra({ id: obra.id, nome: obra.nome || nome });
    },
    onOpenObra: async (obra) => {
      await openOnlineObra(obra);
    },
    onDeleteObra: async (obra) => {
      const obraId = obra?.id;
      const obraNome = obra?.nome || obraId || "";
      if (!obraId) return;
      if (!window.confirm(`Excluir a obra "${obraNome}"? Esta ação desativa a obra no banco.`)) return;
      bootState = { ...bootState, loading: true, status: `Excluindo obra ${obraId}...` };
      renderBootScreen();
      const result = await persistence.deleteOnlineObra(obraId);
      if (!result.ok) {
        bootState = { ...bootState, loading: false, status: `Falha ao excluir obra: ${result.erro}` };
        renderBootScreen();
        return;
      }
      persistence.removeLocalObraCache?.(obraId);
      const meta = persistence.getSelectedObraMeta();
      if (meta?.obraId === obraId) {
        bootState = { ...bootState, status: `Obra ${obraId} excluida e selecao local removida.` };
      } else {
        bootState = { ...bootState, status: `Obra ${obraId} excluida com sucesso.` };
      }
      await refreshObrasList();
      bootState = {
        ...bootState,
        loading: false,
        status: meta?.obraId === obraId
          ? `Obra ${obraId} excluida e selecao local removida.`
          : `Obra ${obraId} excluida com sucesso.`,
      };
      renderBootScreen();
    },
    onOpenLocal: () => {
      logObras("Abrindo ultimo estado local.");
      mountMainAppWithCurrentLocal();
    },
    onContinueLast: async () => {
      const meta = persistence.getSelectedObraMeta();
      if (!meta?.obraId) return;
      await openOnlineObra({ id: meta.obraId, nome: meta.obraNome || null });
    },
    onOpenPermissions: async () => {
      const meta = persistence.getSelectedObraMeta();
      const obraId = meta?.obraId;
      if (!obraId) return;
      const result = await persistence.listObraPermissions(obraId);
      if (!result.ok) {
        bootState = { ...bootState, status: `Falha ao listar permissoes: ${result.erro}` };
        renderBootScreen();
        return;
      }
      const items = Array.isArray(result.data?.permissoes) ? result.data.permissoes : Array.isArray(result.data) ? result.data : [];
      bootState = { ...bootState, permissionsState: { visible: true, obraId, items } };
      renderBootScreen();
    },
    onGrantPermission: async (payload) => {
      const meta = persistence.getSelectedObraMeta();
      const obraId = meta?.obraId;
      if (!obraId) return;
      const email = String(payload?.email || "").trim().toLowerCase();
      const permissao = String(payload?.permissao || "viewer").trim();
      if (!email) {
        bootState = { ...bootState, status: "Informe um email para conceder permissao." };
        renderBootScreen();
        return;
      }
      const result = await persistence.grantObraPermission(obraId, { email, nome: payload?.nome || "", permissao });
      if (!result.ok) {
        bootState = { ...bootState, status: `Falha ao conceder permissao: ${result.erro}` };
        renderBootScreen();
        return;
      }
      bootState = { ...bootState, status: "Permissao atualizada com sucesso." };
      await refreshPermissionsPanel(obraId);
    },
    onRevokePermission: async (email) => {
      const meta = persistence.getSelectedObraMeta();
      const obraId = meta?.obraId;
      if (!obraId || !email) return;
      const result = await persistence.revokeObraPermission(obraId, email);
      if (!result.ok) {
        bootState = { ...bootState, status: `Falha ao revogar permissao: ${result.erro}` };
        renderBootScreen();
        return;
      }
      bootState = { ...bootState, status: "Permissao revogada com sucesso." };
      await refreshPermissionsPanel(obraId);
    },
  });
}

async function refreshPermissionsPanel(obraId) {
  const result = await persistence.listObraPermissions(obraId);
  if (!result.ok) {
    bootState = { ...bootState, status: `Falha ao recarregar permissoes: ${result.erro}` };
    renderBootScreen();
    return;
  }
  const items = Array.isArray(result.data?.permissoes) ? result.data.permissoes : Array.isArray(result.data) ? result.data : [];
  bootState = { ...bootState, permissionsState: { visible: true, obraId, items } };
  renderBootScreen();
}

async function refreshObrasList() {
  bootState = { ...bootState, loading: true, status: "Carregando obras..." };
  renderBootScreen();
  const result = await persistence.listOnlineObras();
  if (!result.ok) {
    bootState = {
      ...bootState,
      loading: false,
      onlineOk: false,
      status: `Falha ao conectar: ${result.erro}`,
      obras: [],
    };
    renderBootScreen();
    return;
  }
  bootState = {
    ...bootState,
    loading: false,
    onlineOk: true,
    status: `Online conectado. ${result.obras.length} obra(s) encontrada(s).`,
    obras: result.obras,
  };
  renderBootScreen();
}

async function openOnlineObra(obra) {
  const obraId = obra?.id;
  if (!obraId) return;
  bootState = { ...bootState, loading: true, status: `Carregando obra ${obraId}...` };
  renderBootScreen();
  const result = await persistence.openOnlineObra(obra);
  if (!result.ok) {
    bootState = {
      ...bootState,
      loading: false,
      onlineOk: false,
      status: `Falha ao abrir obra online: ${result.erro}`,
    };
    renderBootScreen();
    return;
  }
  logObras("Obra aberta online e estado aplicado.", { obraId, revision: result.meta?.revision });
  mountMainAppWithCurrentLocal();
}

async function boot() {
  const meResult = await persistence.getMe();
  if (meResult.ok) {
    const me = meResult.data?.usuario || meResult.data || null;
    bootState = { ...bootState, me };
  }
  const meta = persistence.getSelectedObraMeta();
  const hasLocal = persistence.hasLocalState();
  bootState = {
    ...bootState,
    status: "Selecione uma obra para iniciar.",
  };
  renderBootScreen();
  await refreshObrasList();
  if (!meta?.obraId && !hasLocal) {
    logObras("Sem obra selecionada e sem estado local. Permanecendo na tela de obras.");
    return;
  }
  if (meta?.obraId) {
    bootState = { ...bootState, status: `Ultima obra selecionada: ${meta.obraId}.` };
    renderBootScreen();
  } else if (hasLocal) {
    bootState = { ...bootState, status: "Estado local encontrado. Use 'Abrir ultima obra local'." };
    renderBootScreen();
  }
}

boot();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (error) {
      console.error("Falha ao registrar service worker do PLANNUS.", error);
    }
  });
}
