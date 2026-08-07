/**
 * ============================================================
 *  IDENTIDADE VISUAL DA TASKORA — LOGÓTIPO OFICIAL
 * ============================================================
 *
 *  COMO INSERIR O TEU LOGÓTIPO (PNG, SVG, JPG ou WebP):
 *
 *  1. Coloca o ficheiro em `src/assets/` (ex.: src/assets/taskora-logo.svg)
 *  2. Importa-o aqui em cima:
 *       import logo from "@/assets/taskora-logo.svg";
 *       import logoDark from "@/assets/taskora-logo-dark.svg"; // opcional
 *  3. Substitui `null` pelos imports:
 *       export const brandLogo = { light: logo, dark: logoDark };
 *
 *  Enquanto estiver `null`, a plataforma mostra um espaço reservado
 *  (placeholder) em todos os ecrãs onde a marca aparece.
 *
 *  Nenhum logótipo é gerado automaticamente.
 * ============================================================
 */

export const brandName = "Taskora";

export const brandLogo: {
  /** Logótipo usado em fundos claros (tema claro). */
  light: string | null;
  /** Logótipo usado em fundos escuros (tema escuro). Opcional. */
  dark: string | null;
  /** Texto alternativo da imagem. */
  alt: string;
  /** Mostrar o nome da marca ao lado do logótipo. */
  showWordmark: boolean;
} = {
  light: null,
  dark: null,
  alt: "Logótipo Taskora",
  showWordmark: true,
};
