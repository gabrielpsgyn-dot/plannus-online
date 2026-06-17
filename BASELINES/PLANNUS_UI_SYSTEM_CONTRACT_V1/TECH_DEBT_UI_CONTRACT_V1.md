# TECH DEBT UI CONTRACT V1

Data: 2026-06-10

## DÃ­vida tÃ©cnica registrada

1. `index.html` continua monolÃ­tico.
2. `#sideNav` possui mÃºltiplas geraÃ§Ãµes de CSS.
3. `body.withSideNav` depende de overrides acumulados.
4. `#plannusObrasGate .pln-*` estÃ¡ isolado e pode servir como referÃªncia de shell.
5. `viewPlanner` Ã© sensÃ­vel e deve ficar fora da primeira rodada de mudanÃ§as visuais.
6. `viewMSPImport` e `viewProjectPath` sÃ£o legados/desativados.
7. NÃ£o consolidar CSS sem testes por tela.
8. O design system ainda estÃ¡ dentro do HTML.
9. O futuro ideal Ã© extrair CSS para arquivo prÃ³prio.
10. O futuro ideal Ã© extrair componentes visuais depois de estabilizar o contrato.

## Risco associado

- AlteraÃ§Ãµes no sidebar/header sem contrato Ãºnico podem mudar comportamento em todas as telas.
- AlteraÃ§Ãµes no acompanhamento/LOB podem quebrar o fluxo de leitura de blocos.
- Ajustes parciais em uma tela podem causar divergÃªncia entre shell, navegaÃ§Ã£o e conteÃºdo.

## Regra para prÃ³ximas etapas

- Primeiro estabilizar o contrato.
- Depois aplicar token visual.
- Depois padronizar tela por tela.
- NÃ£o mexer em telas sensÃ­veis antes da estabilizaÃ§Ã£o das telas-base.

## Etapa 2 â€” Tokens CSS

- Os tokens oficiais foram adicionados como camada base.
- Os tokens antigos continuam existindo por compatibilidade.
- Nenhuma tela ainda foi migrada para os tokens.
- A prÃ³xima etapa serÃ¡ padronizar `Minhas Obras` usando esses tokens.
- `#sideNav` ainda nÃ£o foi consolidado.
- `viewPlanner` ainda nÃ£o foi alterado.

## Etapa 4 â€” Shell da obra e Visão geral da obra

- O shell da obra aberta comeÃ§ou a receber o padrÃ£o Plannus.
- `#sideNav` foi padronizado visualmente, sem alterar navegaÃ§Ã£o.
- O header da obra aberta foi padronizado visualmente.
- `Visão geral da obra` passou a ser a primeira tela interna redesenhada.
- A imagem da obra foi tratada como `state.projectCoverImage`, sem upload API.
- A reestruturaÃ§Ã£o da Etapa 4 passou a usar header contextual, mÃ©tricas em cards e grid mais compacto para a obra aberta; a validaÃ§Ã£o visual final continua necessÃ¡ria no navegador.
- `viewPlanner` continua fora do escopo.
- `Pavimentos`, `Biblioteca EAP`, `Planejamento`, `Acompanhamento` e `Dashboard` ainda aguardam padronizaÃ§Ã£o.

## CorreÃ§Ã£o da Etapa 4C â€” Shell global

- O shell da obra aberta passou a seguir o mesmo padrÃ£o visual global da tela `Minhas Obras`.
- O menu lateral e o cabeÃ§alho deixaram de variar por tela interna.
- Cada tela interna muda apenas o conteÃºdo central.
- Os controles de LOB ficam restritos ao `Acompanhamento`.
- `viewPlanner` nÃ£o foi redesenhado; apenas permaneceu com seus controles dentro da prÃ³pria tela.

## Etapa 4C â€” Shell Ãºnico consolidado

- O shell visual oficial agora deve ser o mesmo em todas as telas internas da obra.
- A camada antiga de sidebar/header que competia com o padrÃ£o oficial precisa continuar sendo neutralizada.
- O menu lateral, o cabeÃ§alho e os espaÃ§amentos devem seguir a mesma lÃ³gica visual de `Minhas Obras`.
- A diferenÃ§a entre telas fica apenas no conteÃºdo central e nos controles especÃ­ficos de cada mÃ³dulo.
- `Minhas Obras` permanece como raiz visual de referÃªncia, sem ser substituÃ­da por uma tela paralela.
- `Visão geral da obra` passa a ser a primeira Ã¡rea real da obra aberta.
- `viewPlanner`, `Acompanhamento`, `Pavimentos`, `Biblioteca EAP` e demais telas permanecem funcionais, mas herdam o shell unificado.

## Etapa 4D â€” Minhas Obras como raiz oficial

- `Minhas Obras` permanece como a entrada oficial do sistema.
- `Visão geral da obra` deixou de ser tratado como tela principal ou obrigatÃ³ria.
- A obra aberta pode manter uma visÃ£o geral interna, mas ela nÃ£o compete com a tela de entrada.
- O shell interno continua usando o mesmo contrato visual, sem criar tela paralela.
- `viewPlanner`, `Pavimentos`, `Biblioteca EAP`, `Planejamento`, `Acompanhamento`, `Dashboard`, `ConfiguraÃ§Ã£o` e `RelatÃ³rios` seguem como mÃ³dulos reais.


## Correção da Etapa 4D — Menu da obra aberta

- O menu antigo da obra aberta estava inconsistente com Minhas Obras.
- A estratégia passou a ser recriar o `#sideNav` visualmente, preservando navegação real.
- Minhas Obras não foi alterada.
- `#sideNav` passou a ser o único menu oficial da obra aberta.
- Blocos antigos de `#sideNav` ainda podem existir, mas foram neutralizados pelo bloco oficial.
- Próximo passo será aplicar o mesmo princípio ao header global da obra aberta, se ainda necessário.
