import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles, ArrowRight, ShieldCheck, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface LoginFormInputs {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormInputs>({
    defaultValues: {
      email: 'owner@acme.com',
      password: 'Password123!',
    },
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toastSuccess('Signed in successfully.');
      navigate('/dashboard');
    } catch (err: any) {
      toastError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (email: string) => {
    setValue('email', email);
    setValue('password', 'Password123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 shadow-glow mb-4">
            <Sparkles className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome to FlowSuite</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-Tenant SaaS Workspace Platform</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {location.search.includes('expired=true') && (
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Your session expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Credentials
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('owner@acme.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-brand-300 block">Acme Owner</span>
                <span className="text-[10px] text-slate-400 block truncate">owner@acme.com</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('admin@acme.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-sky-300 block">Acme Admin</span>
                <span className="text-[10px] text-slate-400 block truncate">admin@acme.com</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('manager@acme.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-amber-300 block">Acme Manager</span>
                <span className="text-[10px] text-slate-400 block truncate">manager@acme.com</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('member@acme.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-slate-300 block">Acme Member</span>
                <span className="text-[10px] text-slate-400 block truncate">member@acme.com</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('owner@stark.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-purple-300 block">Stark (Pro Plan)</span>
                <span className="text-[10px] text-slate-400 block truncate">owner@stark.com</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('owner@wayne.com')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-brand-500/40 text-left transition-all"
              >
                <span className="font-semibold text-rose-300 block">Wayne (Free Limit)</span>
                <span className="text-[10px] text-slate-400 block truncate">owner@wayne.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
};
