# VALIDATION UI CONTRACT V1

Data: 2026-06-10

## Checklist

- [ ] NÃ£o existe tela `Resumo da Obra`.
- [ ] `Minhas Obras` Ã© a entrada oficial.
- [ ] `Visão geral da obra` Ã© a primeira tela apÃ³s abrir obra.
- [ ] App Shell nÃ£o cria tela paralela.
- [ ] Sidebar navega apenas para telas reais.
- [ ] Header nÃ£o duplica informaÃ§Ã£o de pÃ¡gina.
- [ ] BotÃ£o vermelho Ã© usado apenas para a aÃ§Ã£o principal.
- [ ] Cards nÃ£o exibem dados mockados.
- [ ] Nenhum botÃ£o visual sem aÃ§Ã£o real ficou sem documentaÃ§Ã£o.
- [ ] Nenhum termo tÃ©cnico interno aparece na UI.
- [ ] Nenhuma dependÃªncia externa foi adicionada.
- [ ] Nenhum import React/Radix/shadcn/lucide foi criado.
- [ ] API/D1/Worker nÃ£o foram alterados.
- [ ] `state.plan.blocks` nÃ£o foi alterado.
- [ ] `planningVersions` nÃ£o foi alterado.
- [ ] RI/RF nÃ£o foi alterado.
- [ ] Acompanhamento nÃ£o foi alterado.

## ValidaÃ§Ãµes esperadas por fase

### Fase A - Minhas Obras

- [ ] Lista obras.
- [ ] Cria obra.
- [ ] Abre obra.
- [ ] Continua Ãºltima obra.
- [ ] NÃ£o exibe planejamento detalhado.

### Fase B - Obra aberta

- [ ] O shell principal abre com `body.withSideNav`.
- [ ] `#sideNav` navega para mÃ³dulos reais.
- [ ] `Visão geral da obra` aparece como primeira Ã¡rea real.
- [ ] `Pavimentos`, `Biblioteca EAP`, `Aplicar Planejamento`, `ServiÃ§os`, `Acompanhamento`, `Linha de base`, `Dashboard`, `ConfiguraÃ§Ã£o` e `RelatÃ³rios` estÃ£o disponÃ­veis conforme contrato.

## CritÃ©rio de aprovaÃ§Ã£o

O contrato serÃ¡ considerado validado quando:

- a entrada for exclusivamente `Minhas Obras`;
- a obra aberta não depender de `Dados da Obra` como tela obrigatória;
- nÃ£o houver tela paralela de resumo;
- o shell nÃ£o competir com a navegaÃ§Ã£o real;
- nenhum novo pacote/stack visual for introduzido.

## ValidaÃ§Ã£o da Etapa 2 â€” Tokens CSS oficiais

Checklist:

- [ ] Bloco `PLANNUS_UI_TOKENS_V1_START` existe.
- [ ] Bloco `PLANNUS_UI_TOKENS_V1_END` existe.
- [ ] Tokens `--pln-*` oficiais foram adicionados.
- [ ] Tokens antigos nÃ£o foram removidos.
- [ ] Nenhum DOM foi alterado.
- [ ] Nenhum JS foi alterado.
- [ ] Nenhuma tela nova foi criada.
- [ ] `Minhas Obras` continua abrindo.
- [ ] `Abrir obra` continua funcionando.
- [ ] `Visão geral da obra` continua abrindo.
- [ ] NavegaÃ§Ã£o por `setView(...)` continua funcionando.
- [ ] `Salvar Online` continua funcionando.
- [ ] API/D1/Worker nÃ£o foram alterados.
- [ ] `PUBLIC_DEPLOY` nÃ£o foi editado manualmente.

## ValidaÃ§Ã£o da Etapa 4 â€” Shell da obra e Visão geral da obra

Checklist:

> A Etapa 4 foi reestruturada em cÃ³digo para header contextual, mÃ©tricas em cards e grid da obra aberta. Esta checklist continua sendo a validaÃ§Ã£o visual final no navegador.

- [ ] Obra abre sem depender de `Visão geral da obra` como entrada obrigatória.
- [ ] Shell da obra aberta foi padronizado.
- [ ] `#sideNav` foi visualmente padronizado.
- [ ] Header da obra aberta foi visualmente padronizado.
- [ ] `Visão geral da obra` foi visualmente padronizada.
- [ ] A imagem opcional da obra aparece quando existe `state.projectCoverImage`.
- [ ] O botÃ£o de imagem nÃ£o criou upload API.
- [ ] NÃ£o existe `Resumo da Obra`.
- [ ] NÃ£o hÃ¡ tela paralela.
- [ ] `Salvar Online` continua funcionando.
- [ ] Status online/offline continua funcionando.
- [ ] `Pavimentos` continua abrindo.
- [ ] `Biblioteca EAP` continua abrindo.
- [ ] `Planejamento` continua abrindo.
- [ ] `Acompanhamento` continua abrindo sem alteraÃ§Ã£o visual planejada.
- [ ] `viewPlanner` nÃ£o foi alterado.
- [ ] `openObra` nÃ£o foi alterado.
- [ ] `setView` nÃ£o foi alterado.

## CorreÃ§Ã£o da Etapa 4C â€” Shell global da obra aberta

Checklist:

- [ ] Todas as telas internas usam o mesmo `#sideNav`.
- [ ] Todas as telas internas usam o mesmo header.
- [ ] Sidebar aberta mostra labels.
- [ ] Sidebar recolhida mostra Ã­cones.
- [ ] Item ativo muda conforme `setView`.
- [ ] Header mostra `Obra` / `EAP` / `SeÃ§Ã£o` em formato compacto.
- [ ] `Salvar Online` continua visÃ­vel.
- [ ] Status online continua visÃ­vel.
- [ ] Controles de LOB aparecem apenas em `Acompanhamento`.
- [ ] `VisÃ£o geral da obra` nÃ£o mostra controles de LOB.
- [ ] `Pavimentos` nÃ£o mostra controles de LOB.
- [ ] `Biblioteca EAP` nÃ£o mostra controles de LOB.
- [ ] `Planejamento` nÃ£o mostra controles de LOB.
- [ ] NÃ£o existe `Resumo da Obra`.
- [ ] NÃ£o foi criada tela paralela.
- [ ] `API/D1/Worker` nÃ£o foram alterados.
- [ ] API/D1/Worker nÃ£o foram alterados.
- [ ] `PUBLIC_DEPLOY` nÃ£o foi editado manualmente.

## ValidaÃ§Ã£o da Etapa 4D â€” Minhas Obras como raiz oficial

Checklist:

- [ ] O sistema abre em `Minhas Obras`.
- [ ] `Minhas Obras` lista obras.
- [ ] `Minhas Obras` cria obra.
- [ ] `Minhas Obras` abre obra.
- [ ] `Minhas Obras` permite continuar Ãºltima obra.
- [ ] NÃ£o existe tela `Resumo da Obra`.
- [ ] NÃ£o existe tela paralela concorrente.
- [ ] O shell interno abre a obra sem depender de `Visão geral da obra` como tela obrigatÃ³ria.
- [ ] O menu lateral mostra apenas mÃ³dulos reais.
- [ ] A navegaÃ§Ã£o por `setView(...)` continua funcionando.
- [ ] `Salvar Online` continua funcionando.
- [ ] Status online/offline continua funcionando.
- [ ] Acompanhamento continua funcionando.
- [ ] RI/RF nÃ£o foi alterado.
- [ ] `planningVersions` nÃ£o foi alterado.
- [ ] `state.plan.blocks` nÃ£o foi alterado.




## Correção da Etapa 4D — Menu da obra aberta

Checklist:

- [ ] Menu de Minhas Obras não foi alterado.
- [ ] Menu antigo da obra aberta foi neutralizado.
- [ ] Novo `#sideNav` segue padrão visual de Minhas Obras.
- [ ] `#sideNav` aberto mostra ícone e texto.
- [ ] `#sideNav` recolhido mostra apenas ícones.
- [ ] Não existem dois menus laterais.
- [ ] Itens navegam para telas reais.
- [ ] Item ativo muda conforme `setView`.
- [ ] Visão geral usa `setView("project")`.
- [ ] Pavimentos usa `setView("pav")`.
- [ ] Biblioteca EAP usa `setView("guided")`.
- [ ] Planejamento usa `setView("guidedapply")`.
- [ ] Serviços usa `setView("service")`.
- [ ] Acompanhamento usa `setView("planner")`.
- [ ] Dashboard usa `setView("dashboard")`.
- [ ] Parâmetros usa `setView("config")`.
- [ ] Não existe Resumo da Obra.
- [ ] Minhas Obras continua funcionando.
- [ ] viewPlanner continua funcionando.
- [ ] API/D1/Worker não foram alterados.
