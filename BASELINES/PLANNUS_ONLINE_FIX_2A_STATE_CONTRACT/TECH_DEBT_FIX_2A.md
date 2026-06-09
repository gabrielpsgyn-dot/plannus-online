# TECH_DEBT_FIX_2A

Data: 2026-05-29

## Dívida técnica remanescente
1. localStorage global legado (`PLANNUS_*`, `QP_*`) ainda existe por compatibilidade.
2. `__plannusAux` ainda existe como backup/deprecated para transição.
3. `_applyGuidedPlanningModelCore` ainda usa parte do fluxo legado e será tratado na FIX_2B.
4. `generateBlocks` ainda depende de pontos legados e será revisado na FIX_2B.
5. Coexistência de fluxo monolítico no `index.html` com estrutura modular em `src/`.

## Próxima etapa (FIX_2B)
1. Fazer `_applyGuidedPlanningModelCore` ler prioritariamente de `state.eap`, `state.planningAssembly` e `state.planningVersions`.
2. Reduzir leitura direta de localStorage global no apply.
3. Reforçar transação de apply + rollback com validação de blocos gerados.
4. Preservar baseline/acompanhamento explicitamente no fluxo de apply.

## Recomendação futura de normalização no banco (não executar agora)
- `eap_models`
- `planning_versions`
- `obra_active_planning_version`
