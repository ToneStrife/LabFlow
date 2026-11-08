/** Escapa texto para insertarlo en HTML (cuerpo de correo, atributos entre comillas). */
export const escapeHtml = (value: string | number | null | undefined): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
