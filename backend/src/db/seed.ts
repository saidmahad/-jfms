import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { db, transaction } from './index.ts';
import { runMigrations } from './migrate.ts';

const now = () => new Date().toISOString();

function insertEmployee(fullName: string, phone: string, position: string, salary: number, status: 'active' | 'inactive', hireDate: string): number {
  const r = db.prepare(
    `INSERT INTO employees (full_name, phone, position, salary, status, hire_date) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(fullName, phone, position, salary, status, hireDate);
  return Number(r.lastInsertRowid);
}

function insertUser(username: string, email: string, password: string, role: 'ADMIN' | 'MANAGER' | 'ATTENDANT', employeeId: number | null): number {
  const r = db.prepare(
    `INSERT INTO users (username, email, password, role, status, employee_id) VALUES (?, ?, ?, ?, 'active', ?)`,
  ).run(username, email, bcrypt.hashSync(password, 10), role, employeeId);
  return Number(r.lastInsertRowid);
}

function insertFuel(name: string, type: string, price: number, qty: number, min: number, max: number, status: 'active' | 'inactive'): number {
  const r = db.prepare(
    `INSERT INTO fuels (name, type, price_per_litre, current_quantity, minimum_stock, maximum_capacity, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(name, type, price, qty, min, max, status);
  return Number(r.lastInsertRowid);
}

function insertPump(pumpNumber: string, fuelId: number | null, reading: number, status: string, employeeId: number | null, location: string): number {
  const r = db.prepare(
    `INSERT INTO pumps (pump_number, fuel_id, current_reading, status, assigned_employee_id, location)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(pumpNumber, fuelId, reading, status, employeeId, location);
  return Number(r.lastInsertRowid);
}

function insertSupplier(name: string, phone: string, email: string, address: string): number {
  const r = db.prepare(
    `INSERT INTO suppliers (name, phone, email, address, status) VALUES (?, ?, ?, ?, 'active')`,
  ).run(name, phone, email, address);
  return Number(r.lastInsertRowid);
}

function insertCustomer(fullName: string, phone: string, vehicleNumber: string, vehicleType: string, rfidId: string | null): number {
  const r = db.prepare(
    `INSERT INTO customers (full_name, phone, vehicle_number, vehicle_type, rfid_id) VALUES (?, ?, ?, ?, ?)`,
  ).run(fullName, phone, vehicleNumber, vehicleType, rfidId);
  return Number(r.lastInsertRowid);
}

function upsertSetting(key: string, value: string, updatedBy: number | null): void {
  db.prepare(
    `INSERT INTO settings (key, value, updated_by) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by`,
  ).run(key, value, updatedBy);
}

export function runSeed(force = false): void {
  runMigrations();

  const existing = db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number };
  if (existing.c > 0 && !force) {
    console.log('[seed] users table already populated; skipping (use --force to reseed)');
    return;
  }

  transaction(() => {
    // Clean slate when forcing.
    if (force) {
      db.exec(`
        DELETE FROM notifications; DELETE FROM audit_logs; DELETE FROM inventory_transactions;
        DELETE FROM sale_details; DELETE FROM sales; DELETE FROM fuel_price_history;
        DELETE FROM pumps; DELETE FROM expenses; DELETE FROM suppliers; DELETE FROM customers;
        DELETE FROM fuels; DELETE FROM users; DELETE FROM employees; DELETE FROM settings;
        DELETE FROM sqlite_sequence;
      `);
    }

    // Employees
    const adminEmp = insertEmployee('JUPA Systems Administrator', '+1-555-0100', 'Administrator', 4500, 'active', '2024-01-15');
    const managerEmp = insertEmployee('Sarah Mitchell', '+1-555-0101', 'Manager', 3200, 'active', '2024-02-01');
    const attendantEmp = insertEmployee('John Doe', '+1-555-0102', 'Fuel Attendant', 1500, 'active', '2024-03-10');
    const attendantEmp2 = insertEmployee('Mary Johnson', '+1-555-0103', 'Fuel Attendant', 1500, 'active', '2024-04-05');
    insertEmployee('Peter Kalu', '+1-555-0104', 'Accountant', 2600, 'active', '2024-05-20');

    // Demo accounts (development only). Credentials documented in README.
    insertUser('admin', 'admin@jupa.test', 'Admin@12345', 'ADMIN', adminEmp);
    insertUser('manager', 'manager@jupa.test', 'Manager@12345', 'MANAGER', managerEmp);
    insertUser('attendant', 'attendant@jupa.test', 'Attendant@12345', 'ATTENDANT', attendantEmp);

    // Fuels
    const petrol = insertFuel('Petrol', 'petrol', 1.25, 12000, 1500, 20000, 'active');
    const diesel = insertFuel('Diesel', 'diesel', 1.15, 8000, 1200, 15000, 'active');

    // Pumps
    insertPump('PUMP-01', petrol, 12450, 'active', attendantEmp, 'Bay A');
    insertPump('PUMP-02', petrol, 8930, 'active', attendantEmp2, 'Bay A');
    insertPump('PUMP-03', diesel, 15320, 'active', attendantEmp, 'Bay B');
    insertPump('PUMP-04', diesel, 6120, 'maintenance', null, 'Bay B');

    // Suppliers
    insertSupplier('PetroSupply Co.', '+1-555-0201', 'orders@petrosupply.test', '12 Industrial Road, Fuel City');
    insertSupplier('Energy Distributors Ltd.', '+1-555-0202', 'sales@energydist.test', '88 Depot Avenue, Fuel City');

    // Customers
    insertCustomer('James Carter', '+1-555-0301', 'JFK-2381', 'Truck', 'RFID-1001');
    insertCustomer('Grace Adeyemi', '+1-555-0302', 'JFK-5542', 'Car', null);
    insertCustomer('Omar Haddad', '+1-555-0303', 'JFK-9017', 'Van', 'RFID-1002');

    // Default station settings
    const adminUser = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get() as { id: number };
    upsertSetting('station_name', 'JUPA Fuel Station', adminUser.id);
    upsertSetting('station_address', '1 Main Street, Fuel City', adminUser.id);
    upsertSetting('station_phone', '+1-555-0001', adminUser.id);
    upsertSetting('station_email', 'hello@jupa.test', adminUser.id);
    upsertSetting('currency', 'USD', adminUser.id);
    upsertSetting('timezone', 'UTC', adminUser.id);
    upsertSetting('receipt_footer', 'Thank you for choosing JUPA.', adminUser.id);
    upsertSetting('low_stock_threshold', '500', adminUser.id);
    upsertSetting('theme', 'light', adminUser.id);
    upsertSetting('notify_low_stock', 'true', adminUser.id);
  });

  console.log('[seed] database seeded with development/demo data');
  console.log('  admin     / Admin@12345');
  console.log('  manager   / Manager@12345');
  console.log('  attendant / Attendant@12345');
  console.log(`  (seeded at ${now()})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSeed(process.argv.includes('--force'));
}

