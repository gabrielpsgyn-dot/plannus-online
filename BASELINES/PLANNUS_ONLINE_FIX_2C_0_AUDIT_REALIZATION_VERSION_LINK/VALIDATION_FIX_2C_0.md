# VALIDATION_FIX_2C_0

Data: 2026-06-09

## Checklist

- [ ] Plannus abre
- [ ] obra online abre
- [ ] `window.PLANNUS_AUDIT_REALIZATION_VERSION_LINK()` existe
- [ ] `activePlanningVersionId` é retornado
- [ ] `activeVersionFound` é retornado
- [ ] `currentPlanBlocksCount` reflete `state.plan.blocks`
- [ ] `stateBlockEditsTotal` reflete `state.blockEdits`
- [ ] `legacyBlockEditsTotal` reflete `QP_BLOCK_EDIT_V3`
- [ ] `matchedByBlockId` é calculado
- [ ] `matchedByServiceLocation` é calculado
- [ ] `matchedByNameFallback` é calculado
- [ ] `unmatchedRealizationEntries` é calculado
- [ ] `orphanRealizationCount` é calculado
- [ ] `samples` traz exemplos limitados
- [ ] nenhum dado foi alterado
- [ ] API/D1/Worker não foram alterados
- [ ] `PUBLIC_DEPLOY` não foi editado manualmente

## Teste manual
Abrir o console e executar:

```js
window.PLANNUS_AUDIT_REALIZATION_VERSION_LINK()
```

Verificar se o retorno mostra o vínculo entre a versão aplicada ativa e o realizado atual sem escrever nada no storage.
