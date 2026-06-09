# PLANNUS_ONLINE_FIX_2B_0_1_LOG_THROTTLE

Data: 2026-05-29

## Problema
O log `[FOLLOWUP_BLOCKS_RESOLVER]` estava incondicional dentro de `getCanonicalPlannerBlocksForFollowUp()`, gerando spam no console em toda renderização.

## Causa confirmada
`console.log("[FOLLOWUP_BLOCKS_RESOLVER]", ...)` executava sempre, independentemente do modo de auditoria.

## Correção aplicada
- Criada função `shouldLogFollowUpBlocksResolver()`.
- Regra:
  - se `window.__PLANNUS_AUDIT_REALIZATION !== true`, não loga;
  - se `=== true`, loga no máximo 1 vez a cada 2 segundos.
- O log manual de `window.PLANNUS_AUDIT_FOLLOWUP_LINKS()` foi mantido.

## Escopo preservado
- Sem alteração de API/Worker/D1.
- Sem alteração de apply/generateBlocks.
- Sem alteração de retorno de `getCanonicalPlannerBlocksForFollowUp()`.
- Sem edição manual de `PUBLIC_DEPLOY`.
