# PLANNUS_ONLINE_REV_4

Data: 2026-05-29

## Pasta ativa

`C:\DEV\PLANNUS - v2 online\ORGANIZADO\ARQUIVOS_ATIVOS`

## Objetivo da REV_4

Padronizar mensagens, tratamento de erro e estado interno do painel online no `index.html`, mantendo o comportamento visual e funcional existente.

## Arquivos alterados na REV_4

- `index.html`

## Confirmacoes

- Somente `index.html` foi alterado na REV_4.
- API/D1/Worker nao foram alterados.
- Nenhuma migration foi criada.
- Nenhuma tabela foi criada.
- Nenhuma tela nova foi criada.
- Nenhuma regra de negocio foi alterada.

## ONLINE_MESSAGES

`ONLINE_MESSAGES` centraliza textos padrao usados pelo fluxo online/offline:

- mensagem para obra nao carregada;
- mensagem para estado invalido;
- mensagem para fallback offline com backup local;
- mensagem de salvamento online com sucesso;
- mensagem de erro de salvamento preservando dados locais;
- mensagem de conflito de versao.

## normalizeErrorMessage(...)

`normalizeErrorMessage(...)` padroniza mensagens de erro recebidas pelo fluxo online.

Ela evita que mensagens vazias ou inconsistentes cheguem ao usuario ou aos logs, aplicando fallback quando necessario.

## notifyStatus(...)

`notifyStatus(...)` padroniza a atualizacao de status visual e, quando necessario, o alerta ao usuario.

Ela preserva o fluxo visual criado nas revisoes anteriores e reduz repeticao no tratamento de mensagens.

## ONLINE_PANEL_CTX

`ONLINE_PANEL_CTX` agrupa estado interno que antes ficava espalhado em variaveis separadas:

- `syncState`
- `isSaving`
- `dirtyBound`
- `lastPingAt`
- `lastPingOk`

Esse agrupamento reduz variaveis soltas no escopo do painel online sem alterar comportamento.

## Componentes preservados

Foram preservados:

- `PlannusOnlineRepository`
- `PlannusOnlineActions`
- `PlannusOnlineSaveAdapter`

## Fluxo preservado

O fluxo offline-first foi preservado:

- localStorage continua como backup;
- salvamento online continua controlado;
- revision continua sendo respeitada;
- conflito 409 continua protegido;
- erro de rede/API nao descarta dados locais.

## Estados visuais preservados

Foram mantidos os estados visuais da REV_1:

- `ONLINE_SYNCED`
- `ONLINE_DIRTY`
- `SAVING`
- `OFFLINE`
- `SAVE_ERROR`
- `CONFLICT`
- `LOCAL_BACKUP`
