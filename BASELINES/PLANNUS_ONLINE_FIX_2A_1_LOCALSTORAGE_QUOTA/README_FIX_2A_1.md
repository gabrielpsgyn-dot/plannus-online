# PLANNUS_ONLINE_FIX_2A_1_LOCALSTORAGE_QUOTA

Data: 2026-05-29

## Erro de quota
Erro observado no navegador:
`Failed to execute 'setItem' on 'Storage': Setting the value of 'plannus.local.obras' exceeded the quota`

Causa: `plannus.local.obras` estava recebendo payload pesado (incluindo `state` completo), excedendo limite de localStorage.

## Correção aplicada
1. `plannus.local.obras` passou a ser índice leve.
2. Estado local de cada obra foi separado para chave dedicada:
   - `plannus.local.obra.state.<obraId>`
3. Foi criado guard de quota com fallback:
   - `safeSetLocalStorage(key, value, options)`

## Índice leve (`plannus.local.obras`)
Cada item contém apenas metadados:
- `id`
- `nome`
- `title`
- `descricao`
- `revision`
- `updatedAt`
- `updatedAtISO`
- `lastOpenedAtISO`
- `hasLocalBackup`
- `source`

Não contém:
- `state`, `state_json`, `services`, `cycles`, `dependencies`, `blocks`, `plan`, `baseline`, `acompanhamento`, `eap`, `planningAssembly`, `planningVersions`, `operational`, `blockEdits`, `__plannusAux`.

## Logs adicionados
- `[LOCAL_STORAGE_QUOTA]`
- `[LOCAL_OBRAS_INDEX]`
- `[LOCAL_BACKUP_COMPACT]`

## Escopo
- API/D1/Worker: não alterados.
- FIX_2A preservada.
- PUBLIC_DEPLOY não editado manualmente.
