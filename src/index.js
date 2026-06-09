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

        const state = buildInitialObraState({
          id: obraId,
          nome,
          codigo,
          descricao
        });

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

async function getUserRole(env, email) {
  const normalizedEmail = normalizeEmail(email);

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

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function buildInitialObraState({ id, nome, codigo, descricao }) {
  return {
    version: "1.0",
    obra: {
      id,
      nome,
      codigo: codigo || null,
      descricao: descricao || ""
    },
    services: [],
    locations: [],
    blocks: [],
    baseline: {
      blocks: []
    },
    plan: {
      blocks: []
    },
    deps: [],
    cycles: [],
    acompanhamento: {},
    config: {}
  };
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-plannus-user-email"
    }
  });
}
