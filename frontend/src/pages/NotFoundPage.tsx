import { Link } from 'react-router-dom';
import { Fuel, Home } from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-petroleum-gradient px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-energy-gradient text-white shadow-glow">
        <Fuel className="h-8 w-8" />
      </span>
      <p className="mt-6 font-display text-6xl font-extrabold text-white">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-petrol-300">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/dashboard" className="mt-6">
        <Button>
          <Home className="h-4 w-4" /> Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
