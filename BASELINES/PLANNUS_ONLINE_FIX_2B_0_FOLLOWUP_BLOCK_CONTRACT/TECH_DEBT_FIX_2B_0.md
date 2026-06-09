# Tech Debt FIX_2B_0

## Dívida remanescente
1. `QP_BLOCK_EDIT_V3` ainda existe como legado e fallback.
2. Realizado ainda não está totalmente consolidado em `state.acompanhamento`.
3. Órfãos de RI/RF ainda não são corrigidos automaticamente (apenas auditados).
4. Apply profundo ainda precisa de contrato transacional completo (FIX_2B_1).

## Próxima etapa (FIX_2B_1)
- reindexação controlada de realizado após remalha
- contrato definitivo de realizado por chave estável
- redução de leituras espalhadas de legado
