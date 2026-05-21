import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminMode } from '../lib/adminMode';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const { enableAdminMode, disableAdminMode } = useAdminMode();
  const [form, setForm] = useState({ email: '', fullName: '', password: '' });
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      disableAdminMode();
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      }
      if (isAdminLogin) enableAdminMode();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const openAdminLogin = () => {
    setIsAdminLogin(true);
    setIsSignUp(false);
    setError('');
  };

  const returnToRegularLogin = () => {
    setIsAdminLogin(false);
    setError('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <button
        type="button"
        onClick={openAdminLogin}
        className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-phil-700 shadow-sm transition hover:border-phil-600 hover:bg-phil-50 focus:outline-none focus:ring-2 focus:ring-phil-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-slate-800 sm:right-6 sm:top-6"
      >
        Admin
      </button>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-phil-600 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-ink dark:text-slate-100">PhilHealth PDR</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdminLogin
              ? 'Admin review sign in'
              : isSignUp
                ? 'Create an account to get started'
                : 'Sign in to manage provider records'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {isAdminLogin && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              Admin review mode uses your normal account credentials for this demo.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isSignUp && !isAdminLogin && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  required={isSignUp}
                  placeholder="Juan dela Cruz"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-field px-3 py-2.5 text-sm outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-field px-3 py-2.5 text-sm outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-field px-3 py-2.5 text-sm outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full rounded-md bg-phil-600 py-2.5 font-semibold text-white transition hover:bg-phil-700 focus:outline-none focus:ring-2 focus:ring-phil-600/40 disabled:opacity-60"
            >
              {busy ? 'Please wait...' : isAdminLogin ? 'Admin Sign In' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {isAdminLogin ? (
            <p className="mt-4 text-center text-sm text-slate-500">
              Need regular access?{' '}
              <button
                type="button"
                onClick={returnToRegularLogin}
                className="font-medium text-phil-700 hover:underline dark:text-emerald-300"
              >
                Back to sign in
              </button>
            </p>
          ) : (
            <p className="mt-4 text-center text-sm text-slate-500">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="font-medium text-phil-700 hover:underline dark:text-emerald-300"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
