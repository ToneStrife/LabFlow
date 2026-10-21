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
