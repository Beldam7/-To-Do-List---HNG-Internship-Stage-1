import { useState, type FormEvent } from 'react';
import { Zap, Mail, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import type { AuthView } from '@/types';

interface AuthPageProps {
  initialView: AuthView;
  onAuthenticated: () => void;
  onSwitchView: (view: AuthView) => void;
}

export function AuthPage({ initialView, onAuthenticated, onSwitchView }: AuthPageProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (view === 'login') {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        setLoading(false);
      } else {
        onAuthenticated();
      }
    } else if (view === 'signup') {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        setError(signUpError);
        setLoading(false);
      } else {
        onAuthenticated();
      }
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: resetError } = await resetPassword(email);
    if (resetError) {
      setError(resetError);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const switchView = (newView: AuthView) => {
    setView(newView);
    setError(null);
    setResetSent(false);
    onSwitchView(newView);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600 text-white mb-4">
            <Zap size={26} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Focus AI</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Get things done,<br />without the mental clutter.
          </p>
        </div>

        {view === 'forgot-password' ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            {resetSent ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                  Check your email for a password reset link.
                </p>
                <Button variant="secondary" onClick={() => switchView('login')}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">Reset password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Enter your email and we'll send you a reset link.
                </p>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Input
                    type="email"
                    name="reset-email"
                    label="Email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                  <Button type="submit" className="w-full" loading={loading}>
                    Send reset link
                  </Button>
                </form>
                <button
                  onClick={() => switchView('login')}
                  className="mt-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to sign in
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {view === 'login' ? 'Sign in' : 'Create account'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-[38px] text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  name="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-[38px] text-slate-400 pointer-events-none" />
                <Input
                  type="password"
                  name="password"
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  className="pl-10"
                />
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                {view === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {view === 'login' && (
              <button
                onClick={() => switchView('forgot-password')}
                className="mt-4 block w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Forgot password?
              </button>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {view === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
                  className="font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300 transition-colors"
                >
                  {view === 'login' ? 'Create account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
