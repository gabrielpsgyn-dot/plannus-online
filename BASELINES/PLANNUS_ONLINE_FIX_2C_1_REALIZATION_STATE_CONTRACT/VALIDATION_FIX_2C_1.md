# VALIDATION_FIX_2C_1

Data: 2026-06-09

## Checklist

- [ ] Plannus abre
- [ ] obra online abre
- [ ] `activePlanningVersionId` existe
- [ ] `state.realization` é criado
- [ ] `entriesByVersion[activePlanningVersionId]` existe
- [ ] novo RI/RF grava em `state.realization`
- [ ] novo RI/RF mantém compatibilidade com `QP_BLOCK_EDIT_V3`
- [ ] `getRealizationByBlock()` lê `state.realization` primeiro
- [ ] fallback legado continua funcionando
- [ ] auditoria mostra `canonicalEntriesForActiveVersion`
- [ ] auditoria mostra `legacyOnlyEntries`
- [ ] `PLANNUS_SYNC_LEGACY_REALIZATION_TO_STATE(false)` não escreve
- [ ] `PLANNUS_SYNC_LEGACY_REALIZATION_TO_STATE(true)` só migra entradas seguras
- [ ] órfãos não são migrados
- [ ] `state.plan.blocks` não foi alterado
- [ ] `state.blocks` não foi alterado
- [ ] baseline não foi alterada
- [ ] acompanhamento visual não foi quebrado
- [ ] API/D1/Worker não foram alterados
- [ ] `PUBLIC_DEPLOY` não foi editado manualmente

## Teste manual
Executar no console:

```js
window.PLANNUS_AUDIT_REALIZATION_VERSION_LINK()
window.PLANNUS_SYNC_LEGACY_REALIZATION_TO_STATE(false)
window.PLANNUS_SYNC_LEGACY_REALIZATION_TO_STATE(true)
```
