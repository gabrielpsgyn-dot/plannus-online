# PLANNUS_ONLINE_FIX_2_PLANNING_APPLY

Data: 2026-05-29

## Problema

Dados de EAP, montagem de planejamento e snapshots operacionais podiam permanecer apenas em chaves auxiliares de `localStorage`, fora do `state_json` enviado ao D1.

Na abertura online, o estado principal era restaurado em `plannus.app.state`, mas os dominios auxiliares do planejamento nao eram hidratados de volta.

## Causa raiz encontrada

`getCurrentConsolidatedPlannusState()` clonava apenas `window.state` ou `plannus.app.state`.

As chaves auxiliares abaixo nao eram consolidadas no estado online:

- `PLANNUS_GUIDED_EAP_DRAFT_V1`
- `PLANNUS_GUIDED_EAP_LIBRARY_V1`
- `PLANNUS_GUIDED_EAP_LAST_SAVED_TEMPLATE_V1`
- `PLANNUS_PLANNING_ASSEMBLY_STORE_V1`
- `PLANNUS_PLANNING_ASSEMBLY_V1`
- `QP_OPERATIONAL_V1`
- `QP_OPERATIONAL_MONTHLY_V1`

## Arquivos alterados

- `index.html`

## Funcoes auditadas

- `getCurrentConsolidatedPlannusState()`
- `openObra(...)`
- `_readPlanningAssemblyState()`
- `_savePlanningAssemblyState(...)`
- `renderPlanningAssemblyView(...)`
- `_applyGuidedPlanningModel()`
- `_guidedBuildOperationalPlanningModel(...)`
- `generateBlocks()`
- `saveOperational()`

## Funcoes criadas

- `collectAuxiliaryPlanningStateForOnlineSave()`
- `hydrateAuxiliaryPlanningStateFromOnlineState(loadedState)`
- `syncVisiblePlanningStageRowsBeforeApply()`
- `readJsonLocalStorage(key)`
- `backupLocalStorageKeyBeforeHydrate(key)`

## __plannusAux

O estado salvo online agora recebe um campo auxiliar:

```js
state.__plannusAux = {
  version: 1,
  savedAtISO: "...",
  guidedEap: {},
  planningAssembly: {},
  operationalSnapshots: {},
  planningVersions: {}
}
```

Esse campo preserva dados auxiliares que ainda vivem em `localStorage`, sem mudar o contrato da API ou o schema do D1.

## Hidratacao ao abrir obra

Ao abrir uma obra online, `hydrateAuxiliaryPlanningStateFromOnlineState(...)` restaura as chaves auxiliares presentes em `__plannusAux`.

Antes de sobrescrever cada chave local, a versao anterior e preservada em backup com timestamp.

## Aplicacao transacional

`_applyGuidedPlanningModel()` agora sincroniza as etapas visiveis antes de aplicar e faz rollback quando a geracao de blocos falha ou gera zero blocos.

Baseline e acompanhamento/realizado continuam preservados.

## Confirmacao

- API/D1/Worker nao foram alterados.
- Nenhuma migration foi criada.
- Nenhuma tabela foi criada.
- O fluxo offline-first foi preservado.
