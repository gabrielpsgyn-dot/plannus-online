# TECH_DEBT_FIX_2C_0

Data: 2026-06-09

## Dívida técnica observada
- O realizado ainda é inferido por múltiplas chaves legadas.
- `QP_BLOCK_EDIT_V3` continua sendo fonte legada de leitura.
- O contrato de realizado ainda não é versionado de ponta a ponta.
- A auditoria não corrige órfãos; apenas os expõe.

## Próximo passo recomendado
Definir um contrato estável de vínculo do realizado por versão aplicada, com escopo por obra e sem depender de fallback por nome.
