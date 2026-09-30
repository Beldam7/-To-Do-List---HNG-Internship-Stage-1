import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Clock,
  Palette,
  Bell,
  Bot,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { detectTimezone, getInitials, cn } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import { testOpenAIKey } from '@/lib/ai/client';

type Theme = 'light' | 'dark' | 'system';
type KeyStatus = 'untested' | 'testing' | 'valid' | 'invalid';

export function SettingsPage() {
  const { profile, user, updateProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile
  const [name, setName] = useState(profile?.name || '');
  const [timezone, setTimezone] = useState(profile?.timezone || detectTimezone());
  const [saving, setSaving] = useState(false);

  // OpenAI key
  const hasStoredKey = !!(profile?.openai_api_key);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('untested');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [keyMode, setKeyMode] = useState<'view' | 'edit'>(hasStoredKey ? 'view' : 'edit');

  // Notifications toggle
  const [notifications, setNotifications] = useState(true);

  // Reset key form when profile loads
  useEffect(() => {
    setKeyMode(profile?.openai_api_key ? 'view' : 'edit');
    setKeyInput('');
    setKeyStatus('untested');
    setKeyError(null);
  }, [profile?.openai_api_key]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ name: name.trim(), timezone });
    setSaving(false);
    if (error) {
      showToast('Could not save settings. Please try again.', 'error');
    } else {
      showToast('Profile saved', 'success');
    }
  };

  const handleTestKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setKeyStatus('testing');
    setKeyError(null);
    try {
      const result = await testOpenAIKey(trimmed);
      if (result.valid) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
        setKeyError(result.error || 'Invalid API key.');
      }
    } catch {
      setKeyStatus('invalid');
      setKeyError('Could not verify key. Check your connection and try again.');
    }
  };

  const handleSaveKey = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    setSavingKey(true);
    const { error } = await updateProfile({ openai_api_key: trimmed });
    setSavingKey(false);
    if (error) {
      showToast('Could not save API key. Please try again.', 'error');
    } else {
      showToast('OpenAI key connected', 'success');
      setKeyMode('view');
      setKeyInput('');
      setKeyStatus('untested');
    }
  };

  const handleRemoveKey = async () => {
    setRemovingKey(true);
    const { error } = await updateProfile({ openai_api_key: null });
    setRemovingKey(false);
    if (error) {
      showToast('Could not remove API key. Please try again.', 'error');
    } else {
      showToast('OpenAI key removed', 'success');
      setKeyMode('edit');
      setKeyInput('');
      setKeyStatus('untested');
      setKeyError(null);
    }
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const keyPlaceholder = showKey ? 'sk-...' : '••••••••••••••••••••••••••';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 mb-1">
          <SettingsIcon size={16} />
          <span>Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
      </div>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          <User size={16} /> Profile
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 text-lg font-semibold shrink-0">
              {getInitials(name || user?.email || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{name || 'New user'}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Clock size={14} className="inline mr-1.5" />
              Timezone
            </label>
            <Input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. Africa/Lagos"
            />
            <p className="mt-1.5 text-xs text-slate-400">Detected: {detectTimezone()}</p>
          </div>
          <Button onClick={handleSaveProfile} loading={saving}>
            Save profile
          </Button>
        </div>
      </section>

      {/* Connect OpenAI */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          <Sparkles size={16} /> Connect OpenAI
        </h2>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          {/* Status banner */}
          {keyMode === 'view' ? (
            <div className="flex items-center gap-3 rounded-lg bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-900/50 px-4 py-3">
              <CheckCircle2 size={18} className="text-accent-600 dark:text-accent-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">OpenAI connected</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your API key is saved. All AI features use your own key.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setKeyMode('edit'); setKeyInput(''); setKeyStatus('untested'); setKeyError(null); }}
                >
                  Change
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveKey}
                  loading={removingKey}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <X size={14} /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3">
              <Bot size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">No key connected</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI features require an OpenAI API key. Add yours below or ask your admin to configure a server key.
                </p>
              </div>
            </div>
          )}

          {keyMode === 'edit' && (
            <>
              {/* Instructions */}
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p>To get an API key:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-xs text-slate-500 dark:text-slate-500">
                  <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1">platform.openai.com/api-keys <ExternalLink size={11} /></a></li>
                  <li>Sign in or create a free account</li>
                  <li>Click "Create new secret key" and copy it</li>
                  <li>Paste it below and click Save</li>
                </ol>
              </div>

              {/* Key input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  API key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      setKeyStatus('untested');
                      setKeyError(null);
                    }}
                    placeholder="sk-proj-..."
                    className={cn(
                      'w-full rounded-lg border pr-20 px-3.5 py-2.5 text-sm transition-colors',
                      'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400',
                      'focus:ring-2 focus:ring-offset-0',
                      keyStatus === 'valid'
                        ? 'border-accent-500 focus:border-accent-500 focus:ring-accent-500/20'
                        : keyStatus === 'invalid'
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-300 dark:border-slate-700 focus:border-accent-500 focus:ring-accent-500/20'
                    )}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                {/* Inline status */}
                {keyStatus === 'testing' && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 size={13} className="animate-spin" /> Verifying key with OpenAI…
                  </p>
                )}
                {keyStatus === 'valid' && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent-600 dark:text-accent-400">
                    <CheckCircle2 size={13} /> Key is valid and working
                  </p>
                )}
                {keyStatus === 'invalid' && keyError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle size={13} /> {keyError}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {keyStatus !== 'valid' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTestKey}
                    disabled={!keyInput.trim() || keyStatus === 'testing'}
                    loading={keyStatus === 'testing'}
                  >
                    Test key
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSaveKey}
                  loading={savingKey}
                  disabled={!keyInput.trim()}
                >
                  {keyStatus === 'valid' ? <CheckCircle2 size={15} /> : <Sparkles size={15} />}
                  {savingKey ? 'Saving…' : 'Save key'}
                </Button>
                {hasStoredKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setKeyMode('view'); setKeyInput(''); setKeyStatus('untested'); setKeyError(null); }}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Privacy note */}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Your key is stored in your account and only used for your AI requests. It is never shared with other users.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          <Palette size={16} /> Theme
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                  theme === value
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <Icon
                  size={20}
                  className={theme === value ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    theme === value
                      ? 'text-accent-700 dark:text-accent-300'
                      : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          <Bell size={16} /> Notifications
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Task reminders</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Get notified about upcoming tasks</p>
            </div>
            <Toggle checked={notifications} onChange={setNotifications} />
          </label>
        </div>
      </section>

      {/* Account */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-4">
          <LogOut size={16} /> Account
        </h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <Button variant="danger" onClick={signOut}>
            <LogOut size={16} /> Log out
          </Button>
        </div>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-accent-600' : 'bg-slate-300 dark:bg-slate-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );
}
