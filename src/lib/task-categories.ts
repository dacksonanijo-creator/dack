// TASKORA — Registo partilhado de categorias de tarefas.
// Fonte de verdade para o assistente de criação (empresa) e para a moderação (admin).
// Valores legados (verified_page_visits, content_promotion, media_promotion) continuam
// válidos na base de dados para tarefas já criadas; o assistente já não os apresenta.

export type CategoryField = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
};

export type TaskCategory = {
  value: string;
  label: string;
  detail: string;
  requiresUrl?: boolean;
  fields?: CategoryField[];
  /** Regras obrigatórias apresentadas na etapa 1 (documento de categorias). */
  rules: string[];
};

export const TASK_CATEGORIES: TaskCategory[] = [
  {
    value: "questionnaires_surveys",
    label: "Inquéritos e questionários",
    detail: "Responder a inquéritos, pesquisas de mercado e questionários com opiniões reais.",
    fields: [
      { key: "audience", label: "Público-alvo do inquérito", required: true, maxLength: 300 },
      { key: "questions_count", label: "Número aproximado de perguntas", maxLength: 60 },
    ],
    rules: [
      "Indica o objetivo do inquérito.",
      "Indica os requisitos de participação e o tempo estimado.",
      "Protege os dados pessoais dos participantes; não recolhas dados sensíveis sem fundamento legítimo.",
    ],
  },
  {
    value: "research_info",
    label: "Pesquisa e recolha de informações",
    detail: "Pesquisar informações públicas, organizar dados e preparar relatórios.",
    fields: [
      { key: "sources", label: "Fontes ou critérios de pesquisa", required: true, maxLength: 500 },
      { key: "delivery_format", label: "Formato da entrega", required: true, maxLength: 200 },
    ],
    rules: [
      "Indica as fontes ou os critérios de pesquisa.",
      "Proibido acesso não autorizado a contas ou sistemas.",
      "Proibida a recolha indevida de dados pessoais.",
      "Define o formato da entrega.",
    ],
  },
  {
    value: "data_entry",
    label: "Entrada e organização de dados",
    detail: "Introduzir, organizar, categorizar e corrigir dados.",
    fields: [
      { key: "format", label: "Formato dos dados", required: true, maxLength: 300 },
      { key: "quality_criteria", label: "Critérios de qualidade", required: true, maxLength: 500 },
    ],
    rules: [
      "Define o formato dos dados e os critérios de qualidade.",
      "Restringe o acesso a dados privados.",
      "Proibida a utilização não autorizada de informações confidenciais.",
    ],
  },
  {
    value: "website_app_testing",
    label: "Testes de aplicações e websites",
    detail: "Testar funcionalidades, formulários e navegação, e reportar resultados reais.",
    requiresUrl: true,
    fields: [
      { key: "steps", label: "Passos a executar", required: true, maxLength: 1000 },
      { key: "expected_results", label: "Resultados esperados", required: true, maxLength: 500 },
    ],
    rules: [
      "Confirma que tens autorização para solicitar os testes.",
      "Descreve os passos e os resultados esperados.",
      "Proibidos testes para invadir sistemas ou contornar mecanismos de segurança.",
    ],
  },
  {
    value: "photography",
    label: "Fotografia",
    detail: "Fotografar produtos, locais autorizados e preparar imagens para catálogos.",
    fields: [
      { key: "subject", label: "Objeto ou local a fotografar", required: true, maxLength: 300 },
      { key: "format_quality", label: "Formato e qualidade pretendidos", required: true, maxLength: 300 },
      { key: "usage_rights", label: "Direitos de utilização das imagens", required: true, maxLength: 400 },
    ],
    rules: [
      "Indica o objeto, o formato e a qualidade pretendida.",
      "Define os direitos de utilização das imagens.",
      "Proibidas fotografias que violem a privacidade ou a lei.",
    ],
  },
  {
    value: "audio_recording",
    label: "Gravação de áudio e voz",
    detail: "Ler textos, gravar sons autorizados e produzir narrações.",
    fields: [
      { key: "language", label: "Idioma da gravação", required: true, maxLength: 100 },
      { key: "duration", label: "Duração pretendida", required: true, maxLength: 100 },
      { key: "purpose", label: "Finalidade da gravação", required: true, maxLength: 400 },
    ],
    rules: [
      "Define idioma, duração, formato e qualidade.",
      "Informa a finalidade e obtém os consentimentos necessários.",
      "Proibida a clonagem de voz ou imitação de pessoas sem autorização adequada.",
    ],
  },
  {
    value: "video_production",
    label: "Produção de vídeos",
    detail: "Criar vídeos originais, demonstrações de produtos, tutoriais e conteúdos educativos.",
    fields: [
      { key: "duration", label: "Duração do vídeo", required: true, maxLength: 100 },
      { key: "format", label: "Formato e tema", required: true, maxLength: 400 },
      { key: "usage_rights", label: "Direitos de utilização do vídeo", required: true, maxLength: 400 },
    ],
    rules: [
      "Indica duração, formato, tema e requisitos.",
      "Exige autorização para utilização de imagens de terceiros.",
      "Identifica conteúdos patrocinados quando aplicável.",
    ],
  },
  {
    value: "writing_editing",
    label: "Escrita e edição",
    detail: "Redigir textos, rever documentos, corrigir gramática e descrever produtos.",
    fields: [
      { key: "language", label: "Idioma do texto", required: true, maxLength: 100 },
      { key: "length", label: "Tamanho aproximado", required: true, maxLength: 100 },
      { key: "format", label: "Formato de entrega", required: true, maxLength: 200 },
    ],
    rules: [
      "Define objetivo, idioma, tamanho e formato.",
      "Proibido plágio e utilização indevida de conteúdo protegido.",
      "Define os critérios de aceitação.",
    ],
  },
  {
    value: "translation_transcription",
    label: "Tradução e transcrição",
    detail: "Traduzir textos, transcrever áudios e vídeos e criar legendas.",
    fields: [
      { key: "languages", label: "Idiomas envolvidos", required: true, maxLength: 200 },
      { key: "format", label: "Formato de entrega", required: true, maxLength: 200 },
    ],
    rules: [
      "Indica idiomas, formato e nível de qualidade.",
      "Define o formato de entrega.",
      "Respeita a confidencialidade dos materiais fornecidos.",
    ],
  },
  {
    value: "data_annotation",
    label: "Anotação e classificação de dados",
    detail: "Classificar imagens, categorizar textos e etiquetar dados para projetos autorizados.",
    fields: [
      { key: "guidelines", label: "Instruções e critérios de classificação", required: true, maxLength: 800 },
      { key: "examples", label: "Exemplos fornecidos (opcional)", maxLength: 500 },
    ],
    rules: [
      "Fornece instruções e exemplos.",
      "Define critérios de qualidade.",
      "Proibida classificação destinada a atividades ilegais ou abusivas.",
    ],
  },
  {
    value: "product_service_review",
    label: "Avaliação de produtos e serviços",
    detail: "Testar produtos e recolher avaliações honestas de experiências reais.",
    requiresUrl: true,
    fields: [
      { key: "tested_item", label: "Produto ou serviço a avaliar", required: true, maxLength: 300 },
      { key: "disclosure", label: "Divulgação do incentivo", required: true, maxLength: 300 },
    ],
    rules: [
      "Distingue testes reais de avaliações fictícias.",
      "Proibidas opiniões falsas ou avaliações pagas destinadas a enganar consumidores.",
      "Exige divulgação de incentivos quando aplicável.",
    ],
  },
  {
    value: "creator_campaigns",
    label: "Campanhas legítimas para criadores",
    detail: "Conteúdos patrocinados, demonstrações e divulgação autorizada de marcas.",
    requiresUrl: true,
    fields: [
      { key: "platform", label: "Plataforma de destino", required: true, maxLength: 200 },
      { key: "deliverables", label: "Entregas exigidas ao criador", required: true, maxLength: 500 },
    ],
    rules: [
      "Identifica o objetivo comercial da campanha.",
      "Respeita as regras da plataforma de destino.",
      "Exige identificação de publicidade quando aplicável.",
      "Proibida a compra artificial de seguidores, gostos, visualizações, comentários ou subscritores.",
      "Proibida a manipulação de métricas ou utilização de contas falsas.",
    ],
  },
  {
    value: "other_digital",
    label: "Outras tarefas digitais legítimas",
    detail: "Outra atividade digital legítima, sujeita a autorização administrativa.",
    fields: [
      { key: "justification", label: "Justifica porque é esta tarefa legítima", required: true, maxLength: 800 },
    ],
    rules: [
      "Nova categorias podem ser autorizadas pela administração no futuro.",
      "Tarefas de categorias novas passam sempre por análise administrativa.",
    ],
  },
];

/** Categorias legadas que continuam válidas na base de dados mas não aparecem no assistente. */
export const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  verified_page_visits: "Visitas a páginas com objetivo verificável",
  content_promotion: "Promoção de conteúdo",
  media_promotion: "Divulgação de vídeos e músicas",
};

const allLabels: Record<string, string> = {};
for (const item of TASK_CATEGORIES) allLabels[item.value] = item.label;
for (const [key, label] of Object.entries(LEGACY_CATEGORY_LABELS)) allLabels[key] = label;

export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return allLabels[value] ?? value;
}

export function getCategory(value: string): TaskCategory | undefined {
  return TASK_CATEGORIES.find((item) => item.value === value);
}

/** Métodos de entrega possíveis (etapa 3 do assistente). */
export const DELIVERY_METHODS: { value: string; label: string; description: string }[] = [
  { value: "form_response", label: "Resposta a formulário", description: "O trabalhador responde num formulário." },
  { value: "text", label: "Texto", description: "Resposta escrita submetida na plataforma." },
  { value: "file", label: "Ficheiro", description: "Documento ou folha de cálculo entregue como ficheiro." },
  { value: "photo", label: "Fotografia", description: "Imagem como prova ou entrega." },
  { value: "video", label: "Vídeo", description: "Gravação entregue como resultado." },
  { value: "audio", label: "Áudio", description: "Gravação de voz ou som." },
  { value: "report", label: "Relatório", description: "Relatório estruturado da atividade." },
  { value: "test_result", label: "Resultado de teste", description: "Registo do resultado de um teste." },
  { value: "other", label: "Outro formato autorizado", description: "Formato diferente, sujeito a análise." },
];

export const DELIVERY_VALUES = DELIVERY_METHODS.map((item) => item.value);

export function deliveryLabel(value: string): string {
  return DELIVERY_METHODS.find((item) => item.value === value)?.label ?? value;
}

/** Modos de validação (etapa 5 do assistente). */
export const VALIDATION_MODES: { value: string; label: string; description: string }[] = [
  { value: "automatic", label: "Validação automática", description: "Verificação automática quando tecnicamente possível." },
  { value: "rule_based", label: "Validação por regras predefinidas", description: "Regras objetivas definidas na tarefa." },
  { value: "client_review", label: "Revisão pelo cliente", description: "A tua empresa analisa cada entrega." },
  { value: "admin_review", label: "Revisão administrativa", description: "A equipa TASKORA valida as conclusões." },
];

export function validationModeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return VALIDATION_MODES.find((item) => item.value === value)?.label ?? value;
}

/** Valores legados normalizados para o modo de validação. */
export function legacyValidationLabel(value: string | null | undefined): string {
  return validationModeLabel(value);
}
