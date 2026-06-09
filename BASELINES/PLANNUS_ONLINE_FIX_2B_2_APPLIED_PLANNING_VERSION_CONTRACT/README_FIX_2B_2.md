# PLANNUS_ONLINE_FIX_2B_2_APPLIED_PLANNING_VERSION_CONTRACT

Data: 2026-05-29

## Objetivo
Separar contrato de montagem/fase (`planningAssembly`) do contrato de versão aplicada (`planningVersions` + `operational.activePlanningVersionId`), sem alterar a malha de blocos atual.

## Diferença de papéis
- `planningAssembly`: estrutura/fase de montagem (origem e contexto da fase ativa).
- `planningVersions`: registro da versão aplicada da malha atual para referência do acompanhamento.
- `state.plan.blocks`: continua sendo malha visual/canônica em runtime.

## O que foi implementado
- `buildPlanningVersionSignature(state)` cria assinatura determinística leve.
- `ensureAppliedPlanningVersionContract(state, options)` cria/reutiliza versão aplicada.
- vínculo ativo em `state.operational.activePlanningVersionId`.
- helper de auditoria: `window.PLANNUS_AUDIT_PLANNING_VERSION_CONTRACT()`.

## Garantias
- Sem alteração de `state.plan.blocks`.
- Sem alteração de `state.blocks`.
- Sem `generateBlocks`.
- Sem apply automático.
- Sem reindexação RI/RF.
- Sem remoção de `QP_BLOCK_EDIT_V3` / `state.blockEdits`.
- API/D1/Worker não alterados.
- `PUBLIC_DEPLOY` não editado manualmente.
