import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  SUPER_ADMIN: [Role.HEADMASTER, Role.HOD, Role.TEACHER, Role.STUDENT],
  HEADMASTER: [Role.HOD, Role.TEACHER, Role.STUDENT],
  HOD: [Role.TEACHER, Role.STUDENT],
  TEACHER: [Role.STUDENT],
  STUDENT: [],
  PARENT: [],
};

export function getInheritedRoles(role: Role): Role[] {
  return ROLE_HIERARCHY[role] || [];
}

export function hasInheritedRole(
  userRole: Role,
  requiredRoles: Role[],
): boolean {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  if (requiredRoles.includes(userRole)) return true;
  const inherited = getInheritedRoles(userRole);
  return requiredRoles.some((role) => inherited.includes(role));
}
