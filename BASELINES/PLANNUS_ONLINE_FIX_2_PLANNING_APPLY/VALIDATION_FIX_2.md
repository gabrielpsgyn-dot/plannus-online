# VALIDATION_FIX_2

Data: 2026-05-29

## Checklist

- [ ] Plannus abre
- [ ] obra online abre
- [ ] dados auxiliares de EAP/planejamento sao restaurados ao abrir obra
- [ ] modelo de EAP salvo continua disponivel apos abrir obra online
- [ ] montagem de planejamento permanece apos salvar e abrir obra
- [ ] aplicar planejamento usa a fase ativa correta
- [ ] etapas editadas sao aplicadas mesmo se usuario nao clicar manualmente em Salvar alteracoes
- [ ] aplicar planejamento gera services/cycles/dependencies
- [ ] aplicar planejamento gera plan.blocks/state.blocks
- [ ] se generateBlocks falhar, estado anterior e restaurado
- [ ] baseline nao e apagada
- [ ] acompanhamento/realizado nao e apagado
- [ ] salvar online inclui __plannusAux
- [ ] abrir online hidrata __plannusAux
- [ ] revision continua subindo
- [ ] API/D1/Worker nao foram alterados
- [ ] PUBLIC_DEPLOY foi regenerado

## Logs esperados

- `[ONLINE_STATE_CONSOLIDATION]`
- `[ONLINE_STATE_HYDRATION]`
- `[PLANNING_APPLY_AUDIT]`
- `[PLANNING_APPLY_TRANSACTION]`
