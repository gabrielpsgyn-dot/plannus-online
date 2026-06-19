export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return corsResponse(null, 204);
    }

    try {
      if (!env.DB) {
        return json({
          ok: false,
          erro: "Binding D1 não encontrado. Confira se o binding se chama exatamente DB."
        }, 500);
      }

      const path = url.pathname;
      const method = request.method;
      const parts = path.split("/").filter(Boolean);

      // ============================================================
      // HEALTH / DIAGNÓSTICO
      // ============================================================

      if (path === "/api/ping" && method === "GET") {
        const result = await env.DB.prepare(
          "SELECT datetime('now') AS agora"
        ).first();

        return json({
          ok: true,
          banco: "D1 conectado",
          database: "plannus_v1",
          agora: result.agora
        });
      }

      if (path === "/api/tabelas" && method === "GET") {
        const result = await env.DB.prepare(`
          SELECT name
          FROM sqlite_master
          WHERE type IN ('table', 'view')
          ORDER BY name
        `).all();

        return json({
          ok: true,
          tabelas: result.results
        });
      }

      // ============================================================
      // USUÁRIO ATUAL
      // ============================================================

      if (path === "/api/me" && method === "GET") {
        const email = getUserEmail(request);
        const usuario = await getUserRole(env, email);

        return json({
          ok: true,
          usuario
        });
      }

      // ============================================================
      // USUÁRIOS
      // ============================================================

      if (path === "/api/usuarios" && method === "GET") {
        const email = getUserEmail(request);

        if (!(await canUserManageUsers(env, email))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para gerenciar usuários."
          }, 403);
        }

        const result = await env.DB.prepare(`
          SELECT
            u.email,
            u.nome,
            u.perfil_global,
            u.ativo,
            COALESCE(ur.role, 'usuario') AS role,
            COALESCE(ur.can_view_all_obras, 0) AS can_view_all_obras,
            COALESCE(ur.can_grant_permissions, 0) AS can_grant_permissions,
            COALESCE(ur.can_manage_users, 0) AS can_manage_users,
            COALESCE(ur.can_create_obras, 0) AS can_create_obras,
            CASE WHEN COALESCE(ur.role, 'usuario') = 'planejador' THEN 1 ELSE 0 END AS can_delete_obras,
            COALESCE(ur.ativo, u.ativo) AS role_ativo,
            u.created_at,
            u.updated_at
          FROM usuarios u
          LEFT JOIN usuario_roles ur
            ON ur.usuario_email = u.email
          ORDER BY u.email
        `).all();

        return json({
          ok: true,
          usuarios: result.results
        });
      }

      if (path === "/api/usuarios" && method === "POST") {
        const actorEmail = getUserEmail(request);

        if (!(await canUserManageUsers(env, actorEmail))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para gerenciar usuários."
          }, 403);
        }

        const body = await readJson(request);
        const targetEmail = normalizeEmail(body.email);
        const nome = nullableText(body.nome) || targetEmail;
        const role = normalizeRole(body.role || "usuario");
        const roleFlags = buildRoleFlags(role, body);

        if (!targetEmail) {
          return json({
            ok: false,
            erro: "E-mail obrigatório."
          }, 400);
        }

        const now = new Date().toISOString();
        const perfilGlobal = role === "bloqueado" ? "bloqueado" : "usuario";

        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO usuarios (
              email,
              nome,
              perfil_global,
              ativo,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              nome = excluded.nome,
              perfil_global = excluded.perfil_global,
              ativo = excluded.ativo,
              updated_at = excluded.updated_at
          `).bind(
            targetEmail,
            nome,
            perfilGlobal,
            role === "bloqueado" ? 0 : 1,
            now
          ),

          env.DB.prepare(`
            INSERT INTO usuario_roles (
              usuario_email,
              role,
              can_view_all_obras,
              can_grant_permissions,
              can_manage_users,
              can_create_obras,
              ativo,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(usuario_email) DO UPDATE SET
              role = excluded.role,
              can_view_all_obras = excluded.can_view_all_obras,
              can_grant_permissions = excluded.can_grant_permissions,
              can_manage_users = excluded.can_manage_users,
              can_create_obras = excluded.can_create_obras,
              ativo = excluded.ativo,
              updated_at = excluded.updated_at
          `).bind(
            targetEmail,
            role,
            roleFlags.can_view_all_obras,
            roleFlags.can_grant_permissions,
            roleFlags.can_manage_users,
            roleFlags.can_create_obras,
            role === "bloqueado" ? 0 : 1,
            now
          ),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            actorEmail,
            "UPSERT_USUARIO",
            "usuario",
            targetEmail,
            JSON.stringify({ email: targetEmail, nome, role }),
            now
          )
        ]);

        return json({
          ok: true,
          usuario: {
            email: targetEmail,
            nome,
            role,
            ...roleFlags,
            ativo: role === "bloqueado" ? 0 : 1
          }
        });
      }

      if (path === "/api/usuarios" && method === "DELETE") {
        const actorEmail = getUserEmail(request);

        if (!(await canUserDeleteUser(env, actorEmail))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para excluir usuários."
          }, 403);
        }

        const body = await readJson(request);
        const targetEmail = normalizeEmail(body.email || url.searchParams.get("email"));

        if (!targetEmail) {
          return json({
            ok: false,
            erro: "E-mail obrigatório."
          }, 400);
        }

        if (targetEmail === actorEmail) {
          return json({
            ok: false,
            erro: "Não é permitido excluir o próprio usuário."
          }, 400);
        }

        const existing = await env.DB.prepare(`
          SELECT email, nome, perfil_global, ativo
          FROM usuarios
          WHERE email = ?
        `).bind(targetEmail).first();

        if (!existing) {
          return json({
            ok: false,
            erro: "Usuário não encontrado."
          }, 404);
        }

        const now = new Date().toISOString();

        await env.DB.batch([
          env.DB.prepare(`
            UPDATE usuarios
            SET ativo = 0,
                updated_at = ?
            WHERE email = ?
          `).bind(now, targetEmail),

          env.DB.prepare(`
            UPDATE usuario_roles
            SET ativo = 0,
                updated_at = ?
            WHERE usuario_email = ?
          `).bind(now, targetEmail),

          env.DB.prepare(`
            UPDATE usuario_obras
            SET ativo = 0,
                updated_at = ?
            WHERE usuario_email = ?
          `).bind(now, targetEmail),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            actorEmail,
            "DELETE_USUARIO",
            "usuario",
            targetEmail,
            JSON.stringify({
              targetEmail,
              nome: existing.nome,
              perfil_global: existing.perfil_global
            }),
            now
          )
        ]);

        return json({
          ok: true,
          usuario: {
            email: existing.email,
            nome: existing.nome,
            perfil_global: existing.perfil_global,
            ativo: 0
          }
        });
      }

      // ============================================================
      // OBRAS — LISTAR
      // ============================================================

      if (path === "/api/obras" && method === "GET") {
        const email = getUserEmail(request);
        const role = await getUserRole(env, email);

        let result;

        if (toBool(role.can_view_all_obras)) {
          result = await env.DB.prepare(`
            SELECT
              o.id,
              o.nome,
              o.codigo,
              o.descricao,
              o.revision,
              o.status,
              o.updated_at,
              COALESCE(uo.permissao, 'planejador') AS permissao
            FROM obras o
            LEFT JOIN usuario_obras uo
              ON uo.obra_id = o.id
             AND uo.usuario_email = ?
             AND uo.ativo = 1
            WHERE o.status = 'ativa'
            ORDER BY o.updated_at DESC
          `).bind(email).all();
        } else {
          result = await env.DB.prepare(`
            SELECT
              o.id,
              o.nome,
              o.codigo,
              o.descricao,
              o.revision,
              o.status,
              o.updated_at,
              uo.permissao
            FROM obras o
            JOIN usuario_obras uo
              ON uo.obra_id = o.id
            WHERE uo.usuario_email = ?
              AND uo.ativo = 1
              AND o.status = 'ativa'
            ORDER BY o.updated_at DESC
          `).bind(email).all();
        }

        return json({
          ok: true,
          usuario: email,
          role: role.role,
          obras: result.results
        });
      }

      // ============================================================
      // OBRAS — CRIAR OBRA REAL NO D1
      // ============================================================

      if (path === "/api/servicos" && method === "GET") {
        const services = await loadServiceCatalogFromDb(env);

        return json({
          ok: true,
          services
        });
      }

      if (path === "/api/servicos" && method === "POST") {
        const actorEmail = getUserEmail(request);
        const body = await readJson(request);
        const incoming = Array.isArray(body.services) ? body.services : [];
        const normalized = incoming
          .map((svc, idx) => normalizeServiceCatalogInput(svc, idx))
          .filter((svc) => svc.id && svc.name);

        if (!normalized.length) {
          return json({
            ok: false,
            erro: "Catálogo de serviços vazio."
          }, 400);
        }

        const saved = await replaceServiceCatalog(env, normalized, actorEmail);

        return json({
          ok: true,
          services: saved,
          total: saved.length
        });
      }

      if (path === "/api/eap" && method === "GET") {
        const templates = await loadEapTemplatesFromDb(env);

        return json({
          ok: true,
          templates
        });
      }

      if (path === "/api/eap" && method === "POST") {
        const actorEmail = getUserEmail(request);
        const body = await readJson(request);
        const incoming = Array.isArray(body.templates)
          ? body.templates
          : body?.template
            ? [body.template]
            : [];
        const normalized = incoming
          .map((template, idx) => normalizeEapTemplateInput(template, idx))
          .filter((template) => template.key && template.label);

        if (!normalized.length) {
          return json({
            ok: false,
            erro: "Catálogo de EAP vazio."
          }, 400);
        }

        const saved = await replaceEapTemplates(env, normalized, actorEmail);

        return json({
          ok: true,
          templates: saved,
          total: saved.length
        });
      }

      if (parts.length === 3 && parts[0] === "api" && parts[1] === "eap" && method === "GET") {
        const key = decodeURIComponent(parts[2] || "").trim();
        const templates = await loadEapTemplatesFromDb(env);
        const template = templates.find((row) => row.key === key) || null;

        if (!template) {
          return json({
            ok: false,
            erro: "EAP não encontrada."
          }, 404);
        }

        return json({
          ok: true,
          template
        });
      }

      if (parts.length === 3 && parts[0] === "api" && parts[1] === "eap" && method === "POST") {
        const actorEmail = getUserEmail(request);
        const key = decodeURIComponent(parts[2] || "").trim();
        const body = await readJson(request);
        const normalized = normalizeEapTemplateInput({
          ...body,
          key: body?.key || key
        }, 0);

        if (!normalized.key || !normalized.label) {
          return json({
            ok: false,
            erro: "Chave e título da EAP são obrigatórios."
          }, 400);
        }

        const saved = await replaceEapTemplates(env, [normalized], actorEmail);
        const template = saved.find((row) => row.key === normalized.key) || null;

        return json({
          ok: true,
          template,
          templates: saved,
          total: saved.length
        });
      }

      if (parts.length === 3 && parts[0] === "api" && parts[1] === "eap" && method === "DELETE") {
        const actorEmail = getUserEmail(request);
        const key = decodeURIComponent(parts[2] || "").trim();

        if (!key) {
          return json({
            ok: false,
            erro: "Chave da EAP obrigatória."
          }, 400);
        }

        const existing = await loadEapTemplatesFromDb(env);
        const remaining = existing.filter((row) => row.key !== key);

        if (remaining.length === existing.length) {
          return json({
            ok: false,
            erro: "EAP não encontrada."
          }, 404);
        }

        const saved = await replaceEapTemplates(env, remaining, actorEmail);
        return json({
          ok: true,
          templates: saved,
          total: saved.length
        });
      }

      if (path === "/api/obras" && method === "POST") {
        const email = getUserEmail(request);
        const role = await getUserRole(env, email);

        if (!toBool(role.can_create_obras)) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para criar obras."
          }, 403);
        }

        const body = await readJson(request);
        const nome = nullableText(body.nome);
        const codigo = nullableText(body.codigo);
        const descricao = nullableText(body.descricao) || "";

        if (!nome) {
          return json({
            ok: false,
            erro: "Nome da obra é obrigatório."
          }, 400);
        }

        const obraId = "obra_" + crypto.randomUUID();
        const now = new Date().toISOString();

        const serviceCatalog = await loadServiceCatalogFromDb(env);

        const state = buildInitialObraState({
          id: obraId,
          nome,
          codigo,
          descricao
        }, serviceCatalog);

        const stateJson = JSON.stringify(state);

        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO obras (
              id,
              nome,
              codigo,
              descricao,
              owner_email,
              state_json,
              revision,
              status,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            obraId,
            nome,
            codigo,
            descricao,
            email,
            stateJson,
            1,
            "ativa",
            now,
            now
          ),

          env.DB.prepare(`
            INSERT INTO usuario_obras (
              id,
              usuario_email,
              obra_id,
              permissao,
              ativo,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(usuario_email, obra_id) DO UPDATE SET
              permissao = excluded.permissao,
              ativo = 1,
              updated_at = excluded.updated_at
          `).bind(
            crypto.randomUUID(),
            email,
            obraId,
            "owner",
            1,
            now,
            now
          ),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              obra_id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            email,
            "CREATE_OBRA",
            "obra",
            obraId,
            JSON.stringify({ nome, codigo, descricao }),
            now
          )
        ]);

        return json({
          ok: true,
          obra: {
            id: obraId,
            nome,
            codigo,
            descricao,
            revision: 1,
            status: "ativa",
            updated_at: now,
            permissao: "owner",
            state
          }
        }, 201);
      }

      // ============================================================
      // PERMISSÕES DE OBRA
      // /api/obras/:id/permissoes
      // /api/obras/:id/permissoes/revogar
      // ============================================================

      if (
        parts.length === 4 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        parts[3] === "permissoes" &&
        method === "GET"
      ) {
        const email = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canManageObraPermissions(env, email, obraId))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para listar permissões da obra."
          }, 403);
        }

        const result = await env.DB.prepare(`
          SELECT
            uo.usuario_email,
            u.nome,
            uo.permissao,
            uo.ativo,
            uo.updated_at
          FROM usuario_obras uo
          LEFT JOIN usuarios u
            ON u.email = uo.usuario_email
          WHERE uo.obra_id = ?
          ORDER BY uo.ativo DESC, uo.permissao, uo.usuario_email
        `).bind(obraId).all();

        return json({
          ok: true,
          obra_id: obraId,
          permissoes: result.results
        });
      }

      if (
        parts.length === 4 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        parts[3] === "permissoes" &&
        method === "POST"
      ) {
        const actorEmail = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canManageObraPermissions(env, actorEmail, obraId))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para conceder permissões da obra."
          }, 403);
        }

        const body = await readJson(request);
        const targetEmail = normalizeEmail(body.email);
        const nome = nullableText(body.nome) || targetEmail;
        const permissao = normalizeObraPermissao(body.permissao || "viewer");

        if (!targetEmail) {
          return json({
            ok: false,
            erro: "E-mail obrigatório."
          }, 400);
        }

        const now = new Date().toISOString();

        const previous = await env.DB.prepare(`
          SELECT permissao, ativo
          FROM usuario_obras
          WHERE obra_id = ?
            AND usuario_email = ?
        `).bind(obraId, targetEmail).first();

        const action = previous && Number(previous.ativo) === 1 ? "update" : "grant";
        const previousPermissao = previous ? previous.permissao : null;

        await env.DB.batch([
          env.DB.prepare(`
            INSERT INTO usuarios (
              email,
              nome,
              perfil_global,
              ativo,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              nome = excluded.nome,
              ativo = 1,
              updated_at = excluded.updated_at
          `).bind(
            targetEmail,
            nome,
            "usuario",
            1,
            now
          ),

          env.DB.prepare(`
            INSERT OR IGNORE INTO usuario_roles (
              usuario_email,
              role,
              can_view_all_obras,
              can_grant_permissions,
              can_manage_users,
              can_create_obras,
              ativo,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            targetEmail,
            "usuario",
            0,
            0,
            0,
            0,
            1,
            now,
            now
          ),

          env.DB.prepare(`
            INSERT INTO usuario_obras (
              id,
              usuario_email,
              obra_id,
              permissao,
              ativo,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(usuario_email, obra_id) DO UPDATE SET
              permissao = excluded.permissao,
              ativo = 1,
              updated_at = excluded.updated_at
          `).bind(
            crypto.randomUUID(),
            targetEmail,
            obraId,
            permissao,
            1,
            now,
            now
          ),

          env.DB.prepare(`
            INSERT INTO usuario_permission_events (
              id,
              actor_email,
              target_email,
              obra_id,
              action,
              permissao_anterior,
              permissao_nova,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            actorEmail,
            targetEmail,
            obraId,
            action,
            previousPermissao,
            permissao,
            JSON.stringify({ nome }),
            now
          ),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              obra_id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            actorEmail,
            action === "grant" ? "GRANT_OBRA_PERMISSION" : "UPDATE_OBRA_PERMISSION",
            "usuario_obras",
            targetEmail,
            JSON.stringify({ targetEmail, nome, permissao, previousPermissao }),
            now
          )
        ]);

        return json({
          ok: true,
          obra_id: obraId,
          usuario_email: targetEmail,
          nome,
          permissao,
          action
        });
      }

      if (
        parts.length === 5 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        parts[3] === "permissoes" &&
        parts[4] === "revogar" &&
        method === "POST"
      ) {
        const actorEmail = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canManageObraPermissions(env, actorEmail, obraId))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para revogar permissões da obra."
          }, 403);
        }

        const body = await readJson(request);
        const targetEmail = normalizeEmail(body.email);

        if (!targetEmail) {
          return json({
            ok: false,
            erro: "E-mail obrigatório."
          }, 400);
        }

        const previous = await env.DB.prepare(`
          SELECT permissao, ativo
          FROM usuario_obras
          WHERE obra_id = ?
            AND usuario_email = ?
        `).bind(obraId, targetEmail).first();

        if (!previous) {
          return json({
            ok: false,
            erro: "Permissão não encontrada para este usuário na obra."
          }, 404);
        }

        const now = new Date().toISOString();

        await env.DB.batch([
          env.DB.prepare(`
            UPDATE usuario_obras
            SET ativo = 0,
                updated_at = ?
            WHERE obra_id = ?
              AND usuario_email = ?
          `).bind(now, obraId, targetEmail),

          env.DB.prepare(`
            INSERT INTO usuario_permission_events (
              id,
              actor_email,
              target_email,
              obra_id,
              action,
              permissao_anterior,
              permissao_nova,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            actorEmail,
            targetEmail,
            obraId,
            "revoke",
            previous.permissao,
            null,
            JSON.stringify({ ativo_anterior: previous.ativo }),
            now
          ),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              obra_id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            actorEmail,
            "REVOKE_OBRA_PERMISSION",
            "usuario_obras",
            targetEmail,
            JSON.stringify({ targetEmail, permissao_anterior: previous.permissao }),
            now
          )
        ]);

        return json({
          ok: true,
          obra_id: obraId,
          usuario_email: targetEmail,
          revoked: true
        });
      }

      // ============================================================
      // OBRAS — SALVAR EXISTENTE
      // /api/obras/:id/save
      // ============================================================

      if (
        parts.length === 4 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        parts[3] === "save" &&
        method === "POST"
      ) {
        const email = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canUserEditObra(env, email, obraId))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão de edição."
          }, 403);
        }

        const body = await readJson(request);
        const state = body.state;
        const revision = Number(body.revision);

        if (!state || !Number.isInteger(revision)) {
          return json({
            ok: false,
            erro: "Payload inválido. Envie { state, revision }."
          }, 400);
        }

        const stateJson = JSON.stringify(state);
        const now = new Date().toISOString();

        const current = await env.DB.prepare(`
          SELECT revision
          FROM obras
          WHERE id = ?
            AND status = 'ativa'
        `).bind(obraId).first();

        if (!current) {
          return json({
            ok: false,
            erro: "Obra não encontrada."
          }, 404);
        }

        if (Number(current.revision) !== revision) {
          return json({
            ok: false,
            conflito: true,
            erro: "Existe uma versão mais recente no banco. Carregue a obra antes de salvar.",
            revision_banco: Number(current.revision),
            revision_enviada: revision
          }, 409);
        }

        const newRevision = revision + 1;

        await env.DB.batch([
          env.DB.prepare(`
            INSERT OR IGNORE INTO obra_revisions (
              id,
              obra_id,
              revision,
              state_json,
              saved_by_email,
              motivo,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            revision,
            stateJson,
            email,
            "snapshot antes do salvamento",
            now
          ),

          env.DB.prepare(`
            UPDATE obras
            SET state_json = ?,
                revision = ?,
                updated_at = ?
            WHERE id = ?
              AND revision = ?
          `).bind(
            stateJson,
            newRevision,
            now,
            obraId,
            revision
          ),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              obra_id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            email,
            "SAVE_OBRA",
            "obra",
            obraId,
            JSON.stringify({ revision_anterior: revision, revision_nova: newRevision }),
            now
          )
        ]);

        return json({
          ok: true,
          obra_id: obraId,
          revision: newRevision,
          updated_at: now
        });
      }

      // ============================================================
      // OBRAS — EXCLUIR / DESATIVAR LOGICAMENTE
      // /api/obras/:id
      // ============================================================

      if (
        parts.length === 3 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        method === "DELETE"
      ) {
        const email = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canUserDeleteObra(env, email, obraId))) {
          return json({
            ok: false,
            erro: "Usuário sem permissão para excluir a obra."
          }, 403);
        }

        const existing = await env.DB.prepare(`
          SELECT id, status, nome, codigo
          FROM obras
          WHERE id = ?
        `).bind(obraId).first();

        if (!existing || existing.status !== "ativa") {
          return json({
            ok: false,
            erro: "Obra não encontrada ou já excluída."
          }, 404);
        }

        const now = new Date().toISOString();

        await env.DB.batch([
          env.DB.prepare(`
            UPDATE obras
            SET status = 'excluida',
                updated_at = ?
            WHERE id = ?
          `).bind(now, obraId),

          env.DB.prepare(`
            UPDATE usuario_obras
            SET ativo = 0,
                updated_at = ?
            WHERE obra_id = ?
          `).bind(now, obraId),

          env.DB.prepare(`
            INSERT INTO audit_log (
              id,
              obra_id,
              usuario_email,
              acao,
              entidade,
              entidade_id,
              detalhes_json,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            obraId,
            email,
            "DELETE_OBRA",
            "obra",
            obraId,
            JSON.stringify({ nome: existing.nome, codigo: existing.codigo, statusAnterior: existing.status }),
            now
          )
        ]);

        return json({
          ok: true,
          obra_id: obraId,
          status: "excluida",
          updated_at: now
        });
      }

      // ============================================================
      // OBRAS — CARREGAR ESPECÍFICA
      // /api/obras/:id
      // ============================================================

      if (
        parts.length === 3 &&
        parts[0] === "api" &&
        parts[1] === "obras" &&
        method === "GET"
      ) {
        const email = getUserEmail(request);
        const obraId = parts[2];

        if (!(await canUserAccessObra(env, email, obraId))) {
          return json({
            ok: false,
            erro: "Obra não encontrada ou usuário sem permissão."
          }, 404);
        }

        const role = await getUserRole(env, email);

        const obra = await env.DB.prepare(`
          SELECT
            o.id,
            o.nome,
            o.codigo,
            o.descricao,
            o.state_json,
            o.revision,
            o.status,
            o.updated_at,
            COALESCE(uo.permissao, ?) AS permissao
          FROM obras o
          LEFT JOIN usuario_obras uo
            ON uo.obra_id = o.id
           AND uo.usuario_email = ?
           AND uo.ativo = 1
          WHERE o.id = ?
            AND o.status = 'ativa'
        `).bind(
          toBool(role.can_view_all_obras) ? role.role : "viewer",
          email,
          obraId
        ).first();

        if (!obra) {
          return json({
            ok: false,
            erro: "Obra não encontrada ou usuário sem permissão."
          }, 404);
        }

        return json({
          ok: true,
          obra: {
            id: obra.id,
            nome: obra.nome,
            codigo: obra.codigo,
            descricao: obra.descricao,
            revision: Number(obra.revision),
            status: obra.status,
            updated_at: obra.updated_at,
            permissao: obra.permissao,
            state: safeJsonParse(obra.state_json)
          }
        });
      }

      return json({
        ok: false,
        erro: "Rota não encontrada",
        path: url.pathname
      }, 404);

    } catch (error) {
      return json({
        ok: false,
        erro: error.message || String(error)
      }, 500);
    }
  }
};

// ============================================================
// HELPERS DE USUÁRIO / PERMISSÃO
// ============================================================

function getUserEmail(request) {
  return normalizeEmail(request.headers.get("x-plannus-user-email")) || "gabrielpsgyn@gmail.com";
}

async function ensureDefaultPlannerUser(env, email) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail !== "gabrielpsgyn@gmail.com") {
    return false;
  }

  const now = new Date().toISOString();
  const roleFlags = buildRoleFlags("planejador");

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO usuarios (
        email,
        nome,
        perfil_global,
        ativo,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        nome = excluded.nome,
        perfil_global = excluded.perfil_global,
        ativo = excluded.ativo,
        updated_at = excluded.updated_at
    `).bind(
      normalizedEmail,
      "Gabriel",
      "usuario",
      1,
      now
    ),

    env.DB.prepare(`
      INSERT INTO usuario_roles (
        usuario_email,
        role,
        can_view_all_obras,
        can_grant_permissions,
        can_manage_users,
        can_create_obras,
        ativo,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(usuario_email) DO UPDATE SET
        role = excluded.role,
        can_view_all_obras = excluded.can_view_all_obras,
        can_grant_permissions = excluded.can_grant_permissions,
        can_manage_users = excluded.can_manage_users,
        can_create_obras = excluded.can_create_obras,
        ativo = excluded.ativo,
        updated_at = excluded.updated_at
    `).bind(
      normalizedEmail,
      "planejador",
      roleFlags.can_view_all_obras,
      roleFlags.can_grant_permissions,
      roleFlags.can_manage_users,
      roleFlags.can_create_obras,
      1,
      now
    )
  ]);

  return true;
}

async function getUserRole(env, email) {
  const normalizedEmail = normalizeEmail(email);
  await ensureDefaultPlannerUser(env, normalizedEmail);

  const row = await env.DB.prepare(`
    SELECT
      u.email,
      u.nome,
      u.perfil_global,
      u.ativo AS usuario_ativo,
      COALESCE(ur.role, 'usuario') AS role,
      COALESCE(ur.can_view_all_obras, 0) AS can_view_all_obras,
      COALESCE(ur.can_grant_permissions, 0) AS can_grant_permissions,
      COALESCE(ur.can_manage_users, 0) AS can_manage_users,
      COALESCE(ur.can_create_obras, 0) AS can_create_obras,
      COALESCE(ur.ativo, u.ativo, 1) AS role_ativo
    FROM usuarios u
    LEFT JOIN usuario_roles ur
      ON ur.usuario_email = u.email
    WHERE u.email = ?
  `).bind(normalizedEmail).first();

  if (!row) {
  return {
    email: normalizedEmail,
    nome: null,
    role: "usuario",
    can_view_all_obras: 0,
    can_grant_permissions: 0,
    can_manage_users: 0,
    can_create_obras: 0,
    can_delete_obras: 0,
    ativo: 1
  };
}

  return {
    email: row.email,
    nome: row.nome,
    perfil_global: row.perfil_global,
    role: row.role || "usuario",
    can_view_all_obras: Number(row.can_view_all_obras || 0),
    can_grant_permissions: Number(row.can_grant_permissions || 0),
    can_manage_users: Number(row.can_manage_users || 0),
    can_create_obras: Number(row.can_create_obras || 0),
    can_delete_obras: Number(row.can_delete_obras || 0),
    ativo: Number(row.usuario_ativo || 0) === 1 && Number(row.role_ativo || 0) === 1 ? 1 : 0
  };
}

async function canUserAccessObra(env, email, obraId) {
  const role = await getUserRole(env, email);

  if (!toBool(role.ativo)) {
    return false;
  }

  if (toBool(role.can_view_all_obras)) {
    return true;
  }

  const direct = await env.DB.prepare(`
    SELECT 1 AS ok
    FROM usuario_obras
    WHERE usuario_email = ?
      AND obra_id = ?
      AND ativo = 1
    LIMIT 1
  `).bind(email, obraId).first();

  return !!direct;
}

async function canUserEditObra(env, email, obraId) {
  const role = await getUserRole(env, email);

  if (!toBool(role.ativo)) {
    return false;
  }

  if (role.role === "planejador" && toBool(role.can_view_all_obras)) {
    return true;
  }

  const direct = await env.DB.prepare(`
    SELECT permissao
    FROM usuario_obras
    WHERE usuario_email = ?
      AND obra_id = ?
      AND ativo = 1
    LIMIT 1
  `).bind(email, obraId).first();

  return !!direct && ["owner", "editor"].includes(direct.permissao);
}

async function canUserGrantPermissions(env, email) {
  const role = await getUserRole(env, email);
  return toBool(role.ativo) && toBool(role.can_grant_permissions);
}

async function canUserManageUsers(env, email) {
  const role = await getUserRole(env, email);
  return toBool(role.ativo) && toBool(role.can_manage_users);
}

async function canUserDeleteUser(env, email) {
  const role = await getUserRole(env, email);
  return toBool(role.ativo) && (toBool(role.can_manage_users) || role.role === "planejador");
}

async function canUserDeleteObra(env, email, obraId) {
  const role = await getUserRole(env, email);

  if (!toBool(role.ativo)) {
    return false;
  }

  if (role.role === "planejador" || toBool(role.can_delete_obras)) {
    return true;
  }

  return await isOwnerObra(env, email, obraId);
}

async function isOwnerObra(env, email, obraId) {
  const direct = await env.DB.prepare(`
    SELECT permissao
    FROM usuario_obras
    WHERE usuario_email = ?
      AND obra_id = ?
      AND ativo = 1
    LIMIT 1
  `).bind(email, obraId).first();

  return !!direct && direct.permissao === "owner";
}

async function canManageObraPermissions(env, email, obraId) {
  if (await canUserGrantPermissions(env, email)) {
    return true;
  }

  return await isOwnerObra(env, email, obraId);
}

// ============================================================
// HELPERS GERAIS
// ============================================================

const DEFAULT_SERVICE_CATALOG = [
  {
    id: "srv_alvenaria",
    codigo: "ALV",
    nome: "ALVENARIA",
    classificacao: "",
    cor: "#0F766E",
    eq: 1,
    duracao_padrao: 5,
    company_default: "",
    template_key: "",
    scope_kind: "todos",
    source_kind: "custom",
    ordem: 1,
    ativo: 1
  },
  {
    id: "srv_superestrutura",
    codigo: "SUP",
    nome: "SUPERESTRUTURA",
    classificacao: "",
    cor: "#9A3412",
    eq: 1,
    duracao_padrao: 5,
    company_default: "",
    template_key: "",
    scope_kind: "todos",
    source_kind: "custom",
    ordem: 2,
    ativo: 1
  }
];

const DEFAULT_EAP_TEMPLATES = [
  {
    key: "residencial_vertical_padrao",
    label: "Residencial vertical padrão",
    description: "Modelo inicial da obra com serviços comuns já cadastrados.",
    source_kind: "builtin",
    base_template_key: "residencial_vertical_padrao",
    draft_defaults: {
      clusterName: "Torre Principal",
      executionDirection: "baixo_alto",
      floorStart: 800,
      floorEnd: 3600,
      floorStep: 100,
      floorPrefix: "PAV",
      commonAreas: "HALL\nLAZER",
      specialAreas: "SS1\nÁTICO"
    },
    services: DEFAULT_SERVICE_CATALOG.map((svc, idx) => normalizeServiceCatalogInput(svc, idx))
  },
  {
    key: "condominio_horizontal_padrao",
    label: "Condomínio horizontal padrão",
    description: "Modelo simplificado para blocos horizontais e áreas de apoio.",
    source_kind: "builtin",
    base_template_key: "condominio_horizontal_padrao",
    draft_defaults: {
      clusterName: "Bloco Horizontal",
      executionDirection: "esquerda_direita",
      floorStart: 1,
      floorEnd: 40,
      floorStep: 1,
      floorPrefix: "UN",
      commonAreas: "PORTARIA\nGARAGEM",
      specialAreas: "CHURRASQUEIRA\nLAZER"
    },
    services: DEFAULT_SERVICE_CATALOG.map((svc, idx) => normalizeServiceCatalogInput(svc, idx))
  }
];

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function buildDefaultObraSeed(obraId, serviceCatalog = null) {
  const nowIso = new Date().toISOString();
  const baseCatalog = Array.isArray(serviceCatalog) && serviceCatalog.length
    ? serviceCatalog.map((svc, idx) => normalizeServiceCatalogInput(svc, idx))
    : DEFAULT_SERVICE_CATALOG.map((svc, idx) => normalizeServiceCatalogInput(svc, idx));
  const serviceBaseCatalog = baseCatalog.map((svc) => ({
    id: String(svc.id || '').trim(),
    obraId,
    name: String(svc.name || '').trim(),
    code: String(svc.code || '').trim(),
    classification: String(svc.classification || '').trim(),
    scopeKind: String(svc.scopeKind || 'todos').trim(),
    teams: Math.max(1, Number(svc.teams || 1) || 1),
    durationDefault: Math.max(1, Number(svc.durationDefault || 5) || 5),
    companyDefault: String(svc.companyDefault || '').trim(),
    templateKey: String(svc.templateKey || '').trim(),
    sourceKind: String(svc.sourceKind || 'custom').trim() || 'custom',
    color: String(svc.color || '').trim(),
    order: Number(svc.order || 0) || 0
  }));
  const guidedDraftServices = serviceBaseCatalog.map((svc, idx) => ({
    ...JSON.parse(JSON.stringify(svc)),
    predecessorServiceId: idx === 0 ? '' : serviceBaseCatalog[idx - 1].id,
    dependencyType: 'FS',
    lagDays: 0,
    locationOffsetAbove: 0,
    matchMode: 'same_location',
    expansionMode: 'per_location',
    sourceKind: 'builtin',
    predecessors: idx === 0 ? [] : [{
      fromServiceId: serviceBaseCatalog[idx - 1].id,
      type: 'FS',
      lagDays: 0,
      locationOffsetAbove: 0,
      matchMode: 'same_location',
      expansionMode: 'per_location',
      sourceKind: 'builtin'
    }]
  }));
  const dependencies = serviceBaseCatalog.slice(1).map((svc, idx) => ({
    id: `dep_seed_${idx + 1}`,
    obraId,
    predecessorServiceId: serviceBaseCatalog[idx].id,
    successorServiceId: svc.id,
    type: 'FS',
    lagDays: 0,
    escopoAplicacao: 'MESMO_LOCAL',
    obrigatoria: true
  }));
  const cycles = serviceBaseCatalog.map((svc) => ({
    serviceId: svc.id,
    locationsInOrder: [],
    durationDefault: Number(svc.durationDefault || 5) || 5,
    teams: Number(svc.teams || 1) || 1,
    mode: 'serial',
    lockLocations: true,
    source: 'seed',
    importBasis: 'seed',
    importTeamBranches: [],
    teamScopes: []
  }));
  return {
    services: JSON.parse(JSON.stringify(serviceBaseCatalog)),
    serviceBaseCatalog: JSON.parse(JSON.stringify(serviceBaseCatalog)),
    dependencies,
    cycles
  };
}

function buildInitialObraState({ id, nome, codigo, descricao }, serviceCatalog = null) {
  const seeded = buildDefaultObraSeed(id, serviceCatalog);
  return {
    version: "1.0",
    obra: {
      id,
      nome,
      codigo: codigo || null,
      descricao: descricao || ""
    },
    services: seeded.services,
    serviceBaseCatalog: seeded.serviceBaseCatalog,
    locations: [],
    blocks: [],
    baseline: {
      blocks: []
    },
    plan: {
      blocks: []
    },
    deps: seeded.dependencies,
    cycles: seeded.cycles,
    acompanhamento: {},
    config: {}
  };
}

function normalizeServiceCatalogInput(svc, idx = 0) {
  const code = String(svc?.code || svc?.codigo || "").trim();
  const name = String(svc?.name || svc?.nome || "").trim();
  const slug = String(svc?.id || svc?.key || "").trim() ||
    `srv_${slugify(`${code || name || "service"}_${idx + 1}`)}`;

  return {
    id: slug,
    code,
    name,
    classification: String(svc?.classification || svc?.classificacao || "").trim(),
    color: String(svc?.color || svc?.cor || "").trim() || colorFromKey(slug),
    eq: Math.max(1, Number(svc?.eq || svc?.teams || 1) || 1),
    durationDefault: Math.max(1, Number(svc?.durationDefault || svc?.duracao_padrao || 5) || 5),
    companyDefault: String(svc?.companyDefault || svc?.company_default || "").trim(),
    templateKey: String(svc?.templateKey || svc?.template_key || "").trim(),
    scopeKind: String(svc?.scopeKind || svc?.scope_kind || "todos").trim() || "todos",
    sourceKind: String(svc?.sourceKind || svc?.source_kind || "custom").trim() || "custom",
    order: Number(svc?.order || svc?.ordem || idx + 1) || idx + 1,
    ativo: toBool(svc?.ativo ?? svc?.active ?? 1) ? 1 : 0
  };
}

function normalizeServiceCatalogRow(row, idx = 0) {
  const svc = normalizeServiceCatalogInput({
    id: row?.id,
    code: row?.code,
    codigo: row?.code,
    name: row?.name,
    nome: row?.name,
    classification: row?.classification,
    classificacao: row?.classification,
    color: row?.color,
    cor: row?.color,
    eq: row?.eq,
    teams: row?.eq,
    durationDefault: row?.duration_default,
    duracao_padrao: row?.duration_default,
    companyDefault: row?.company_default,
    company_default: row?.company_default,
    templateKey: row?.template_key,
    template_key: row?.template_key,
    scopeKind: row?.scope_kind,
    scope_kind: row?.scope_kind,
    sourceKind: row?.source_kind,
    source_kind: row?.source_kind,
    order: row?.order_index,
    ordem: row?.order_index,
    ativo: row?.ativo
  }, idx);

  return {
    ...svc,
    obraId: row?.obra_id || row?.obraId || null
  };
}

function normalizeEapTemplateInput(template, idx = 0) {
  const key = String(template?.key || template?.template_key || "").trim() ||
    `eap_${slugify(`${template?.label || template?.name || "template"}_${idx + 1}`)}`;
  const services = Array.isArray(template?.services)
    ? template.services.map((svc, serviceIdx) => normalizeServiceCatalogInput(svc, serviceIdx))
    : [];
  const draftDefaults = template?.draft_defaults && typeof template.draft_defaults === "object"
    ? template.draft_defaults
    : template?.draft && typeof template.draft === "object"
      ? template.draft
      : {};

  return {
    key,
    label: String(template?.label || template?.name || key).trim(),
    description: String(template?.description || "").trim(),
    sourceKind: String(template?.source_kind || template?.sourceKind || "custom").trim() || "custom",
    baseTemplateKey: String(template?.base_template_key || template?.baseTemplateKey || "").trim(),
    orderIndex: Number(template?.order_index || template?.orderIndex || idx + 1) || idx + 1,
    ativo: toBool(template?.ativo ?? template?.active ?? 1) ? 1 : 0,
    draftJson: JSON.stringify(draftDefaults || {}),
    servicesJson: JSON.stringify(services),
  };
}

function normalizeEapTemplateRow(row, idx = 0) {
  const draftDefaults = safeJsonParse(row?.draft_json || row?.draft_defaults || "{}");
  const services = safeJsonParse(row?.services_json || row?.services || "[]");

  return {
    key: String(row?.key || "").trim(),
    label: String(row?.label || "").trim(),
    description: String(row?.description || "").trim(),
    source_kind: String(row?.source_kind || "custom").trim() || "custom",
    base_template_key: String(row?.base_template_key || "").trim(),
    order_index: Number(row?.order_index || idx + 1) || idx + 1,
    ativo: toBool(row?.ativo),
    draft_defaults: draftDefaults && typeof draftDefaults === "object" ? draftDefaults : {},
    services: Array.isArray(services)
      ? services.map((svc, serviceIdx) => normalizeServiceCatalogInput(svc, serviceIdx))
      : [],
    created_at: row?.created_at || null,
    updated_at: row?.updated_at || null
  };
}

async function ensureServiceCatalogSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS servicos_base (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      classification TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '',
      eq INTEGER NOT NULL DEFAULT 1,
      duration_default INTEGER NOT NULL DEFAULT 5,
      company_default TEXT NOT NULL DEFAULT '',
      template_key TEXT NOT NULL DEFAULT '',
      scope_kind TEXT NOT NULL DEFAULT 'todos',
      source_kind TEXT NOT NULL DEFAULT 'custom',
      order_index INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

async function ensureEapTemplateSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS eap_templates (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      source_kind TEXT NOT NULL DEFAULT 'custom',
      base_template_key TEXT NOT NULL DEFAULT '',
      order_index INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      draft_json TEXT NOT NULL DEFAULT '{}',
      services_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
}

async function loadServiceCatalogFromDb(env) {
  await ensureServiceCatalogSchema(env);

  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM servicos_base
  `).first();

  if (!Number(countResult?.total || 0)) {
    const now = new Date().toISOString();
    const seedRows = DEFAULT_SERVICE_CATALOG.map((svc, idx) => normalizeServiceCatalogInput(svc, idx));

    await env.DB.batch(seedRows.map((svc) => env.DB.prepare(`
      INSERT OR REPLACE INTO servicos_base (
        id, code, name, classification, color, eq, duration_default,
        company_default, template_key, scope_kind, source_kind, order_index,
        ativo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      svc.id,
      svc.code,
      svc.name,
      svc.classification,
      svc.color,
      svc.eq,
      svc.durationDefault,
      svc.companyDefault,
      svc.templateKey,
      svc.scopeKind,
      svc.sourceKind,
      svc.order,
      svc.ativo,
      now,
      now
    )));
  }

  const result = await env.DB.prepare(`
    SELECT
      id,
      code,
      name,
      classification,
      color,
      eq,
      duration_default,
      company_default,
      template_key,
      scope_kind,
      source_kind,
      order_index,
      ativo,
      created_at,
      updated_at
    FROM servicos_base
    ORDER BY order_index ASC, name COLLATE NOCASE ASC, id ASC
  `).all();

  return (result.results || []).map((row, idx) => normalizeServiceCatalogRow(row, idx));
}

async function loadEapTemplatesFromDb(env) {
  await ensureEapTemplateSchema(env);

  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM eap_templates
  `).first();

  if (!Number(countResult?.total || 0)) {
    const now = new Date().toISOString();
    const seedRows = DEFAULT_EAP_TEMPLATES.map((template, idx) => normalizeEapTemplateInput(template, idx));

    await env.DB.batch(seedRows.map((template) => env.DB.prepare(`
      INSERT OR REPLACE INTO eap_templates (
        key, label, description, source_kind, base_template_key, order_index,
        ativo, draft_json, services_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      template.key,
      template.label,
      template.description,
      template.sourceKind,
      template.baseTemplateKey,
      template.orderIndex,
      template.ativo,
      template.draftJson,
      template.servicesJson,
      now,
      now
    )));
  }

  const result = await env.DB.prepare(`
    SELECT
      key,
      label,
      description,
      source_kind,
      base_template_key,
      order_index,
      ativo,
      draft_json,
      services_json,
      created_at,
      updated_at
    FROM eap_templates
    ORDER BY order_index ASC, label COLLATE NOCASE ASC, key ASC
  `).all();

  return (result.results || []).map((row, idx) => normalizeEapTemplateRow(row, idx));
}

async function replaceEapTemplates(env, templates, actorEmail = null) {
  await ensureEapTemplateSchema(env);
  const now = new Date().toISOString();
  const rows = (Array.isArray(templates) ? templates : [])
    .map((template, idx) => normalizeEapTemplateInput(template, idx))
    .filter((template) => template.key && template.label);

  if (!rows.length) {
    return [];
  }

  const queries = [
    env.DB.prepare(`DELETE FROM eap_templates`)
  ];

  for (const template of rows) {
    queries.push(env.DB.prepare(`
      INSERT OR REPLACE INTO eap_templates (
        key, label, description, source_kind, base_template_key, order_index,
        ativo, draft_json, services_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      template.key,
      template.label,
      template.description,
      template.sourceKind,
      template.baseTemplateKey,
      template.orderIndex,
      template.ativo,
      template.draftJson,
      template.servicesJson,
      now,
      now
    ));
  }

  await env.DB.batch(queries);

  const saved = await loadEapTemplatesFromDb(env);
  console.log("[API][EAP]", {
    actorEmail,
    total: saved.length
  });
  return saved;
}

async function replaceServiceCatalog(env, services, actorEmail = null) {
  await ensureServiceCatalogSchema(env);
  const now = new Date().toISOString();
  const rows = (Array.isArray(services) ? services : [])
    .map((svc, idx) => normalizeServiceCatalogInput(svc, idx))
    .filter((svc) => svc.id && svc.name);

  if (!rows.length) {
    return [];
  }

  const queries = [
    env.DB.prepare(`DELETE FROM servicos_base`)
  ];

  for (const svc of rows) {
    queries.push(env.DB.prepare(`
      INSERT OR REPLACE INTO servicos_base (
        id, code, name, classification, color, eq, duration_default,
        company_default, template_key, scope_kind, source_kind, order_index,
        ativo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      svc.id,
      svc.code,
      svc.name,
      svc.classification,
      svc.color,
      svc.eq,
      svc.durationDefault,
      svc.companyDefault,
      svc.templateKey,
      svc.scopeKind,
      svc.sourceKind,
      svc.order,
      svc.ativo,
      now,
      now
    ));
  }

  await env.DB.batch(queries);

  const saved = await loadServiceCatalogFromDb(env);
  console.log("[API][SERVICOS]", {
    actorEmail,
    total: saved.length
  });
  return saved;
}

function buildRoleFlags(role, body = {}) {
  if (role === "planejador") {
    return {
      can_view_all_obras: 1,
      can_grant_permissions: 1,
      can_manage_users: 1,
      can_create_obras: 1,
      can_delete_obras: 1
    };
  }

  if (role === "gestor") {
    return {
      can_view_all_obras: toFlag(body.can_view_all_obras, 1),
      can_grant_permissions: toFlag(body.can_grant_permissions, 1),
      can_manage_users: toFlag(body.can_manage_users, 0),
      can_create_obras: toFlag(body.can_create_obras, 1),
      can_delete_obras: toFlag(body.can_delete_obras, 0)
    };
  }

  return {
    can_view_all_obras: toFlag(body.can_view_all_obras, 0),
    can_grant_permissions: toFlag(body.can_grant_permissions, 0),
    can_manage_users: toFlag(body.can_manage_users, 0),
    can_create_obras: toFlag(body.can_create_obras, 0),
    can_delete_obras: toFlag(body.can_delete_obras, 0)
  };
}

function normalizeRole(role) {
  const value = String(role || "usuario").trim().toLowerCase();

  if (["planejador", "gestor", "usuario", "bloqueado"].includes(value)) {
    return value;
  }

  return "usuario";
}

function normalizeObraPermissao(permissao) {
  const value = String(permissao || "viewer").trim().toLowerCase();

  if (["owner", "editor", "viewer"].includes(value)) {
    return value;
  }

  return "viewer";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function nullableText(value) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

function colorFromKey(key) {
  const text = String(key || "service");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  const palette = ["#0F766E", "#9A3412", "#14532D", "#7C2D12", "#1D4ED8", "#7C3AED"];
  return palette[Math.abs(hash) % palette.length];
}

function toBool(value) {
  return Number(value || 0) === 1 || value === true;
}

function toFlag(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  return toBool(value) ? 1 : 0;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function json(data, status = 200) {
  return corsResponse(JSON.stringify(data, null, 2), status, {
    "Content-Type": "application/json; charset=utf-8"
  });
}

function corsResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      ...headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-plannus-user-email"
    }
  });
}

