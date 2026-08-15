export type Role = 'ADMIN' | 'MANAGER' | 'ATTENDANT';

export const PERMISSIONS = {
  dashboard: 'dashboard.view',
  salesView: 'sales.view',
  salesCreate: 'sales.create',
  salesViewOwn: 'sales.view_own',
  fuelManage: 'fuel.manage',
  pumpManage: 'pump.manage',
  pumpViewOwn: 'pump.view_own',
  inventoryManage: 'inventory.manage',
  supplierManage: 'supplier.manage',
  customerManage: 'customer.manage',
  employeeManage: 'employee.manage',
  expenseManage: 'expense.manage',
  reportView: 'report.view',
  userManage: 'user.manage',
  auditView: 'audit.view',
  settingsManage: 'settings.manage',
  notificationView: 'notification.view',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  MANAGER: [
    PERMISSIONS.dashboard,
    PERMISSIONS.salesView,
    PERMISSIONS.salesCreate,
    PERMISSIONS.fuelManage,
    PERMISSIONS.pumpManage,
    PERMISSIONS.inventoryManage,
    PERMISSIONS.supplierManage,
    PERMISSIONS.customerManage,
    PERMISSIONS.employeeManage,
    PERMISSIONS.expenseManage,
    PERMISSIONS.reportView,
    PERMISSIONS.notificationView,
  ],
  ATTENDANT: [
    PERMISSIONS.dashboard,
    PERMISSIONS.salesCreate,
    PERMISSIONS.salesViewOwn,
    PERMISSIONS.pumpViewOwn,
    PERMISSIONS.customerManage,
    PERMISSIONS.notificationView,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
