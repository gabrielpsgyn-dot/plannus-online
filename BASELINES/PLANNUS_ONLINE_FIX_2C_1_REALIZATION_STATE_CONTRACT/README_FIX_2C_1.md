# PLANNUS_ONLINE_FIX_2C_1_REALIZATION_STATE_CONTRACT

Data: 2026-06-09

## Problema
O RI/RF novo já era lido corretamente pela malha atual, mas ainda vivia apenas no legado `QP_BLOCK_EDIT_V3`. Faltava um contrato canônico versionado em `state`.

## O que foi criado
- `ensureRealizationStateContract(state)`
- `buildRealizationStableKey(block)`
- `getCanonicalRealizationEntry(block, options)`
- `syncLegacyRealizationIntoStateForActiveVersion(state, options)`
- `window.PLANNUS_SYNC_LEGACY_REALIZATION_TO_STATE(confirm)`
- auditoria atualizada em `window.PLANNUS_AUDIT_REALIZATION_VERSION_LINK()`

## Novo contrato
`state.realization` passa a conter:
- `version`
- `activePlanningVersionId`
- `entriesByVersion`
- `updatedAtISO`

## Regra de leitura
- primeiro `state.realization`
- depois `state.blockEdits`
- depois `QP_BLOCK_EDIT_V3`
- fallback legado final apenas para compatibilidade

## Garantias
- `state.plan.blocks` não foi alterado.
- `state.blocks` não foi alterado.
- baseline e acompanhamento visual não foram alterados.
- API/D1/Worker não foram alterados.
- `PUBLIC_DEPLOY` não foi editado manualmente.
