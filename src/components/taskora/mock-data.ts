/**
 * Demo content. Every user-visible string is a translation key resolved with
 * t(...) at render time, so the whole catalogue switches with the language.
 */
export interface MockTask {
  id: string;
  titleKey: string;
  categoryKey: string;
  minutes: number;
  reward: string;
  emoji: string;
  tint: string;
  descriptionKey: string;
  stepKeys: string[];
  ruleKeys?: string[];
  deadline?: string;
  slots?: number;
}

export const taskRules = [
  "content.rules.allSteps",
  "content.rules.readableProof",
  "content.rules.onePerAccount",
];

export const tasks: MockTask[] = [
  {
    id: "app-review",
    slots: 42,
    titleKey: "content.task.appReview.title",
    categoryKey: "content.category.appTesting",
    minutes: 12,
    reward: "120 MT",
    emoji: "📱",
    tint: "from-primary/15 to-primary/5",
    descriptionKey: "content.task.appReview.desc",
    stepKeys: [
      "content.task.appReview.s1",
      "content.task.appReview.s2",
      "content.task.appReview.s3",
      "content.task.appReview.s4",
    ],
  },
  {
    id: "survey-mobile",
    slots: 180,
    titleKey: "content.task.surveyMobile.title",
    categoryKey: "content.category.surveys",
    minutes: 6,
    reward: "60 MT",
    emoji: "📝",
    tint: "from-money/20 to-money/5",
    descriptionKey: "content.task.surveyMobile.desc",
    stepKeys: [
      "content.task.surveyMobile.s1",
      "content.task.surveyMobile.s2",
      "content.task.surveyMobile.s3",
    ],
  },
  {
    id: "social-share",
    slots: 65,
    titleKey: "content.task.socialShare.title",
    categoryKey: "content.category.social",
    minutes: 4,
    reward: "45 MT",
    emoji: "🚀",
    tint: "from-warning/25 to-warning/5",
    descriptionKey: "content.task.socialShare.desc",
    stepKeys: [
      "content.task.socialShare.s1",
      "content.task.socialShare.s2",
      "content.task.socialShare.s3",
    ],
  },
  {
    id: "photo-store",
    slots: 12,
    titleKey: "content.task.photoStore.title",
    categoryKey: "content.category.fieldwork",
    minutes: 20,
    reward: "250 MT",
    emoji: "📸",
    tint: "from-accent to-accent/20",
    descriptionKey: "content.task.photoStore.desc",
    stepKeys: [
      "content.task.photoStore.s1",
      "content.task.photoStore.s2",
      "content.task.photoStore.s3",
    ],
  },
  {
    id: "transcribe",
    slots: 28,
    titleKey: "content.task.transcribe.title",
    categoryKey: "content.category.transcription",
    minutes: 15,
    reward: "160 MT",
    emoji: "🎧",
    tint: "from-primary/15 to-money/10",
    descriptionKey: "content.task.transcribe.desc",
    stepKeys: [
      "content.task.transcribe.s1",
      "content.task.transcribe.s2",
      "content.task.transcribe.s3",
    ],
  },
  {
    id: "data-label",
    slots: 90,
    titleKey: "content.task.dataLabel.title",
    categoryKey: "content.category.dataAi",
    minutes: 9,
    reward: "95 MT",
    emoji: "🧠",
    tint: "from-money/20 to-primary/10",
    descriptionKey: "content.task.dataLabel.desc",
    stepKeys: [
      "content.task.dataLabel.s1",
      "content.task.dataLabel.s2",
      "content.task.dataLabel.s3",
    ],
  },
];

export const countries = [
  "content.country.mz",
  "content.country.ao",
  "content.country.cv",
  "content.country.gw",
  "content.country.pt",
  "content.country.br",
  "content.country.st",
];
