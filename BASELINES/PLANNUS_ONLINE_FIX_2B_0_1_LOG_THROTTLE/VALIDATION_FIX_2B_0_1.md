# VALIDATION_FIX_2B_0_1

- [ ] Plannus abre normalmente
- [ ] Obra online abre normalmente
- [ ] Console não mostra spam contínuo de `[FOLLOWUP_BLOCKS_RESOLVER]` com auditoria desligada
- [ ] Com `window.__PLANNUS_AUDIT_REALIZATION = true`, log aparece no máximo 1x a cada 2s
- [ ] `window.PLANNUS_AUDIT_FOLLOWUP_LINKS()` continua exibindo diagnóstico
- [ ] `getCanonicalPlannerBlocksForFollowUp()` mantém o mesmo retorno (`blocks`, `source`, `counts`)
- [ ] API/D1/Worker não foram alterados
- [ ] `PUBLIC_DEPLOY` não foi editado manualmente
