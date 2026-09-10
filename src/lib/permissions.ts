import { Profile, Project, RequestStatus } from "@/data/types";

export type UserRole = Profile["role"];

/** Comprobador de permisos (p. ej. useCan().can). */
export type CanFn = (key: string) => boolean;

export type ProjectIpRef = Pick<Project, "id" | "ip_profile_id">;

export function isAdmin(role?: UserRole): boolean {
  return role === "Admin";
}

/** IPs de los proyectos enlazados a una solicitud (project_codes guarda UUIDs). */
export function getRequestProjectIpIds(
  projectCodes: string[] | null | undefined,
  projects: ProjectIpRef[] | undefined
): string[] {
  if (!projectCodes?.length || !projects?.length) return [];
  const ids = new Set<string>();
  for (const projectId of projectCodes) {
    const ip = projects.find((p) => p.id === projectId)?.ip_profile_id;
    if (ip) ids.add(ip);
  }
  return [...ids];
}

export function isProjectIpForRequest(
  userId: string | undefined,
  projectCodes: string[] | null | undefined,
  projects: ProjectIpRef[] | undefined
): boolean {
  if (!userId) return false;
  return getRequestProjectIpIds(projectCodes, projects).includes(userId);
}

export interface ApprovalContext {
  role?: UserRole;
  userId?: string;
  can?: CanFn;
  projectCodes?: string[] | null;
  projects?: ProjectIpRef[];
}

/**
 * Quién puede aprobar pendientes:
 * - permiso requests.approve (matriz),
 * - Admin,
 * - IP de alguno de los proyectos de la solicitud.
 */
export function canApprovePendingRequest(ctx: ApprovalContext): boolean {
  if (ctx.can?.("requests.approve")) return true;
  if (isAdmin(ctx.role)) return true;
  return isProjectIpForRequest(ctx.userId, ctx.projectCodes, ctx.projects);
}

export function canMergeRequest(role?: UserRole): boolean {
  return role != null;
}

export function canPerformWorkflowAction(
  ctx: ApprovalContext,
  status?: RequestStatus
): boolean {
  if (!ctx.role || !status) return false;
  if (status === "Pending") return canApprovePendingRequest(ctx);
  return true;
}

/** Any authenticated role can receive packages for Ordered requests. */
export function canReceivePackages(role?: UserRole, status?: RequestStatus): boolean {
  if (!role || !status) return false;
  return status === "Ordered";
}

export function canEditRequestDetails(
  ctx: ApprovalContext,
  status?: RequestStatus
): boolean {
  return canPerformWorkflowAction(ctx, status);
}

export function canDeleteRequest(
  role?: UserRole,
  userId?: string,
  requesterId?: string
): boolean {
  if (!role) return false;
  if (isAdmin(role)) return true;
  return !!userId && !!requesterId && userId === requesterId;
}

export function canOverrideStatus(role?: UserRole): boolean {
  return isAdmin(role);
}

export function canAccessInventory(_role?: UserRole): boolean {
  return _role != null;
}
