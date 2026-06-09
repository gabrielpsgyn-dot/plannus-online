# FIX_2B_0 — Follow-up Block Contract

## Problema
A tela de Acompanhamento sofria com múltiplas fontes concorrentes de blocos e realizado:
- `state.plan.blocks`
- `state.blocks`
- `state.operational.blocks`
- `QP_OPERATIONAL_V1`
- `QP_BLOCK_EDIT_V3`
- `state.blockEdits`

## Causa técnica
`loadOperational` podia aplicar blocos operacionais automaticamente e contaminar a malha ativa. Além disso, o realizado (RI/RF) era lido por caminhos espalhados.

## O que esta FIX_2B_0 faz
1. Cria resolvedor canônico de blocos do acompanhamento:
   - `getCanonicalPlannerBlocksForFollowUp()`
   - prioridade: `state.plan.blocks` -> `state.blocks`
   - não usa `state.operational.blocks` automaticamente no render principal.

2. Cria resolvedor único de realizado:
   - `getRealizationByBlock(block)`
   - fonte preferencial: `state.blockEdits`
   - fallback legado: `QP_BLOCK_EDIT_V3`
   - fallback por nome apenas para diagnóstico controlado.

3. Neutraliza sobrescrita automática em `loadOperational`:
   - só aplica em `_setActivePlanBlocks` quando `allowApplyToActivePlan === true`.
   - por padrão, abertura/render não sobrescrevem malha ativa por snapshot operacional.

4. Adiciona auditoria de órfãos:
   - `auditFollowUpRealizationLinks()`
   - exposta em `window.PLANNUS_AUDIT_FOLLOWUP_LINKS`.

## O que NÃO foi alterado
- API/Worker/D1
- contrato de rotas
- apply profundo (`_applyGuidedPlanningModelCore`) além do necessário
- remoção de legado (`QP_BLOCK_EDIT_V3` não foi apagado)

## Observação
`loadOperational` continua útil para diagnóstico/cache operacional, mas não é mais fonte automática de verdade para o acompanhamento.
