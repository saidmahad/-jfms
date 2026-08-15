import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Fuel, Lock, User, Droplets, Gauge, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { errorMessage } from '../lib/api.ts';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: Gauge, label: 'Pump Management' },
  { icon: Droplets, label: 'Live Inventory' },
  { icon: ShieldCheck, label: 'Role-Based Security' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Branding panel */}
      <div className="relative hidden flex-1 overflow-hidden bg-petroleum-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-energy-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-petrol-500/20 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-energy-gradient text-white shadow-glow">
            <Fuel className="h-6 w-6" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold tracking-wide text-white">JUPA</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-petrol-300">Fuel Station</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white xl:text-5xl">
            Fuel Station
            <br />
            <span className="bg-energy-gradient bg-clip-text text-transparent">Control Center</span>
          </h1>
          <p className="mt-4 text-lg text-petrol-200">
            JUPA FUEL STATION MANAGEMENT SYSTEM
          </p>
          <p className="mt-1 text-sm text-petrol-300">Smart Operations. Accurate Sales. Complete Control.</p>

          {/* Animated fuel visualization */}
          <div className="mt-10 space-y-4">
            {[
              { name: 'Petrol', pct: 78, color: 'bg-energy-gradient' },
              { name: 'Diesel', pct: 61, color: 'bg-petrol-400' },
            ].map((f) => (
              <div key={f.name} className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{f.name}</span>
                  <span className="text-petrol-200">{f.pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${f.color} animate-pulse-soft`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-6">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm text-petrol-200">
                <f.icon className="h-4 w-4 text-energy-400" />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-petrol-400">© {new Date().getFullYear()} JUPA Fuel Station · Thesis Implementation</p>
      </div>

      {/* Login card */}
      <div className="flex w-full flex-col items-center justify-center bg-[#F4F7FA] dark:bg-[#06111C] px-6 py-12 lg:w-[46%]">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-energy-gradient text-white">
              <Fuel className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold text-petrol-900 dark:text-white">JUPA</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-petrol-400">Fuel Station</p>
            </div>
          </div>

          <h2 className="font-display text-2xl font-extrabold text-petrol-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-petrol-500 dark:text-petrol-400">
            Sign in to manage fuel, pumps, sales and reports.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger animate-fade-in">
                {error}
              </div>
            )}

            <Input
              label="Username or email"
              placeholder="admin"
              autoComplete="username"
              icon={<User className="h-4 w-4" />}
              error={errors.username?.message}
              {...register('username')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[34px] text-petrol-400 hover:text-petrol-600 dark:hover:text-slate-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-petrol-100 dark:border-petrol-800 bg-white dark:bg-petrol-900 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-petrol-400">Development demo accounts</p>
            <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-petrol-600 dark:text-petrol-300">
              <p><span className="font-semibold">admin</span> / Admin@12345</p>
              <p><span className="font-semibold">manager</span> / Manager@12345</p>
              <p><span className="font-semibold">attendant</span> / Attendant@12345</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
