import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

export default function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-petroleum-gradient px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-energy-gradient text-white shadow-glow">
        <ShieldAlert className="h-8 w-8" />
      </span>
      <p className="mt-6 font-display text-6xl font-extrabold text-white">403</p>
      <h1 className="mt-2 font-display text-xl font-bold text-white">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-petrol-300">
        Your {user?.role.toLowerCase() ?? ''} role does not have permission to view this page. If you believe this is a
        mistake, contact an administrator.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>
          <Home className="h-4 w-4" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
