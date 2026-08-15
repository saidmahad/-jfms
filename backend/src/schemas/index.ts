import { z } from 'zod';

const positiveNumber = z.number().finite();
const nonNegativeNumber = z.number().finite().nonnegative();
const optionalId = z.number().int().positive().nullable().optional();

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const fuelSchema = z.object({
  name: z.string().trim().min(1, 'Fuel name is required').max(100),
  type: z.string().trim().min(1, 'Fuel type is required').max(50),
  pricePerLitre: positiveNumber.refine((v) => v > 0, 'Price per litre must be greater than zero'),
  currentQuantity: nonNegativeNumber.optional().default(0),
  minimumStock: nonNegativeNumber.optional().default(0),
  maximumCapacity: nonNegativeNumber.optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const fuelPriceSchema = z.object({
  pricePerLitre: positiveNumber.refine((v) => v > 0, 'Price per litre must be greater than zero'),
});

export const fuelStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

export const pumpSchema = z.object({
  pumpNumber: z.string().trim().min(1, 'Pump number is required').max(20),
  fuelId: optionalId,
  currentReading: nonNegativeNumber.optional().default(0),
  status: z.enum(['active', 'inactive', 'maintenance', 'offline']).optional().default('active'),
  assignedEmployeeId: optionalId,
  location: z.string().trim().max(100).optional().nullable(),
});

export const saleSchema = z.object({
  pumpId: z.number().int().positive('Pump is required'),
  fuelId: z.number().int().positive('Fuel is required'),
  litres: positiveNumber.refine((v) => v > 0, 'Litres must be greater than zero'),
  customerId: optionalId,
  employeeId: optionalId,
  paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'rfid', 'other'], {
    errorMap: () => ({ message: 'Payment method must be cash, card, mobile_money, rfid or other' }),
  }),
  paymentStatus: z.enum(['paid', 'pending', 'cancelled']).optional(),
});

export const salePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['paid', 'pending', 'cancelled']),
});

export const purchaseSchema = z.object({
  fuelId: z.number().int().positive('Fuel is required'),
  supplierId: optionalId,
  quantity: positiveNumber.refine((v) => v > 0, 'Quantity must be greater than zero'),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const adjustmentSchema = z.object({
  fuelId: z.number().int().positive('Fuel is required'),
  quantity: z.number().finite().refine((v) => v !== 0, 'Adjustment quantity cannot be zero'),
  reason: z.string().trim().min(1, 'A reason is required for stock adjustments').max(500),
});

export const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email('Invalid email address').max(150).optional().nullable(),
  address: z.string().trim().max(250).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const customerSchema = z.object({
  fullName: z.string().trim().min(1, 'Customer name is required').max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  vehicleType: z.string().trim().max(50).optional().nullable(),
  rfidId: z.string().trim().max(50).optional().nullable(),
});

export const employeeSchema = z.object({
  fullName: z.string().trim().min(1, 'Employee name is required').max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  position: z.enum(['Administrator', 'Manager', 'Fuel Attendant', 'Accountant', 'Supervisor']),
  salary: nonNegativeNumber,
  status: z.enum(['active', 'inactive']).optional().default('active'),
  hireDate: z.string().trim().min(1, 'Hire date is required'),
});

export const expenseSchema = z.object({
  employeeId: optionalId,
  category: z.enum(['electricity', 'salaries', 'maintenance', 'transport', 'supplies', 'rent', 'other'], {
    errorMap: () => ({ message: 'Invalid expense category' }),
  }),
  description: z.string().trim().min(1, 'Description is required').max(250),
  amount: positiveNumber.refine((v) => v > 0, 'Amount must be greater than zero'),
  paymentMethod: z.enum(['cash', 'card', 'mobile_money', 'rfid', 'other']).optional().default('cash'),
  expenseDate: z.string().trim().min(1, 'Expense date is required'),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const userSchema = z
  .object({
    username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
    email: z.string().trim().email('Invalid email address').max(150),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'ATTENDANT']),
    status: z.enum(['active', 'inactive']).optional().default('active'),
    employeeId: optionalId,
  })
  .refine((data) => data.password === undefined || data.password.length >= 8, {
    message: 'Password must be at least 8 characters',
    path: ['password'],
  });

export const settingsSchema = z.object({
  stationName: z.string().trim().max(150).optional(),
  stationAddress: z.string().trim().max(250).optional(),
  stationPhone: z.string().trim().max(50).optional(),
  stationEmail: z.string().trim().email('Invalid email').max(150).optional(),
  currency: z.string().trim().min(1).max(10).optional(),
  timezone: z.string().trim().min(1).max(60).optional(),
  receiptFooter: z.string().trim().max(250).optional(),
  lowStockThreshold: z.string().trim().max(20).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  notifyLowStock: z.enum(['true', 'false']).optional(),
});

export const notificationReadSchema = z.object({
  id: z.coerce.number().int().positive(),
});
