# TECH_DEBT_REV_4

Data: 2026-05-29

## Divida tecnica remanescente

1. O frontend ativo ainda esta concentrado no `index.html` monolitico.
2. Ainda existe coexistencia com o fluxo modular em `src/`.
3. O helper `j(url, opts)` ainda existe apenas como base interna de `PlannusOnlineRepository.request(...)`.
4. `ONLINE_PANEL_CTX` reduziu variaveis globais soltas, mas o painel online ainda esta dentro do monolitico.
5. Ainda ha risco de crescimento excessivo do `index.html` se novas evolucoes continuarem sendo feitas nele.

## Avanco da REV_4

- Mensagens foram padronizadas com `ONLINE_MESSAGES`.
- Erros foram normalizados com `normalizeErrorMessage(...)`.
- Atualizacao de status e alerta foram padronizados com `notifyStatus(...)`.
- Estado interno foi agrupado em `ONLINE_PANEL_CTX`.
- `PlannusOnlineRepository`, `PlannusOnlineActions` e `PlannusOnlineSaveAdapter` foram preservados.
- Nenhuma regra funcional foi alterada.

## Riscos de continuar evoluindo dentro do index.html

- Aumento de acoplamento entre UI, estado, persistencia e repository.
- Maior chance de duplicar logica que ja existe em `src/`.
- Mais dificuldade para testar partes isoladas.
- Maior risco de alterar comportamento ao fazer manutencao pequena.

## Proxima etapa recomendada

Padronizar gradualmente funcoes auxiliares internas e iniciar extracao controlada para modulos reais em `src/`, sem alterar comportamento.

A proxima etapa deve continuar sem criar funcionalidade nova e sem mexer em API/D1/Worker.
