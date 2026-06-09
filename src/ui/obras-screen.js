function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("pt-BR");
}

function pickPermissionLabel(obra) {
  return obra?.permissao || obra?.permission || obra?.role || obra?.nivelAcesso || "-";
}

function pickObraId(obra) {
  return obra?.id || obra?.obra_id || obra?.obraId || "";
}

export function renderObrasSelector(root, options) {
  const {
    status = "Pronto",
    onlineOk = null,
    loading = false,
    obras = [],
    hasLocal = false,
    selectedMeta = {},
    me = null,
    permissionsState = null,
    onRefresh = async () => {},
    onCreateObra = async () => {},
    onOpenObra = async () => {},
    onDeleteObra = async () => {},
    onOpenLocal = () => {},
    onContinueLast = async () => {},
    onOpenPermissions = async () => {},
    onGrantPermission = async () => {},
    onRevokePermission = async () => {},
  } = options;
  const canManagePermissions = Boolean(me?.can_grant_permissions) || String(me?.role || "").toLowerCase() === "planejador";
  const canDeleteGlobally = Boolean(me?.can_delete_obras) || String(me?.role || "").toLowerCase() === "planejador";

  root.innerHTML = `
    <section class="panel" style="max-width:980px;margin:24px auto;padding:20px">
      <h2 style="margin:0 0 10px 0">Minhas Obras</h2>
      <p class="muted" style="margin:0 0 14px 0">Selecione uma obra para abrir o Plannus online. O modo local continua disponivel como fallback.</p>
      <div class="sticky-note" style="margin-bottom:12px">
        <strong>Status:</strong> ${escapeHtml(status)}<br/>
        <span class="muted">${
          onlineOk === null ? "Aguardando conexao..." : onlineOk ? "Online conectado" : "Falha ao conectar"
        }</span>
      </div>
      <div class="sticky-note" style="margin-bottom:12px">
        <strong>Usuario:</strong> ${escapeHtml(me?.email || "-")}<br/>
        <span class="muted">role=${escapeHtml(me?.role || "usuario")} | grant=${String(Boolean(me?.can_grant_permissions))} | manage_users=${String(Boolean(me?.can_manage_users))} | delete=${String(Boolean(me?.can_delete_obras))}</span>
      </div>
      <div class="toolbar" style="margin-bottom:12px">
        <button class="btn-secondary" data-action="refresh-obras" ${loading ? "disabled" : ""}>Atualizar lista de obras</button>
        <button class="btn-secondary" data-action="create-obra" ${loading ? "disabled" : ""}>Criar obra</button>
        <button class="btn-secondary" data-action="open-local" ${hasLocal ? "" : "disabled"}>Abrir ultima obra local</button>
        <button class="btn-secondary" data-action="continue-last" ${selectedMeta?.obraId ? "" : "disabled"}>Continuar ultima obra (${escapeHtml(selectedMeta?.obraId || "-")})</button>
        ${canManagePermissions ? `<button class="btn-secondary" data-action="open-permissions" ${selectedMeta?.obraId ? "" : "disabled"}>Gerenciar permissoes</button>` : ""}
      </div>
      ${
        loading
          ? '<div class="empty-board">Carregando obras...</div>'
          : !obras.length
            ? '<div class="empty-board">Nenhuma obra disponivel.</div>'
            : `
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Codigo</th>
                      <th>Revision</th>
                      <th>Updated At</th>
                      <th>Permissao</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${obras.map((obra) => `
                      <tr>
                        <td>${escapeHtml(obra.nome || obra.obra_nome || pickObraId(obra))}</td>
                        <td>${escapeHtml(obra.codigo || obra.obra_codigo || "-")}</td>
                        <td>${Number(obra.revision || 0)}</td>
                        <td>${escapeHtml(formatDateTime(obra.updated_at || obra.updatedAt))}</td>
                        <td>${escapeHtml(pickPermissionLabel(obra))}</td>
                        <td>
                          <button class="btn" data-action="open-obra" data-obra-id="${escapeHtml(pickObraId(obra))}" data-obra-nome="${escapeHtml(obra.nome || obra.obra_nome || "")}">Abrir Obra</button>
                          ${canDeleteGlobally || String(pickPermissionLabel(obra) || "").toLowerCase() === "owner" ? `<button class="btn-secondary" style="margin-left:8px" data-action="delete-obra" data-obra-id="${escapeHtml(pickObraId(obra))}" data-obra-nome="${escapeHtml(obra.nome || obra.obra_nome || "")}">Excluir</button>` : ""}
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `
      }
    </section>
    ${canManagePermissions ? `
      <section class="panel" style="max-width:980px;margin:12px auto;padding:16px;${permissionsState?.visible ? "" : "display:none"}" data-panel="permissions">
        <h3 style="margin:0 0 10px 0">Permissoes da Obra (${escapeHtml(permissionsState?.obraId || selectedMeta?.obraId || "-")})</h3>
        <div class="grid three" style="margin-bottom:10px">
          <div class="field"><label>Email</label><input id="perm-email" placeholder="usuario@dominio.com" /></div>
          <div class="field"><label>Nome</label><input id="perm-nome" placeholder="Nome Usuario" /></div>
          <div class="field"><label>Permissao</label><select id="perm-role"><option value="viewer">viewer</option><option value="editor">editor</option><option value="owner">owner</option></select></div>
        </div>
        <div class="toolbar" style="margin-bottom:10px">
          <button class="btn" data-action="grant-permission">Conceder/Atualizar</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Nome</th><th>Permissao</th><th>Ativo</th><th>Updated At</th><th>Acoes</th></tr></thead>
            <tbody>
              ${(permissionsState?.items || []).map((item) => `
                <tr>
                  <td>${escapeHtml(item.usuario_email || item.email || "-")}</td>
                  <td>${escapeHtml(item.nome || "-")}</td>
                  <td>${escapeHtml(item.permissao || "-")}</td>
                  <td>${String(Boolean(item.ativo))}</td>
                  <td>${escapeHtml(formatDateTime(item.updated_at || item.updatedAt))}</td>
                  <td><button class="btn-secondary" data-action="revoke-permission" data-email="${escapeHtml(item.usuario_email || item.email || "")}">Revogar</button></td>
                </tr>
              `).join("") || '<tr><td colspan="6">Sem permissoes registradas.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    ` : ""}
  `;

  root.querySelector("[data-action='refresh-obras']")?.addEventListener("click", async () => onRefresh());
  root.querySelector("[data-action='create-obra']")?.addEventListener("click", async () => onCreateObra());
  root.querySelector("[data-action='open-local']")?.addEventListener("click", () => onOpenLocal());
  root.querySelector("[data-action='continue-last']")?.addEventListener("click", async () => onContinueLast());
  root.querySelector("[data-action='open-permissions']")?.addEventListener("click", async () => onOpenPermissions());
  root.querySelector("[data-action='grant-permission']")?.addEventListener("click", async () => {
    await onGrantPermission({
      email: root.querySelector("#perm-email")?.value || "",
      nome: root.querySelector("#perm-nome")?.value || "",
      permissao: root.querySelector("#perm-role")?.value || "viewer",
    });
  });
  root.querySelectorAll("[data-action='revoke-permission']").forEach((button) => button.addEventListener("click", async () => onRevokePermission(button.dataset.email)));
  root.querySelectorAll("[data-action='open-obra']").forEach((button) => button.addEventListener("click", async () => onOpenObra({
    id: button.dataset.obraId,
    nome: button.dataset.obraNome,
  })));
  root.querySelectorAll("[data-action='delete-obra']").forEach((button) => button.addEventListener("click", async () => onDeleteObra({
    id: button.dataset.obraId,
    nome: button.dataset.obraNome,
  })));
}
