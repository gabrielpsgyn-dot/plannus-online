# TECH_DEBT_FIX_2C_1

Data: 2026-06-09

## Dívida técnica remanescente
- `QP_BLOCK_EDIT_V3` continua existindo por compatibilidade.
- `state.realization` ainda vive dentro de `state_json`.
- A migração completa depende de revisão manual de órfãos.
- O fallback por nome ainda existe como compatibilidade, não como contrato ideal.
- A normalização final pode migrar realizado para tabela D1 no futuro.
