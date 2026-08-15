import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-petroleum-gradient px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/90 text-white">
        <AlertTriangle className="h-8 w-8" />
      </span>
      <p className="mt-6 font-display text-6xl font-extrabold text-white">500</p>
      <h1 className="mt-2 font-display text-xl font-bold text-white">System error</h1>
      <p className="mt-2 max-w-sm text-sm text-petrol-300">
        Something went wrong on our side. The error has been logged and will not affect your data.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
        <Link to="/dashboard">
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
            Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
