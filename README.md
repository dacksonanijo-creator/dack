# Taskora: Connect & Earn

Quero criar uma plataforma web profissional chamada Taskora.

A plataforma deve ser moderna, rápida, escalável e preparada para crescer no futuro sem precisar ser reconstruída.

Objetivo

A Taskora conecta empresas que desejam divulgar produtos ou serviços com utilizadores que realizam microtarefas remuneradas.

No início, a plataforma será focada em Moçambique, mas toda a estrutura deve ser internacional, permitindo expansão para outros países.

Visual

Criar um design moderno, limpo e profissional, inspirado em startups tecnológicas.

Utilizar cores elegantes e transmitir confiança.

A plataforma deve funcionar perfeitamente em computador e dispositivos móveis.

Estrutura principal

Página inicial

Logo Taskora.

Banner principal explicando a plataforma.

Botão "Criar Conta".

Botão "Entrar".

Seção "Como funciona".

Seção "Vantagens para Utilizadores".

Seção "Vantagens para Empresas".

Rodapé com contactos e políticas.

Sistema de Utilizadores

Criar sistema de:

Cadastro.

Login.

Recuperação de senha.

Perfil pessoal.

Cada utilizador terá um painel próprio.

Painel do utilizador

Mostrar:

Saldo disponível.

Saldo pendente.

Total ganho.

Total sacado.

Tarefas disponíveis.

Tarefas em andamento.

Histórico de tarefas.

Histórico de saques.

Adicionar botão "Solicitar Saque".

Sistema de Empresas

Criar área exclusiva para empresas.

Cada empresa poderá:

Criar conta.

Fazer login.

Editar perfil.

Criar campanhas de tarefas.

Definir:

título;

descrição;

categoria;

valor por tarefa;

quantidade de vagas;

prazo.

Visualizar:

tarefas ativas;

tarefas finalizadas;

quantidade de participantes;

relatório simples.

Sistema de Tarefas

Cada tarefa deve possuir:

título;

descrição;

categoria;

recompensa;

prazo;

número de vagas;

estado:

ativa;

pausada;

concluída.

Preparar a estrutura para futuras integrações por API.

Nesta primeira versão, criar apenas a arquitetura necessária para receber tarefas automaticamente de empresas parceiras.

Carteira Interna

Cada utilizador terá:

Saldo pendente.

Saldo disponível.

Total recebido.

Total sacado.

Criar também uma carteira administrativa invisível para os utilizadores.

Ela deve controlar:

Receita total da plataforma.

Valor devido aos utilizadores.

Fundo de reserva.

Lucro da empresa.

Não mostrar esta área ao público.

Sistema de Saques

Criar página de solicitação de saque.

Campos:

Método de pagamento.

Nome do titular.

Número da carteira ou conta.

Valor solicitado.

Status:

Pendente.

Aprovado.

Pago.

Rejeitado.

A estrutura deve permitir futuras integrações com M-Pesa, e-Mola, Pix e outros métodos.

Painel Administrativo

Criar painel completo para administradores.

Menus:

Dashboard.

Utilizadores.

Empresas.

Tarefas.

Saques.

Relatórios.

Finanças.

Dashboard deve mostrar:

Total de utilizadores.

Total de empresas.

Total de tarefas.

Total pago.

Total faturado.

Saques pendentes.

Segurança

Implementar:

verificação de email;

CAPTCHA;

limitação básica contra contas duplicadas;

estrutura preparada para futuro sistema anti-fraude.

Banco de Dados

Criar estrutura organizada e modular.

Tabelas principais:

users

companies

tasks

task_submissions

wallets

withdrawals

transactions

admin_finance

Preparar o sistema para futuras integrações de APIs externas.

Objetivo desta primeira versão

Criar uma base profissional, organizada e escalável.

Não implementar ainda integrações complexas de APIs nem validações avançadas.

O foco é entregar uma plataforma funcional, bonita, organizada e pronta para crescer gradualmente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3a360413-7b0d-4c55-adaa-83c84e4efcd0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
