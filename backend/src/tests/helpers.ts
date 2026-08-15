import { expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';
import { db } from '../db/index.ts';
import { runMigrations } from '../db/migrate.ts';
import { runSeed } from '../db/seed.ts';

// Run migrations once per process; each test resets the data via resetDb().
runMigrations();

export const app = createApp();

export function resetDb(): void {
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM audit_logs;
    DELETE FROM sale_details;
    DELETE FROM sales;
    DELETE FROM inventory_transactions;
    DELETE FROM fuel_price_history;
    DELETE FROM expenses;
    DELETE FROM pumps;
    DELETE FROM suppliers;
    DELETE FROM customers;
    DELETE FROM fuels;
    DELETE FROM users;
    DELETE FROM employees;
    DELETE FROM settings;
  `);
  runSeed(true);
}

export interface LoginResult {
  token: string;
  user: {
    id: number;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
    employeeId: number | null;
  };
}

export async function loginAs(username: string, password: string): Promise<LoginResult> {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  expect(res.status).toBe(200);
  return res.body.data as unknown as LoginResult;
}

export async function loginAdmin(): Promise<LoginResult> {
  return loginAs('admin', 'Admin@12345');
}

export async function loginManager(): Promise<LoginResult> {
  return loginAs('manager', 'Manager@12345');
}

export async function loginAttendant(): Promise<LoginResult> {
  return loginAs('attendant', 'Attendant@12345');
}

export function authGet(token: string, url: string) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

export function authPost(token: string, url: string, body: Record<string, unknown> = {}) {
  return request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
}

export function authPut(token: string, url: string, body: Record<string, unknown> = {}) {
  return request(app).put(url).set('Authorization', `Bearer ${token}`).send(body);
}

export function authPatch(token: string, url: string, body: Record<string, unknown> = {}) {
  return request(app).patch(url).set('Authorization', `Bearer ${token}`).send(body);
}

export function authDelete(token: string, url: string) {
  return request(app).delete(url).set('Authorization', `Bearer ${token}`);
}
