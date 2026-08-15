export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'ATTENDANT';
  status: string;
  employeeId: number | null;
  employeeName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
