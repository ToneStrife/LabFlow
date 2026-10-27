import type { EmailTemplate } from "@/data/types";

/**
 * Plantilla del lab activo; si no hay, la global del mismo template_name.
 */
export function pickEmailTemplate(
  templates: EmailTemplate[] | undefined,
  templateName: string,
  labId?: string | null
): EmailTemplate | undefined {
  if (!templates?.length) return undefined;
  const sameName = templates.filter((t) => t.template_name === templateName);
  if (!sameName.length) return undefined;
  if (labId) {
    const forLab = sameName.find((t) => t.lab_id === labId);
    if (forLab) return forLab;
  }
  return sameName.find((t) => t.lab_id == null) ?? sameName[0];
}

export function templateScopeLabel(template: EmailTemplate, labName?: string | null): string {
  if (!template.lab_id) return "Global";
  return labName ? `Lab · ${labName}` : "Laboratorio";
}
