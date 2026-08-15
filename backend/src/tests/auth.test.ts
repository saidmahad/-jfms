import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, resetDb, loginAdmin, loginManager, loginAttendant, authGet, authPost, authPatch } from './helpers.ts';

describe('Authentication', () => {
  beforeEach(() => resetDb());

  it('logs in successfully with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'Admin@12345' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.username).toBe('admin');
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('blocks inactive users from logging in', async () => {
    const admin = await loginAdmin();
    // Create a user then deactivate them.
    const created = await authPost(admin.token, '/api/users', {
      username: 'tempuser',
      email: 'temp@jupa.test',
      password: 'TempPass123',
      role: 'ATTENDANT',
    });
    expect(created.status).toBe(201);
    const userId = created.body.data.id;

    const deactivated = await authPatch(admin.token, `/api/users/${userId}/status`, { status: 'inactive' });
    expect(deactivated.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ username: 'tempuser', password: 'TempPass123' });
    expect(login.status).toBe(401);
    expect(login.body.message).toMatch(/inactive/i);
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  it('returns 403 for attendants accessing admin-only routes', async () => {
    const attendant = await loginAttendant();
    const res = await authGet(attendant.token, '/api/users');
    expect(res.status).toBe(403);
  });

  it('returns 403 for managers accessing admin-only settings', async () => {
    const manager = await loginManager();
    const res = await authPost(manager.token, '/api/users', {});
    expect(res.status).toBe(403);
  });

  it('returns 403 for attendants accessing reports', async () => {
    const attendant = await loginAttendant();
    const res = await authGet(attendant.token, '/api/reports/revenue');
    expect(res.status).toBe(403);
  });

  it('exposes current user and permissions via /auth/me', async () => {
    const admin = await loginAdmin();
    const res = await authGet(admin.token, '/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.username).toBe('admin');
    expect(Array.isArray(res.body.data.user.permissions)).toBe(true);
    expect(res.body.data.user.permissions).toContain('user.manage');
  });

  it('logs out successfully', async () => {
    const admin = await loginAdmin();
    const res = await authPost(admin.token, '/api/auth/logout', {});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
