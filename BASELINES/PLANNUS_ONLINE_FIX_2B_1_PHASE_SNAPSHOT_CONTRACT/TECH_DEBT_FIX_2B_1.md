# TECH_DEBT_FIX_2B_1

- Ainda existe coexistência entre modelos vivos da UI e snapshot persistido da fase.
- O fallback para `draftModel` permanece como contingência, porém agora auditado e precedido de tentativa de sincronização.
- Reindexação de RI/RF não foi feita nesta etapa (fica para FIX_2B_2/FIX_2C).
- O contrato final de acompanhamento ainda precisa consolidar vínculo estável por versão de planejamento.
