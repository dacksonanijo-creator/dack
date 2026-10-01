/**
 * ============================================================
 *  IDENTIDADE VISUAL OFICIAL — TASKORA
 * ============================================================
 *
 *  O símbolo proprietário da marca é desenhado em SVG no
 *  componente TaskoraMark. Não depende de ícones, stock images
 *  ou ficheiros externos.
 *
 *  O branding administrativo continua disponível: uma imagem
 *  publicada pelo administrador pode substituir o símbolo nativo.
 * ============================================================
 */

export const brandName = "Taskora";

export const brandPalette = {
  primary: "#4F46E5",
  secondary: "#16A34A",
  ink: "#111827",
  paper: "#FFFFFF",
} as const;

export const brandLogo: {
  light: string | null;
  dark: string | null;
  alt: string;
  showWordmark: boolean;
} = {
  light: null,
  dark: null,
  alt: "Símbolo oficial da marca TASKORA",
  showWordmark: true,
};
