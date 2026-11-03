'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Bluetooth, Lock, Mail, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('updated') === 'true') {
        setSuccessMessage('Administrator credentials have been updated successfully. Please sign in with your new credentials.');
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const trimmedEmail = email.trim().toLowerCase();

    // Map legacy admin@edis.com to admin@school.edu if entered
    let authEmail = trimmedEmail;
    if (trimmedEmail === 'admin@edis.com') {
      authEmail = 'admin@school.edu';
    }

    let { data, error: err } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    // Fallback attempt: if authEmail failed and user typed a custom email
    if (err && authEmail !== trimmedEmail) {
      const retry = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (!retry.error) {
        err = null;
      }
    }

    if (err) {
      setLoading(false);
      setError('Invalid email or password. Please verify your credentials and try again.');
    } else {
      // Full navigation ensures server-side cookies are synchronized before rendering /admin
      window.location.href = '/admin';
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 flex flex-col justify-start sm:justify-center items-center p-4 py-6 sm:py-12 relative transition-colors duration-200">
      {/* Top Bar Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle size="sm" />
      </div>

      <div className="w-full max-w-[380px]">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to student lookup</span>
        </Link>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-3 relative">
            <Image
              src="/logo.png"
              alt="Smart Attendance Logo"
              width={80}
              height={80}
              className="w-full h-full object-contain drop-shadow-lg"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-zinc-100 tracking-tight">
            Admin sign in
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Sign in with authorized administrator credentials
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-[14px] border border-orange-200/80 dark:border-zinc-800 shadow-edis p-6 sm:p-7 transition-colors">
          {successMessage && (
            <Banner variant="success" className="mb-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </span>
            </Banner>
          )}

          {error && (
            <Banner variant="error" className="mb-4">
              {error}
            </Banner>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.edu"
              required
              autoComplete="email"
              icon={<Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                icon={<Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500" />}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-8 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              loading={loading}
              size="md"
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>

          {/* Current credentials hint */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
            <span>Current username:</span>
            <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">admin@school.edu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
