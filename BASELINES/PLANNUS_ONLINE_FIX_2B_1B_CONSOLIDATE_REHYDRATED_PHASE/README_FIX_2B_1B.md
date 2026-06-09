# PLANNUS_ONLINE_FIX_2B_1B_CONSOLIDATE_REHYDRATED_PHASE

Data: 2026-05-29

## Problema tratado
A fase reidratada podia existir com contrato parcial (campos ausentes em `baseSnapshot.model`, timestamps e metadados de tipo/status), gerando fragilidade para leitura posterior do apply/assembly.

## Correção aplicada
Criada `consolidateRehydratedPlanningPhase(state)` para consolidar somente a fase ativa quando ela for reidratada (`source = rehydrated-*`).

## O que consolida
- `id`
- `label`
- `createdAtISO`
- `updatedAtISO`
- `source`
- `status` (recovered)
- `type` (rehydrated)
- `baseSnapshot.model.services`
- `baseSnapshot.model.cycles`
- `baseSnapshot.model.dependencies`
- `baseSnapshot.model.locations`
- `baseSnapshot.model.serviceLocationMap`

## Regras preservadas
- Não altera `state.plan.blocks`.
- Não altera `state.blocks`.
- Não chama `generateBlocks`.
- Não chama apply automaticamente.
- Não altera baseline.
- Não altera acompanhamento/realizado.
- Não altera API/D1/Worker.
- Não edita `PUBLIC_DEPLOY` manualmente.
