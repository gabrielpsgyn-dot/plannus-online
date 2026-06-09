# PLANNUS_ONLINE_FIX_2C_0_AUDIT_REALIZATION_VERSION_LINK

Data: 2026-06-09

## Objetivo
Auditar o vínculo atual do realizado RI/RF com a versão aplicada ativa, sem alterar dados, sem reindexar e sem mexer em persistência.

## O que a auditoria usa
- `state.operational.activePlanningVersionId`
- `state.planningVersions`
- `state.plan.blocks` como malha canônica
- `state.blockEdits`
- `QP_BLOCK_EDIT_V3` apenas como leitura legada

## O que a auditoria retorna
- ID da versão aplicada ativa.
- Se a versão ativa foi encontrada.
- Quantidade de blocos canônicos da malha atual.
- Quantidade de edições RI/RF no state e no legado.
- Casamentos por `blockId`, `serviceId/locationId` e fallback por nome.
- Entradas órfãs.
- Amostras e avisos.

## Garantias
- Sem alteração de RI/RF.
- Sem reindexação de RI/RF.
- Sem alteração de `state.blockEdits`.
- Sem alteração de `state.plan.blocks`.
- Sem alteração de `state.blocks`.
- Sem alteração de baseline/acompanhamento.
- API/D1/Worker não alterados.
- `PUBLIC_DEPLOY` não editado manualmente.
