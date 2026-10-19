/**
 * El panel de Admin no es una sola puerta. Cada pestaña corresponde a un
 * permiso de la matriz: quien lo tenga entra en esa sección aunque su rol
 * no sea Administrador.
 *
 * Cuentas SMTP también se abre con users.manage, que el rol Admin tiene
 * siempre. Así se puede guardar el correo aunque la migración que crea
 * smtp.manage todavía no esté aplicada.
 */
export const PESTANAS_ADMIN = [
  { value: "users", permission: "users.manage" },
  { value: "account-managers", permission: "account_managers.manage" },
  { value: "projects", permission: "projects.manage" },
  { value: "addresses", permission: "addresses.manage" },
  { value: "email-templates", permission: "email_templates.manage" },
  { value: "smtp-accounts", anyOf: ["smtp.manage", "users.manage"] },
  { value: "email-logs", permission: "email_templates.manage" },
  { value: "notifications", permission: "notifications.send" },
  { value: "permissions", permission: "permissions.manage" },
] as const;

type Pestana = (typeof PESTANAS_ADMIN)[number];

export const puedeAbrirPestana = (
  can: (permiso: string) => boolean,
  pestana: { permission?: string; anyOf?: readonly string[] }
) => {
  if (pestana.anyOf?.length) return pestana.anyOf.some((permiso) => can(permiso));
  return pestana.permission ? can(pestana.permission) : false;
};

const permisosDe = (pestana: Pestana): readonly string[] =>
  "anyOf" in pestana ? pestana.anyOf : [pestana.permission];

export const PERMISOS_PANEL_ADMIN = [
  ...new Set(PESTANAS_ADMIN.flatMap(permisosDe)),
] as const;
