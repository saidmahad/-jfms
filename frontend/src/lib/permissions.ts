import type { Role } from '../types/index.ts';

export type Permission =
  | 'dashboard.view'
  | 'sales.view'
  | 'sales.create'
  | 'sales.view_own'
  | 'fuel.manage'
  | 'pump.manage'
  | 'pump.view_own'
  | 'inventory.manage'
  | 'supplier.manage'
  | 'customer.manage'
  | 'employee.manage'
  | 'expense.manage'
  | 'report.view'
  | 'user.manage'
  | 'audit.view'
  | 'settings.manage'
  | 'notification.view';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'dashboard.view', 'sales.view', 'sales.create', 'sales.view_own', 'fuel.manage', 'pump.manage',
    'pump.view_own', 'inventory.manage', 'supplier.manage', 'customer.manage', 'employee.manage',
    'expense.manage', 'report.view', 'user.manage', 'audit.view', 'settings.manage', 'notification.view',
  ],
  MANAGER: [
    'dashboard.view', 'sales.view', 'sales.create', 'fuel.manage', 'pump.manage', 'inventory.manage',
    'supplier.manage', 'customer.manage', 'employee.manage', 'expense.manage', 'report.view', 'notification.view',
  ],
  ATTENDANT: [
    'dashboard.view', 'sales.create', 'sales.view_own', 'pump.view_own', 'customer.manage', 'notification.view',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
