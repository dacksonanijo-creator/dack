export interface MockTask {
  id: string;
  title: string;
  category: string;
  minutes: number;
  reward: string;
  emoji: string;
  tint: string;
  description: string;
  steps: string[];
  rules?: string[];
  deadline?: string;
  slots?: number;
}

export const taskRules = [
  "Concluir todos os passos indicados antes de submeter.",
  "Enviar provas legíveis e sem edição.",
  "Uma submissão por conta e por tarefa.",
];


export const tasks: MockTask[] = [
  {
    id: "app-review",
    slots: 42,
    title: "Testar app de finanças e escrever review",
    category: "Testes de App",
    minutes: 12,
    reward: "120 MT",
    emoji: "📱",
    tint: "from-primary/15 to-primary/5",
    description:
      "Instala a aplicação, explora as três funcionalidades principais e partilha uma opinião honesta sobre a experiência de utilização.",
    steps: [
      "Instalar a aplicação a partir da loja",
      "Criar uma conta de demonstração",
      "Explorar o painel principal durante 5 minutos",
      "Escrever um review com pelo menos 3 frases",
    ],
  },
  {
    id: "survey-mobile",
    slots: 180,
    title: "Questionário sobre hábitos de consumo móvel",
    category: "Inquéritos",
    minutes: 6,
    reward: "60 MT",
    emoji: "📝",
    tint: "from-money/20 to-money/5",
    description:
      "Um questionário curto com 14 perguntas de escolha múltipla sobre o uso do telemóvel no dia a dia.",
    steps: ["Responder às 14 perguntas", "Confirmar as respostas", "Submeter o questionário"],
  },
  {
    id: "social-share",
    slots: 65,
    title: "Partilhar campanha nas redes sociais",
    category: "Redes Sociais",
    minutes: 4,
    reward: "45 MT",
    emoji: "🚀",
    tint: "from-warning/25 to-warning/5",
    description:
      "Publica a campanha no teu perfil e mantém a publicação visível durante pelo menos 48 horas.",
    steps: ["Descarregar o material da campanha", "Publicar no perfil", "Enviar o link da publicação"],
  },
  {
    id: "photo-store",
    slots: 12,
    title: "Fotografar prateleira em loja local",
    category: "Trabalho de Campo",
    minutes: 20,
    reward: "250 MT",
    emoji: "📸",
    tint: "from-accent to-accent/20",
    description:
      "Visita uma loja parceira, fotografa a prateleira indicada e confirma a disponibilidade dos produtos.",
    steps: ["Visitar a loja indicada", "Tirar 3 fotografias nítidas", "Indicar produtos em falta"],
  },
  {
    id: "transcribe",
    slots: 28,
    title: "Transcrever áudio curto em português",
    category: "Transcrição",
    minutes: 15,
    reward: "160 MT",
    emoji: "🎧",
    tint: "from-primary/15 to-money/10",
    description: "Ouve um áudio de 3 minutos e transcreve o conteúdo com pontuação correta.",
    steps: ["Ouvir o áudio completo", "Transcrever o conteúdo", "Rever ortografia e pontuação"],
  },
  {
    id: "data-label",
    slots: 90,
    title: "Classificar imagens para modelo de IA",
    category: "Dados & IA",
    minutes: 9,
    reward: "95 MT",
    emoji: "🧠",
    tint: "from-money/20 to-primary/10",
    description: "Classifica 40 imagens em categorias simples para treinar um modelo de visão.",
    steps: ["Ler o guia de classificação", "Classificar as 40 imagens", "Submeter o lote"],
  },
];

export const notifications = [
  {
    id: "n1",
    title: "Tarefa aprovada",
    body: "A tua submissão “Questionário sobre hábitos” foi aprovada.",
    time: "há 12 min",
    kind: "success" as const,
    unread: true,
  },
  {
    id: "n2",
    title: "Nova tarefa perto de ti",
    body: "Trabalho de campo disponível em Maputo — 250 MT.",
    time: "há 2 h",
    kind: "info" as const,
    unread: true,
  },
  {
    id: "n3",
    title: "Perfil 80% completo",
    body: "Adiciona o teu documento para desbloquear tarefas premium.",
    time: "ontem",
    kind: "warning" as const,
    unread: false,
  },
  {
    id: "n4",
    title: "Bem-vindo à Taskora",
    body: "Explora as primeiras tarefas recomendadas para ti.",
    time: "há 3 dias",
    kind: "info" as const,
    unread: false,
  },
];

export const history = [
  { id: "h1", title: "Questionário sobre hábitos de consumo", date: "28 Jul 2026", status: "Aprovada", reward: "60 MT" },
  { id: "h2", title: "Classificar imagens para modelo de IA", date: "26 Jul 2026", status: "Em revisão", reward: "95 MT" },
  { id: "h3", title: "Partilhar campanha nas redes sociais", date: "24 Jul 2026", status: "Aprovada", reward: "45 MT" },
  { id: "h4", title: "Transcrever áudio curto", date: "21 Jul 2026", status: "Rejeitada", reward: "0 MT" },
  { id: "h5", title: "Testar app de finanças", date: "18 Jul 2026", status: "Aprovada", reward: "120 MT" },
];

export const user = {
  name: "Ana Mucavele",
  username: "@anamuc",
  email: "ana.mucavele@email.com",
  country: "Moçambique",
  joined: "12 Março 2026",
  status: "Verificada",
  initials: "AM",
};

export const countries = [
  "Moçambique",
  "Angola",
  "Cabo Verde",
  "Guiné-Bissau",
  "Portugal",
  "Brasil",
  "São Tomé e Príncipe",
];
