# TECH_DEBT_FIX_2

Data: 2026-05-29

## Divida tecnica remanescente

1. Ainda existem dados duplicados entre `state` e `localStorage`.
2. `__plannusAux` e uma ponte de compatibilidade para preservar dados enquanto a arquitetura ainda e monolitica.
3. Modelos de EAP, versoes de planejamento e versao ativa ainda nao possuem tabelas proprias.
4. O runtime ativo continua concentrado no `index.html`.

## Recomendacao futura

Migrar os dados auxiliares para estruturas persistentes proprias no banco, com tabelas como:

- `eap_models`
- `planning_versions`
- `obra_active_planning_version`

## Fora do escopo desta correcao

- Nenhuma tabela foi criada.
- Nenhuma migration foi criada.
- Nenhuma rota nova foi criada.
- API/D1/Worker nao foram alterados.
