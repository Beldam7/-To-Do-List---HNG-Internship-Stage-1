import { useState, type FormEvent } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { detectTimezone } from '@/lib/utils';

interface OnboardingPageProps {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const { updateProfile, user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: updateError } = await updateProfile({
      name: name.trim(),
      timezone: detectTimezone(),
    });

    if (updateError) {
      setError(updateError);
      setLoading(false);
    } else {
      onComplete();
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    const { error: updateError } = await updateProfile({
      name: ' ',
      timezone: detectTimezone(),
    });
    if (updateError) {
      setError(updateError);
      setLoading(false);
    } else {
      onComplete();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600 text-white mb-4">
            <Zap size={26} fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome to Focus AI</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Tell us your name to get started.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name="name"
              label="Your name"
              placeholder="e.g. Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="name"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>
              Continue <ArrowRight size={16} />
            </Button>
          </form>

          <button
            onClick={handleSkip}
            disabled={loading}
            className="mt-3 block w-full text-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Focus helps you capture tasks, organize them with AI,<br />and decide what to work on next.
        </p>
      </div>
    </div>
  );
}
