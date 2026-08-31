import { useEffect, type RefObject } from "react";

/**
 * Antes da hidratação o formulário renderizado pelo servidor já aceita escrita,
 * mas o React substitui esses valores pelos do estado inicial (vazio) ao montar.
 * Este hook recupera o que já estava escrito no DOM (ou preenchido pelo browser)
 * e devolve-o para o estado do componente.
 */
export function useAdoptDomFormValues(
  ref: RefObject<HTMLFormElement | null>,
  adopt: (values: Record<string, string>, checks: Record<string, boolean>) => void,
) {
  useEffect(() => {
    const form = ref.current;
    if (!form) return;

    const read = () => {
      const values: Record<string, string> = {};
      const checks: Record<string, boolean> = {};
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select").forEach((el) => {
        if (!el.name) return;
        if (el instanceof HTMLInputElement && el.type === "checkbox") {
          if (el.checked) checks[el.name] = true;
          return;
        }
        if (el.value) values[el.name] = el.value;
      });
      if (Object.keys(values).length || Object.keys(checks).length) adopt(values, checks);
    };

    read();
    // O autofill do browser pode chegar ligeiramente depois da hidratação.
    const timer = window.setTimeout(read, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
