/** Traduz erros do serviço de autenticação para mensagens claras em português. */
export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou palavra-passe incorretos.";
  if (m.includes("email not confirmed")) return "Confirma o teu email antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com este email. Entra em vez de criar conta.";
  if (m.includes("password should be at least"))
    return "A palavra-passe deve ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "O email indicado não é válido.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiadas tentativas. Aguarda alguns minutos e tenta novamente.";
  if (m.includes("weak password")) return "Palavra-passe demasiado fraca. Escolhe outra.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Sem ligação ao servidor. Verifica a tua internet e tenta novamente.";
  return raw || "Ocorreu um erro inesperado. Tenta novamente.";
}

export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
