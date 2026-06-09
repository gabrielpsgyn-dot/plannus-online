# PLANNUS_ONLINE_FIX_2B_2A_PRESERVE_ACTIVE_PLANNING_VERSION_ID

Data: 2026-06-09

## Problema
`activePlanningVersionId` era criado corretamente pelo contrato de versão aplicada, mas podia ser perdido em runtime porque `saveOperational()` recriava `state.operational` e `clearOperational()` zerava o contrato operacional.

## Correção aplicada
- Criado `getCurrentActivePlanningVersionId(state)`.
- Criado `preserveOperationalPlanningVersionId(nextOperational, prevState)`.
- `saveOperational()` agora preserva o vínculo da versão ativa.
- `clearOperational()` agora preserva `state.operational.activePlanningVersionId` quando existe versão válida.
- `ensureAppliedPlanningVersionContract()` reforça o vínculo com `state.operational.activePlanningVersionId`.
- Auditoria atualizada em `window.PLANNUS_AUDIT_PLANNING_VERSION_CONTRACT()`.

## Escopo preservado
- Sem mudança em API/D1/Worker.
- Sem migration/tabela nova.
- Sem reindexação de RI/RF.
- Sem alteração de `state.plan.blocks` ou `state.blocks`.
- Sem alteração de baseline/acompanhamento.
- Sem edição manual de `PUBLIC_DEPLOY`.
