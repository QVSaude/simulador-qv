# QV Health - Cotação de Planos de Saúde

Este é um projeto de um sistema de cotação e gerenciamento de planos de saúde, construído com Next.js, Firebase e ShadCN/UI. A aplicação permite que clientes solicitem cotações personalizadas, que são salvas em um banco de dados, e que corretores gerenciem essas cotações através de um painel administrativo.

## ✨ Funcionalidades Principais

### 1. Simulação e Cotação Dinâmica (Para Clientes)

- **Formulário Inteligente**: Em `/cotacao-form`, um formulário intuitivo coleta os dados necessários para a simulação.
- **Integração em Tempo Real**: Conecta-se diretamente com a API da Vexur para buscar em tempo real:
  - Lista de **profissões** elegíveis.
  - **Entidades de classe** associadas a cada profissão.
  - **Planos de saúde** disponíveis com base no perfil do usuário, localidade e entidade.
- **Geração de Simulação**: Exibe uma lista de planos de saúde com valores e detalhes reais, permitindo ao usuário comparar e escolher a melhor opção.
- **Salvamento no Banco de Dados**: Ao selecionar um plano, a cotação é salva de forma segura no Firebase Firestore, garantindo a persistência dos dados.

### 2. Compartilhamento e Visualização de Cotações

- **Link Único e Compartilhável**: Para cada cotação salva, o sistema gera um link único (ex: `/cotacao/view?id=...`).
- **Página de Visualização Dedicada**: O link leva a uma página que carrega os detalhes da cotação diretamente do Firestore. Isso permite que o cliente (ou qualquer pessoa com o link) visualize a proposta de forma clara e profissional a qualquer momento.
- **Impressão e PDF**: A página de visualização possui uma função para imprimir ou salvar a cotação como um arquivo PDF limpo, ideal para envio por e-mail ou arquivamento.
- **Envio por WhatsApp**: O corretor pode enviar o link da cotação diretamente para o WhatsApp do cliente através de um botão na tela de resultados da simulação.

### 3. Painel do Corretor (`/dashboard`)

- **Acesso Restrito**: O acesso ao painel é protegido por uma tela de login (`/login`), com credenciais gerenciadas no arquivo `src/lib/users.json`.
- **Visualização de Cotações Salvas**: A seção "Cotações adesão" exibe uma tabela dinâmica com todas as cotações geradas e salvas no Firestore. O corretor pode ver rapidamente os dados do cliente e o valor do plano.
- **Link Direto para Cotação**: Cada item na tabela de cotações possui um link direto para a página de visualização daquela proposta específica.
- **Gerenciamento de Propostas**: Inclui uma tabela estática (usando `src/lib/proposals.json` como exemplo) para o gerenciamento de propostas de adesão, com status visual para cada uma (Emitida, Pendente, Paga, etc.).
- **Layout Responsivo**: O painel possui um menu lateral expansível/colapsável, adaptando-se a diferentes tamanhos de tela.

## 🚀 Arquitetura e Tecnologias

- **Framework**: [Next.js](https://nextjs.org/) (com App Router) e React 19.
- **Linguagem**: TypeScript.
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/) e [ShadCN/UI](https://ui.shadcn.com/) para componentes.
- **Backend & Orquestração**: [Genkit](https://firebase.google.com/docs/genkit) para criar e gerenciar os fluxos que se comunicam com a API externa da Vexur.
- **Banco de Dados & Autenticação**: [Firebase](https://firebase.google.com/) (Firestore para armazenamento de cotações e Firebase Auth para autenticação anônima de clientes e autenticação de corretores).
- **Validação de Formulários**: [React Hook Form](https://react-hook-form.com/) e [Zod](https://zod.dev/) para validação robusta dos dados do formulário.
- **Ícones**: [Lucide React](https://lucide.dev/guide/react).

## 📂 Estrutura do Projeto

Abaixo, uma visão geral dos diretórios mais importantes do projeto:

- `src/app/`: Contém as rotas e páginas da aplicação (ex: `/cotacao-form`, `/dashboard`, `/login`).
- `src/components/`: Armazena os componentes React reutilizáveis, como o formulário de cotação (`QuoteForm`), a tabela de resultados (`SimulationResult`), e os componentes de UI da ShadCN.
- `src/ai/flows/`: Local da lógica de backend (fluxos Genkit). Cada arquivo é responsável por uma interação específica com a API da Vexur (buscar profissões, entidades e produtos).
- `src/firebase/`: Contém toda a configuração, inicialização e hooks customizados para interagir com os serviços do Firebase (Firestore e Auth).
- `src/lib/`: Inclui arquivos de dados estáticos (como `proposals.json`, `users.json`), configurações (`config.ts`) e funções utilitárias.
- `docs/backend.json`: Descreve o esquema da estrutura de dados (`Quote`) utilizada no Firestore.
- `firestore.rules`: Define as regras de segurança para o banco de dados Firestore, controlando quem pode ler e escrever os dados.

## 🏁 Como Começar

Siga os passos abaixo para configurar e executar o projeto em seu ambiente de desenvolvimento.

### Pré-requisitos

- [Node.js](https://nodejs.org/en/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

### Instalação

1.  Clone o repositório para sua máquina local.
2.  Navegue até o diretório do projeto.
3.  Instale as dependências:
    ```bash
    npm install
    ```

### Executando a Aplicação

Para iniciar o servidor de desenvolvimento, execute:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:9002`.

- A página inicial (`/`) agora redireciona para o formulário de cotação.
- O formulário principal fica em `/cotacao-form`.
- O login do corretor fica em `/login`.
- O painel do corretor pode ser acessado em `/dashboard`.

### Configuração do Firebase

Este projeto é configurado para funcionar com o **Firebase App Hosting**. Isso significa que a configuração do Firebase é injetada automaticamente no ambiente de produção.

Para desenvolvimento local ou para migrar para um novo projeto Firebase:

1.  Vá até o [Console do Firebase](https://console.firebase.google.com/) e crie um novo projeto.
2.  Nas configurações do projeto, crie um novo "Aplicativo da Web".
3.  Copie o objeto de configuração do Firebase (`firebaseConfig`).
4.  Cole esse objeto no arquivo `src/firebase/config.ts`.
5.  No painel do corretor, a listagem de cotações não funcionará localmente a menos que você configure as regras do Firestore no seu projeto Firebase (copiando o conteúdo de `firestore.rules`).

Para **migrar o projeto de produção**, basta me informar o **ID do seu novo projeto Firebase**, e eu farei a vinculação para você.

## 🔮 Próximos Passos e Melhorias

- **Propostas Dinâmicas**: Tornar a seção de "Propostas" no dashboard dinâmica, salvando e gerenciando os dados no Firestore.
- **Autenticação Segura**: Substituir o `users.json` por um sistema de autenticação mais robusto do Firebase para os corretores.
- **Expandir Funcionalidades**: Implementar as outras seções do menu do dashboard (P.M.E, Material de apoio, etc.).
- **Testes**: Adicionar testes unitários e de integração para garantir a estabilidade do código.
