# PLANNUS_ONLINE_FIX_2A_STATE_CONTRACT

Data: 2026-05-29

## Causa raiz confirmada
O estado de EAP/planejamento estava fragmentado entre `window.state`, localStorage global (`PLANNUS_*`, `QP_*`) e `__plannusAux`.
Isso causava divergência entre obra aberta e dados legados do navegador.

## Por que `__plannusAux` era temporário
`__plannusAux` era usado como transporte de legado (snapshot de localStorage global) e não como contrato canônico por obra.
Nesta FIX_2A ele permanece apenas como `legacy backup` (deprecated), não como fonte principal.

## Novo contrato canônico de state
A função `ensurePlanningStateContract(state)` garante os namespaces:
- `state.eap`
- `state.planningAssembly`
- `state.planningVersions`
- `state.operational`
- `state.blockEdits`
- `state._migrations`

Sem apagar:
- `state.services`, `state.cycles`, `state.dependencies`, `state.plan`, `state.blocks`
- `state.baseline`
- `state.acompanhamento`

## Funções criadas
- `ensurePlanningStateContract(state)`
- `getObraScopedStorageKey(obraId, domain)`
- `migrateLegacyPlanningLocalStorageIntoState(state, obraId)`
- `writePlanningStateScopedCache(state, obraId)`
- `buildLegacyAuxBackupFromState(state, obraId)`

## Migração de legado
`migrateLegacyPlanningLocalStorageIntoState(...)` lê chaves globais legadas:
- `PLANNUS_GUIDED_EAP_DRAFT_V1`
- `PLANNUS_GUIDED_EAP_LIBRARY_V1`
- `PLANNUS_GUIDED_EAP_LAST_SAVED_TEMPLATE_V1`
- `PLANNUS_PLANNING_ASSEMBLY_STORE_V1`
- `PLANNUS_PLANNING_ASSEMBLY_V1`
- `QP_OPERATIONAL_V1`
- `QP_OPERATIONAL_MONTHLY_V1`
- `QP_BLOCK_EDIT_V3`

E preenche o contrato canônico quando o estado estiver vazio nesse domínio.
Não remove o legado antigo.

## Cache local escopado por obra
`writePlanningStateScopedCache(...)` grava por obra:
- `plannus.obra.<obraId>.eap`
- `plannus.obra.<obraId>.planningAssembly`
- `plannus.obra.<obraId>.operational`
- `plannus.obra.<obraId>.blockEdits`

Fallback quando não houver `obraId`:
- `plannus.obra.local.<domain>`

## Integração no fluxo
- `getCurrentConsolidatedPlannusState()` agora:
  1. garante contrato
  2. migra legado para state
  3. grava cache escopado por obra
  4. mantém `__plannusAux` apenas como backup deprecated

- `openObra(...)` agora:
  1. garante contrato no state carregado
  2. migra legado para state (se necessário)
  3. grava cache escopado por obra

## Escopo de alteração
- API/D1/Worker: não alterados
- PUBLIC_DEPLOY: não editado manualmente
- Visual/UX: sem alteração proposital
