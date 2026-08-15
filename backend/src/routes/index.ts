import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth.ts';
import { requireAnyPermission, requirePermission } from '../middleware/permissions.ts';
import { validate } from '../middleware/validate.ts';
import { loginLimiter } from '../middleware/rate-limit.ts';
import { PERMISSIONS } from '../utils/permissions.ts';

import * as auth from '../controllers/auth.controller.ts';
import * as dashboard from '../controllers/dashboard.controller.ts';
import * as fuel from '../controllers/fuel.controller.ts';
import * as pump from '../controllers/pump.controller.ts';
import * as sale from '../controllers/sale.controller.ts';
import * as inventory from '../controllers/inventory.controller.ts';
import * as supplier from '../controllers/supplier.controller.ts';
import * as customer from '../controllers/customer.controller.ts';
import * as employee from '../controllers/employee.controller.ts';
import * as expense from '../controllers/expense.controller.ts';
import * as report from '../controllers/report.controller.ts';
import * as user from '../controllers/user.controller.ts';
import * as auditLog from '../controllers/audit-log.controller.ts';
import * as settings from '../controllers/settings.controller.ts';
import * as notification from '../controllers/notification.controller.ts';
import * as profile from '../controllers/profile.controller.ts';

import {
  adjustmentSchema,
  customerSchema,
  employeeSchema,
  expenseSchema,
  fuelPriceSchema,
  fuelSchema,
  fuelStatusSchema,
  loginSchema,
  pumpSchema,
  purchaseSchema,
  salePaymentStatusSchema,
  saleSchema,
  settingsSchema,
  supplierSchema,
  userSchema,
} from '../schemas/index.ts';

const router = Router();
const authOnly = authRequired;

// ---- Auth ----
router.post('/auth/login', loginLimiter, validate(loginSchema), auth.login);
router.post('/auth/logout', authOnly, auth.logout);
router.get('/auth/me', authOnly, auth.me);

// ---- Profile ----
router.get('/profile', authOnly, profile.getProfile);
router.put(
  '/profile/password',
  authOnly,
  validate(
    z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    }),
  ),
  profile.changePassword,
);

// ---- Dashboard ----
router.get('/dashboard', authOnly, requirePermission(PERMISSIONS.dashboard), dashboard.getDashboardData);
router.get('/dashboard/charts', authOnly, requirePermission(PERMISSIONS.dashboard), dashboard.getDashboardChartsData);

// ---- Fuels (readable by any authenticated user so the POS can fetch prices) ----
router.get('/fuels', authOnly, fuel.listFuels);
router.get('/fuels/:id', authOnly, fuel.getFuel);
router.post('/fuels', authOnly, requirePermission(PERMISSIONS.fuelManage), validate(fuelSchema), fuel.createFuel);
router.put('/fuels/:id', authOnly, requirePermission(PERMISSIONS.fuelManage), validate(fuelSchema), fuel.updateFuel);
router.patch('/fuels/:id/price', authOnly, requirePermission(PERMISSIONS.fuelManage), validate(fuelPriceSchema), fuel.updateFuelPrice);
router.patch('/fuels/:id/status', authOnly, requirePermission(PERMISSIONS.fuelManage), validate(fuelStatusSchema), fuel.updateFuelStatus);

// ---- Pumps ----
router.get('/pumps', authOnly, pump.listPumps);
router.get('/pumps/:id', authOnly, pump.getPump);
router.post('/pumps', authOnly, requirePermission(PERMISSIONS.pumpManage), validate(pumpSchema), pump.createPump);
router.put('/pumps/:id', authOnly, requirePermission(PERMISSIONS.pumpManage), validate(pumpSchema), pump.updatePump);
router.delete('/pumps/:id', authOnly, requirePermission(PERMISSIONS.pumpManage), pump.deletePump);

// ---- Sales ----
router.get(
  '/sales',
  authOnly,
  requireAnyPermission(PERMISSIONS.salesView, PERMISSIONS.salesViewOwn),
  sale.listSalesController,
);
router.get('/sales/:id', authOnly, requireAnyPermission(PERMISSIONS.salesView, PERMISSIONS.salesViewOwn), sale.getSaleController);
router.post('/sales', authOnly, requirePermission(PERMISSIONS.salesCreate), validate(saleSchema), sale.createSaleController);
router.patch(
  '/sales/:id/payment-status',
  authOnly,
  requirePermission(PERMISSIONS.salesView),
  validate(salePaymentStatusSchema),
  sale.updatePaymentStatusController,
);

// ---- Inventory ----
router.get('/inventory', authOnly, requirePermission(PERMISSIONS.inventoryManage), inventory.inventoryOverview);
router.get('/inventory/low-stock', authOnly, inventory.lowStockController);
router.get('/inventory/movements', authOnly, requirePermission(PERMISSIONS.inventoryManage), inventory.movementsController);
router.post('/inventory/purchase', authOnly, requirePermission(PERMISSIONS.inventoryManage), validate(purchaseSchema), inventory.purchaseController);
router.post('/inventory/adjustment', authOnly, requirePermission(PERMISSIONS.inventoryManage), validate(adjustmentSchema), inventory.adjustmentController);

// ---- Suppliers ----
router.get('/suppliers', authOnly, requirePermission(PERMISSIONS.supplierManage), supplier.listSuppliers);
router.get('/suppliers/:id', authOnly, requirePermission(PERMISSIONS.supplierManage), supplier.getSupplier);
router.post('/suppliers', authOnly, requirePermission(PERMISSIONS.supplierManage), validate(supplierSchema), supplier.createSupplier);
router.put('/suppliers/:id', authOnly, requirePermission(PERMISSIONS.supplierManage), validate(supplierSchema), supplier.updateSupplier);
router.delete('/suppliers/:id', authOnly, requirePermission(PERMISSIONS.supplierManage), supplier.deleteSupplier);

// ---- Customers ----
router.get('/customers', authOnly, requirePermission(PERMISSIONS.customerManage), customer.listCustomers);
router.get('/customers/:id', authOnly, requirePermission(PERMISSIONS.customerManage), customer.getCustomer);
router.post('/customers', authOnly, requirePermission(PERMISSIONS.customerManage), validate(customerSchema), customer.createCustomer);
router.put('/customers/:id', authOnly, requirePermission(PERMISSIONS.customerManage), validate(customerSchema), customer.updateCustomer);
router.delete('/customers/:id', authOnly, requirePermission(PERMISSIONS.customerManage), customer.deleteCustomer);

// ---- Employees ----
router.get('/employees', authOnly, requirePermission(PERMISSIONS.employeeManage), employee.listEmployees);
router.get('/employees/:id', authOnly, requirePermission(PERMISSIONS.employeeManage), employee.getEmployee);
router.post('/employees', authOnly, requirePermission(PERMISSIONS.employeeManage), validate(employeeSchema), employee.createEmployee);
router.put('/employees/:id', authOnly, requirePermission(PERMISSIONS.employeeManage), validate(employeeSchema), employee.updateEmployee);
router.patch('/employees/:id/status', authOnly, requirePermission(PERMISSIONS.employeeManage), validate(fuelStatusSchema), employee.updateEmployeeStatus);

// ---- Expenses ----
router.get('/expenses', authOnly, requirePermission(PERMISSIONS.expenseManage), expense.listExpenses);
router.post('/expenses', authOnly, requirePermission(PERMISSIONS.expenseManage), validate(expenseSchema), expense.createExpense);
router.put('/expenses/:id', authOnly, requirePermission(PERMISSIONS.expenseManage), validate(expenseSchema), expense.updateExpense);
router.delete('/expenses/:id', authOnly, requirePermission(PERMISSIONS.expenseManage), expense.deleteExpense);

// ---- Reports ----
router.get('/reports/sales', authOnly, requirePermission(PERMISSIONS.reportView), report.salesReportController);
router.get('/reports/inventory', authOnly, requirePermission(PERMISSIONS.reportView), report.inventoryReportController);
router.get('/reports/revenue', authOnly, requirePermission(PERMISSIONS.reportView), report.revenueReportController);
router.get('/reports/employees', authOnly, requirePermission(PERMISSIONS.reportView), report.employeeReportController);
router.get('/reports/pumps', authOnly, requirePermission(PERMISSIONS.reportView), report.pumpReportController);

// ---- Users (admin only) ----
router.get('/users', authOnly, requirePermission(PERMISSIONS.userManage), user.listUsers);
router.post('/users', authOnly, requirePermission(PERMISSIONS.userManage), validate(userSchema), user.createUser);
router.put('/users/:id', authOnly, requirePermission(PERMISSIONS.userManage), validate(userSchema), user.updateUser);
router.patch('/users/:id/status', authOnly, requirePermission(PERMISSIONS.userManage), validate(fuelStatusSchema), user.updateUserStatus);

// ---- Audit logs (admin only) ----
router.get('/audit-logs', authOnly, requirePermission(PERMISSIONS.auditView), auditLog.listAuditLogs);

// ---- Settings ----
router.get('/settings', authOnly, settings.getSettingsController);
router.put('/settings', authOnly, requirePermission(PERMISSIONS.settingsManage), validate(settingsSchema), settings.updateSettingsController);

// ---- Notifications ----
router.get('/notifications', authOnly, requirePermission(PERMISSIONS.notificationView), notification.listNotificationsController);
router.get('/notifications/unread-count', authOnly, requirePermission(PERMISSIONS.notificationView), notification.unreadCountController);
router.post('/notifications/:id/read', authOnly, requirePermission(PERMISSIONS.notificationView), notification.markReadController);
router.post('/notifications/read-all', authOnly, requirePermission(PERMISSIONS.notificationView), notification.markAllReadController);

export default router;
