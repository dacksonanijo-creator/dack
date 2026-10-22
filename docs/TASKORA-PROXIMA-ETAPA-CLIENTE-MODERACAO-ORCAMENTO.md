# TASKORA — Próxima etapa: painel do cliente, moderação e orçamento

## Decisões de produto aprovadas

1. **Moderação obrigatória:** toda campanha submetida por qualquer cliente inicia em `pending_review` (ou no estado equivalente já usado pelo esquema existente). Nenhuma campanha pode ficar pública, ser executada, nem consumir orçamento antes de uma decisão administrativa de aprovação.
2. **Crescimento de audiência:** disponibilizar diferentes modelos de campanha, mas validar cada modelo contra as regras das plataformas externas e as políticas do TASKORA. Não prometer nem facilitar seguidores, visualizações, cliques ou interações artificiais proibidas. Mostrar ao cliente os requisitos e restrições do modelo antes da submissão.
3. **Moeda de referência:** armazenar orçamento, preços, comissões e movimentos financeiros numa moeda-base USD, com valores monetários em unidades inteiras menores (por exemplo, cents) quando o esquema permitir. Mostrar moeda local como equivalente informativo, usando taxa de câmbio registada e respetiva data/hora. Nunca substituir o valor-base por uma conversão volátil nem recalcular transações históricas com uma taxa nova.

## Objetivo prioritário: corrigir acesso ao painel empresarial/cliente

Antes de criar módulos novos, rastrear o fluxo existente de autenticação e encaminhamento:
- Inspecionar as rotas, os guards, o estado da sessão Supabase, o tipo de conta/perfil e os redirects pós-login.
- Garantir que uma conta autenticada com perfil de cliente chega ao painel do cliente; trabalhador chega ao painel do trabalhador; administrador mantém o painel administrativo segundo as permissões já existentes.
- Não atribuir privilégios administrativos com base no login Google, email fornecido pelo utilizador ou metadados editáveis do perfil.
- Se o perfil estiver incompleto, encaminhar para completar o perfil sem entrar num ciclo de redirects. Se a sessão ainda estiver a carregar, não decidir que o utilizador está desautenticado.
- Preservar contas existentes, autenticação Google/email, políticas RLS e dados. Não recriar autenticação nem contornar RLS.

## Fluxo de campanhas

Estados de referência (adaptar aos nomes já existentes; evitar criar estados duplicados):
- Rascunho: editável pelo proprietário.
- Pendente de revisão: submetida e visível na fila administrativa; não publicável nem executável.
- Correções necessárias: devolvida ao proprietário com motivo e possibilidade de editar e reenviar.
- Aprovada: autorização administrativa registada com autor e data; pode seguir para publicação/execução segundo as restantes condições.
- Rejeitada: motivo registado; não executável.
- Suspensa: interrompida por administração, com motivo e trilho de auditoria.

A aprovação deve ser imposta no servidor/base de dados, não apenas escondendo botões na interface. Clientes só podem ver e alterar as próprias campanhas. Apenas administradores autorizados podem decidir a revisão. Todas as decisões devem registar autor, data e motivo, conforme as estruturas existentes.

## Orçamento e conversão

- O formulário de criação de campanha recebe orçamento em USD.
- Mostrar, em tempo real, um equivalente local claramente identificado como estimativa, a taxa usada e a data da taxa.
- Persistir o valor-base USD, a moeda local escolhida, o valor convertido e a taxa/data utilizadas na cotação, conforme o modelo de dados existente.
- Valores já reservados, pagos ou contabilizados não podem mudar retroativamente por atualização cambial.
- Não inventar uma taxa fixa. Se não houver uma taxa válida disponível, mostrar que a conversão está indisponível e manter o orçamento em USD.
- Aplicar limites, reservas e comissões no backend com operações idempotentes; nunca confiar no total calculado pelo browser.

## Modelos de campanha e conformidade

Cada modelo deve ter: objetivo, plataforma/canal, requisitos, método de validação, preço/orçamento em USD, restrições aplicáveis e estado de disponibilidade. Bloquear submissão se faltar informação obrigatória ou se o modelo violar as regras configuradas. Não anunciar integração automática com plataformas sem integração real.

## Critérios de aceitação

1. Cliente autenticado consegue entrar no seu painel em desktop e telemóvel; trabalhador e administrador continuam a ser encaminhados corretamente.
2. Sessão em carregamento não causa redirect prematuro; sessão expirada encaminha para login e permite voltar à rota pretendida após autenticar.
3. Nova campanha nunca fica publicada antes da aprovação administrativa.
4. Cliente não consegue aprovar a própria campanha nem ler/editar campanhas de outro cliente, incluindo através de chamadas diretas à API.
5. Decisão administrativa regista quem decidiu, quando e o motivo.
6. Orçamento USD e conversão local apresentam taxa/data; atualizar a taxa não altera movimentos financeiros históricos.
7. Testar fluxo de login, acesso negado, perfil incompleto, submissão, correções, aprovação, rejeição, isolamento entre clientes e arredondamento/conversão.
8. Antes de aplicar migrações, confirmar o projeto Supabase realmente usado pela aplicação e a sequência completa das migrações. Não executar uma migração isolada numa base vazia nem aplicar alterações destrutivas.
9. Executar testes/lint/build disponíveis e reportar resultados reais; não declarar a etapa concluída se não tiver sido testada.

## Limites desta etapa

Implementar incrementalmente no projeto existente. Primeiro diagnosticar e corrigir o acesso ao painel do cliente; depois ligar a moderação obrigatória ao fluxo de campanhas; por fim, integrar orçamento USD e equivalente local. Reutilizar tabelas, estados, componentes e políticas já existentes sempre que possível.
