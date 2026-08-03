/** Traduz erros do serviço de autenticação em chaves de mensagem i18n. */
export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "auth.err.invalidCredentials";
  if (m.includes("email not confirmed")) return "auth.err.emailNotConfirmed";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "auth.err.userAlreadyRegistered";
  if (m.includes("password should be at least"))
    return "auth.err.passwordMinLength";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "auth.err.invalidEmail";
  if (m.includes("rate limit") || m.includes("too many"))
    return "auth.err.rateLimit";
  if (m.includes("weak password")) return "auth.err.weakPassword";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "auth.err.network";
  return "auth.err.unexpected";
}

export const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
