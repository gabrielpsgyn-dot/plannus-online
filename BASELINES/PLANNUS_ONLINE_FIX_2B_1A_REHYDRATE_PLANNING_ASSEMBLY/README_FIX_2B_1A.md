# PLANNUS_ONLINE_FIX_2B_1A_REHYDRATE_PLANNING_ASSEMBLY

Data: 2026-05-29

## Problema
A obra abria com `state.services` e `state.plan.blocks` preenchidos, porém sem contrato de montagem ativo:
- `state.planningAssembly.activePhaseId = null`
- `state.planningAssembly.phases = []`

## Causa provável
Estados antigos/legados chegam sem assembly persistido por fase. A FIX_2B_1 exigia fase ativa para sincronizar snapshot, então não conseguia agir nesses casos.

## Correção aplicada
Criada função `rehydratePlanningAssemblyIfMissing(state, obraId)` para reidratar o contrato de fase somente quando o assembly estiver ausente/incompleto.

## Ordem de fontes de reidratação
1. `state.__plannusAux.planningAssembly.store`
2. `localStorage.PLANNUS_PLANNING_ASSEMBLY_STORE_V1`
3. `localStorage.PLANNUS_PLANNING_ASSEMBLY_V1`
4. `state.eap.draft`
5. `localStorage.PLANNUS_GUIDED_EAP_DRAFT_V1`
6. fallback mínimo com `state.services/cycles/dependencies/locations/serviceLocationMap`

## Garantias
- Não altera `state.plan.blocks`.
- Não altera `state.blocks`.
- Não chama `generateBlocks`.
- Não chama apply automaticamente.
- Não salva online automaticamente.
- Não altera baseline/acompanhamento.
- API/D1/Worker não alterados.
- `PUBLIC_DEPLOY` não foi editado manualmente.
