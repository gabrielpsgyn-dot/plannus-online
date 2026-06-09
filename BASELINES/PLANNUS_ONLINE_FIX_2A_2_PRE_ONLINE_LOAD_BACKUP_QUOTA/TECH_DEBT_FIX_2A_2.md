# TECH_DEBT_FIX_2A_2

Data: 2026-05-29

## Dívida técnica
1. localStorage não é ideal para backups completos grandes.
2. Backup pré-open ainda depende de espaço remanescente do navegador.
3. Estratégia futura recomendada: IndexedDB para snapshots locais volumosos.
4. Histórico de revisões completo idealmente deve ficar em trilha dedicada (server-side) no futuro.

## Próximo passo técnico
- Manter backup pré-open compacto no localStorage.
- Migrar snapshots completos de recuperação para IndexedDB em etapa futura.
