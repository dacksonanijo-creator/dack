export const PASSWORD_POLICY = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
} as const;

export function passwordMeetsPolicy(value: string): boolean {
  return (
    value.length >= PASSWORD_POLICY.minLength &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function passwordPolicyRules(value: string) {
  return [
    { key: "uppercase", label: "Pelo menos 1 letra maiúscula", valid: /[A-Z]/.test(value) },
    { key: "lowercase", label: "Pelo menos 1 letra minúscula", valid: /[a-z]/.test(value) },
    { key: "number", label: "Pelo menos 1 número", valid: /\d/.test(value) },
    { key: "symbol", label: "Pelo menos 1 símbolo", valid: /[^A-Za-z0-9]/.test(value) },
    { key: "length", label: "Mínimo de 10 caracteres", valid: value.length >= PASSWORD_POLICY.minLength },
  ];
}
