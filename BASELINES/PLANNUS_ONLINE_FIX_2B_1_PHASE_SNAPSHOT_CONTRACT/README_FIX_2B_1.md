# PLANNUS_ONLINE_FIX_2B_1_PHASE_SNAPSHOT_CONTRACT

Data: 2026-05-29

## Problema
No apply, a fase ativa existia, mas o snapshot da fase (`baseSnapshot.model.services`) podia vir vazio (`snapshotServices = 0`) enquanto o modelo vivo tinha serviços (`liveServices > 0`).

## Causa
O fluxo de aplicação podia cair em fallback para `draftModel` sem antes consolidar esse conteúdo como snapshot da fase ativa.

## Correção incremental aplicada
- Criada `syncActivePhaseSnapshotBeforeApply(draftModelArg)`.
- Antes de escolher fonte no `_applyGuidedPlanningModelCore`, o sistema tenta sincronizar snapshot da fase ativa com o modelo vivo quando:
  - snapshot vazio; ou
  - snapshot incompleto vs. live model.
- A sincronização grava no assembly da fase ativa via `_savePlanningAssemblyState` e preserva `activePhaseId`.
- Não sobrescreve fase válida com vazio.

## Logs adicionados
- `[PLANNING_PHASE_SNAPSHOT]`
- `[PLANNING_APPLY_SOURCE]`

## Escopo preservado
- API/D1/Worker não alterados.
- Sem migration/tabela nova.
- Sem alteração profunda em `generateBlocks`.
- Sem alteração de baseline e acompanhamento por regra desta fix.
- `PUBLIC_DEPLOY` não foi editado manualmente.
