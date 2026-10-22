/** Cuentas que autentican en smtp.gmail.com (Gmail / Google Workspace UGR). */
export function esHostGmailSmtp(email: string): boolean {
  const e = email.trim().toLowerCase();
  return (
    e.endsWith("@gmail.com") ||
    e.endsWith("@googlemail.com") ||
    e.endsWith("@go.ugr.es") ||
    e.endsWith("@ugr.es")
  );
}

/**
 * Gmail/Workspace exige el correo completo como usuario SMTP.
 * Si alguien guarda solo «niceto», usamos el email de la cuenta.
 */
export function resolveSmtpUser(email: string, smtpUser: string | null | undefined): string {
  const user = (smtpUser ?? "").trim();
  const correo = email.trim().toLowerCase();
  if (esHostGmailSmtp(correo) && (!user || !user.includes("@"))) {
    return correo;
  }
  return user || correo;
}
