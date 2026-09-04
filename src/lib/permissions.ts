import { Profile, RequestStatus } from "@/data/types";

export type UserRole = Profile["role"];

export function isAdmin(role?: UserRole): boolean {
  return role === "Admin";
}

export function canApprovePendingRequest(role?: UserRole): boolean {
  return isAdmin(role);
}

export function canMergeRequest(_role?: UserRole): boolean {
  return _role != null;
}

export function canPerformWorkflowAction(role?: UserRole, status?: RequestStatus): boolean {
  if (!role || !status) return false;
  if (status === "Pending") return isAdmin(role);
  return true;
}

/** Any authenticated role can receive packages for Ordered requests. */
export function canReceivePackages(role?: UserRole, status?: RequestStatus): boolean {
  if (!role || !status) return false;
  return status === "Ordered";
}

export function canEditRequestDetails(role?: UserRole, status?: RequestStatus): boolean {
  return canPerformWorkflowAction(role, status);
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
