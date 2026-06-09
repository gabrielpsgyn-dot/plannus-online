# TECH_DEBT_FIX_2A_1

Data: 2026-05-29

## Dívida técnica remanescente
1. localStorage continua limitado para cache offline grande.
2. Cache de state por obra em localStorage pode crescer com muitas obras.
3. Estratégia ideal futura para cache completo offline é IndexedDB.
4. D1 continua sendo fonte online principal (canônica no servidor).

## Recomendação futura
- Migrar backups completos por obra para IndexedDB.
- Manter localStorage para metadados/índices leves.
