# PLANNUS UI SYSTEM CONTRACT V1

Data: 2026-06-10

## 1. Propósito

Este contrato define o padrão objetivo de identidade visual e usabilidade do Plannus Online.
Ele existe para impedir alterações picadas, telas paralelas e empilhamento de camadas visuais sem critério.

Este documento não altera o sistema. Ele apenas fixa a regra de aplicação futura.

## 2. Estrutura oficial do sistema

### Fase A - Entrada do sistema

- Tela oficial: `Minhas Obras`
- Container oficial: `#plannusObrasGate`
- Função principal: listar, criar, abrir e continuar obras
- Escopo: seleção de obra, status online, permissões de obra, ações rápidas
- Proibição: não exibir planejamento detalhado, RI/RF, acompanhamento, LOB ou tela de resumo completa

### Fase B - Obra aberta

- Shell oficial: `body.withSideNav`
- Sidebar oficial: `#sideNav`
- Navegação: `setView(...)`
- Telas oficiais:
  - `Visão geral da obra`
  - `Pavimentos`
  - `Biblioteca EAP`
  - `Aplicar Planejamento`
  - `Serviços`
  - `Acompanhamento`
  - `Linha de base`
  - `Dashboard`
  - `Configuração`
  - `Relatórios` como overlay/modal

### Regra proibida

- A tela `Resumo da Obra` é proibida.
- Não criar módulo, aba, card principal, rota ou label com esse nome.

## 3. Tokens visuais oficiais

```css
:root {
  --pln-black: #08090A;
  --pln-sidebar: #0B0B0C;
  --pln-sidebar-active: #1F1F21;
  --pln-red: #EF1235;
  --pln-red-dark: #C8102E;

  --pln-bg: #F7F8FA;
  --pln-surface: #FFFFFF;
  --pln-surface-muted: #F3F4F6;
  --pln-border: #E5E7EB;

  --pln-text: #111827;
  --pln-muted: #6B7280;

  --pln-green: #16A34A;
  --pln-amber: #F59E0B;
  --pln-blue: #2563EB;

  --pln-radius-sm: 8px;
  --pln-radius-md: 12px;
  --pln-radius-lg: 16px;

  --pln-shadow-soft: 0 12px 30px rgba(17, 24, 39, 0.06);
  --pln-shadow-hover: 0 18px 45px rgba(17, 24, 39, 0.10);
}
```

### Regras de uso

- Preto/navy: sidebar e marca.
- Vermelho Plannus: ação principal, ponto da marca, item ativo.
- Verde: online, salvo, resolvido, aplicado.
- Âmbar: pendente, atenção, alteração não salva.
- Cinza: fundo, bordas, inputs, estados neutros.
- Cada bloco de decisão pode ter no máximo uma ação primária vermelha.

## 4. Componentes oficiais

### 4.1 Sidebar

- Uso: navegação principal entre módulos reais.
- Não usar: como painel de conteúdo.
- Classes permitidas: `#sideNav`, `.navTop`, `.navScroll`, `.navSec`, `.navItem`, `.navSecTitle`.
- Medidas mínimas: largura aberta legível, ícone 18px, item com altura mínima de 40px.
- Comportamento: item ativo destacado em vermelho; estado recolhido deve preservar navegação.
- Aceite: o usuário consegue identificar o módulo atual sem ambiguidade.

### 4.2 Header

- Uso: contexto da obra, estado online, usuário, ações globais.
- Não usar: para repetir todo o conteúdo da página.
- Classes permitidas: `header`, `kpiRow`, `plannerHeaderActions`, `pln-header` no gate.
- Medidas mínimas: altura suficiente para não cortar conteúdo; alinhamento horizontal claro.
- Comportamento: uma única linha de contexto; não duplicar título de tela em excesso.
- Aceite: o cabeçalho não compete com o conteúdo da tela.

### 4.3 Cabeçalho de página

- Uso: identificar uma tela real.
- Não usar: como segunda barra paralela de navegação.
- Critério: título forte, subtítulo curto, ação principal única.

### 4.4 Card

- Uso: resumo, atalho, bloco funcional.
- Não usar: como container genérico de tudo.
- Critério: fundo branco, borda leve, raio consistente, sombra suave opcional.

### 4.5 Botão primário

- Cor de fundo: `--pln-red`
- Texto: branco
- Raio mínimo: `12px`
- Altura mínima: `36px`
- Uso: ação principal do bloco
- Proibido: múltiplos primários concorrendo no mesmo bloco

### 4.6 Botão secundário

- Fundo: branco ou `--pln-surface`
- Borda: `--pln-border`
- Uso: ação secundária ou retorno

### 4.7 Botão perigoso

- Fundo: vermelho escuro ou vermelho puro com contraste claro
- Uso: exclusão, limpeza ou ação irreversível
- Proibido: usar como ação principal genérica

### 4.8 Input / filtro

- Labels acima do campo
- Raio consistente
- Filtros visíveis antes da lista principal quando a tela tiver muitos itens

### 4.9 Tabela

- Cabeçalho sticky quando útil
- Coluna de ações à direita
- Linhas uniformes

### 4.10 Métrica

- Label pequeno
- Valor forte
- Contexto curto

### 4.11 Estado vazio

- Mensagem objetiva
- Próximo passo claro
- Um botão primário no máximo

### 4.12 Toolbar

- Agrupa ações de mesma finalidade
- Não vira depósito de botões sem hierarquia

### 4.13 Modal / overlay

- Uso: configuração curta, confirmação, relatório, edição localizada
- Não usar: como substituto de tela principal

### 4.14 Badge / status

- Verde: ok/salvo/online
- Âmbar: pendente/atenção
- Vermelho: erro/conflito
- Cinza: neutro/sem informação

## 5. Padrão por tela real

### 5.1 Minhas Obras

- Objetivo: selecionar obra.
- Ação principal: abrir obra.
- Componentes permitidos: cards de obra, status, pesquisa, criar, atualizar, continuar última obra.
- Componentes proibidos: planejamento detalhado, RI/RF, conteúdo operacional.
- Ordem de refatoração: primeira prioridade.

### 5.2 Visão geral da obra

- Objetivo: ser a visão geral inicial da obra aberta, sem competir com a entrada oficial do sistema.
- Ação principal: salvar dados base.
- Componentes permitidos: formulário, resumo da obra, imagem opcional, atalhos para EAP e Planejamento.
- Componentes proibidos: visão duplicada chamada `Resumo da Obra`.

### 5.3 Pavimentos

- Objetivo: cadastrar e organizar a base de pavimentos.
- Ação principal: salvar e montar planejamento.
- Componentes permitidos: presets, fila, tabela, cadastro manual.
- Risco: alto se alterar geração/ordem.

### 5.4 Biblioteca EAP

- Objetivo: montar biblioteca de serviços.
- Ação principal: salvar modelo/EAP.
- Componentes permitidos: editor, seletor, lista de modelos, resumo de composição.

### 5.5 Aplicar Planejamento

- Objetivo: consolidar fase ativa e aplicar o planejamento operacional.
- Ação principal: aplicar fase ativa.
- Risco: muito alto; não mudar sem contrato de dados estável.

### 5.6 Serviços

- Objetivo: cadastro base de serviços.
- Ação principal: adicionar serviço.
- Regra: não misturar com aplicação operacional da EAP.

### 5.7 Acompanhamento / LOB

- Objetivo: visualizar execução/curva/LOB.
- Ação principal: acompanhar o plano aplicado.
- Regra: tela sensível; só padronizar depois de Minhas Obras, Visão geral da obra, Pavimentos, EAP e Planejamento estabilizados.

### 5.8 Linha de base

- Objetivo: gerir snapshot oficial do planejamento aplicado.
- Ação principal: salvar/aplicar versão.

### 5.9 Dashboard

- Objetivo: visão analítica.
- Ação principal: alternar visões executiva, grupal e operacional.

### 5.10 Configuração

- Objetivo: ajustes de calendário e limpeza.
- Ação principal: ajustar parâmetros.

### 5.11 Relatórios overlay

- Objetivo: exportação e relatórios.
- Ação principal: abrir/fechar overlay.

### 5.12 viewMSPImport e viewProjectPath

- Estado: legado/desativado.
- Regra: não usar como fluxo principal.

## 6. Ordem oficial de aplicação

1. Congelar direção visual e contrato UI V1.
2. Aplicar tokens CSS oficiais sem alterar DOM.
3. Padronizar Minhas Obras.
4. Padronizar Visão geral da obra.
5. Padronizar Pavimentos.
6. Padronizar Biblioteca EAP e Serviços.
7. Padronizar Aplicar Planejamento.
8. Padronizar Linha de base e Dashboard.
9. Padronizar Acompanhamento / LOB.
10. Padronizar Configuração e Relatórios.
11. Avaliar neutralização de `viewMSPImport` e `viewProjectPath`.

## 7. Critérios de aceite

- Minhas Obras é a entrada oficial.
- Visão geral da obra não é a entrada oficial do sistema.
- Não existe tela `Resumo da Obra`.
- Nenhum componente novo cria uma rota paralela.
- Nenhuma dependência externa é adicionada.
- O shell visual é aplicado por regra, não por remendo.
