# PLANNUS_ONLINE_FIX_2A_2_PRE_ONLINE_LOAD_BACKUP_QUOTA

Data: 2026-05-29

## Problema
Ao abrir obra online, o backup prévio em:
`plannus.backup.before_online_load.<timestamp>`
estourava quota do localStorage e abortava o fluxo de abertura.

## Causa confirmada
O backup pré-carregamento usava payload grande (state inteiro) com `setItem` direto, sem guard de quota.

## Regra nova
Falha de backup local pré-open **não bloqueia** `openObra`.
Se quota exceder:
- registrar warning;
- tentar backup compacto;
- se ainda falhar, seguir abrindo a obra online.

## Funções criadas
- `toCompactPreOnlineLoadBackup(state)`
- `cleanupOldPreOnlineLoadBackups(maxCount)`
- `safeCreatePreOnlineLoadBackup(currentState, options)`

## Funções alteradas
- `openCachedObra(id)`
- `openObra(obra)`

## Logs
- `[PRE_ONLINE_LOAD_BACKUP]`
- `[LOCAL_STORAGE_QUOTA]`
- `[ONLINE_OPEN_OBRA]`

## Escopo
- API/D1/Worker: não alterados.
- FIX_2A e FIX_2A_1 preservadas.
- PUBLIC_DEPLOY não editado manualmente.
