import { Profile, RequestStatus } from "@/data/types";

export type UserRole = Profile["role"];

/** Comprobador de permisos (p. ej. el que devuelve useCan().can). */
export type CanFn = (key: string) => boolean;

export function isAdmin(role?: UserRole): boolean {
  return role === "Admin";
}

export function canApprovePendingRequest(can: CanFn): boolean {
  return can("requests.approve");
}

export function canMergeRequest(can: CanFn): boolean {
  return can("requests.create");
}

/**
 * Acciones del flujo (cotización, PO, pedido, cancelar…).
 * En Pending solo quien puede aprobar; en el resto, quien puede
 * actualizar según la política RLS (edit_any, recepción o dueño).
 */
export function canPerformWorkflowAction(
  can: CanFn,
  status?: RequestStatus,
  opts?: { isOwner?: boolean }
): boolean {
  if (!status) return false;
  if (status === "Pending") return can("requests.approve");
  return can("requests.edit_any") || can("reception.receive") || !!opts?.isOwner;
}

export function canReceivePackages(can: CanFn, status?: RequestStatus): boolean {
  if (!status) return false;
  return status === "Ordered" && can("reception.receive");
}

export function canEditRequestDetails(
  can: CanFn,
  status?: RequestStatus,
  opts?: { isOwner?: boolean }
): boolean {
  return canPerformWorkflowAction(can, status, opts);
}

export function canDeleteRequest(
  can: CanFn,
  userId?: string,
  requesterId?: string
): boolean {
  if (can("requests.delete_any")) return true;
  return !!userId && !!requesterId && userId === requesterId;
}

export function canOverrideStatus(can: CanFn): boolean {
  return can("requests.override_status");
}

export function canAccessInventory(can: CanFn): boolean {
  return can("inventory.view");
}
