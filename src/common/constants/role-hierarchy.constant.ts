import { Role } from '@prisma/client';

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  SUPER_ADMIN: [
    Role.HEADMASTER,
    Role.ASSISTANT_HEAD_ADMINISTRATION,
    Role.ASSISTANT_HEAD_DOMESTIC,
    Role.HOD,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
  ],
  HEADMASTER: [
    Role.ASSISTANT_HEAD_ADMINISTRATION,
    Role.ASSISTANT_HEAD_DOMESTIC,
    Role.HOD,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
  ],
  ASSISTANT_HEAD_ADMINISTRATION: [
    Role.HOD,
    Role.TEACHER,
    Role.STUDENT,
    Role.PARENT,
  ],
  ASSISTANT_HEAD_DOMESTIC: [Role.HOD, Role.TEACHER, Role.STUDENT, Role.PARENT],
  HOD: [Role.TEACHER, Role.STUDENT, Role.PARENT],
  TEACHER: [Role.STUDENT, Role.PARENT],
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
