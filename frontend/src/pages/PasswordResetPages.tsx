import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles, ArrowRight, Mail, KeyRound } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export const ForgotPasswordPage: React.FC = () => {
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [receivedToken, setReceivedToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();

  const onSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post<any>('/auth/forgot-password', { email: data.email });
      toastSuccess(res.message);
      if (res.resetToken) {
        setReceivedToken(res.resetToken);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to dispatch reset instructions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 shadow-glow mb-4">
            <Sparkles className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-400 mt-1">Enter your work email to receive reset instructions</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {receivedToken ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <span className="font-semibold block mb-1">Development Reset Token Dispatched:</span>
                <code className="bg-slate-900 px-2 py-1 rounded text-[11px] block overflow-x-auto text-emerald-200 font-mono">
                  {receivedToken}
                </code>
              </div>
              <button
                onClick={() => navigate(`/reset-password?token=${receivedToken}`)}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 transition-all flex items-center justify-center gap-2"
              >
                Proceed to Reset Password <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? <span className="animate-spin text-xs">⏳</span> : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Remember your password?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const initialToken = queryParams.get('token') || '';

  const { register, handleSubmit, formState: { errors } } = useForm<{ token: string; newPassword: string }>({
    defaultValues: { token: initialToken },
  });

  const onSubmit = async (data: { token: string; newPassword: string }) => {
    setIsLoading(true);
    try {
      const res = await api.post<any>('/auth/reset-password', data);
      toastSuccess(res.message);
      navigate('/login');
    } catch (err: any) {
      toastError(err.message || 'Password reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 shadow-glow mb-4">
            <KeyRound className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Set New Password</h1>
          <p className="text-sm text-slate-400 mt-1">Provide your reset token and new password</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Reset Token
              </label>
              <input
                type="text"
                placeholder="Enter reset token"
                {...register('token', { required: 'Reset token is required' })}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm transition-all"
              />
              {errors.token && <p className="text-xs text-rose-400 mt-1">{errors.token.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                {...register('newPassword', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Must be at least 8 characters' },
                })}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm transition-all"
              />
              {errors.newPassword && <p className="text-xs text-rose-400 mt-1">{errors.newPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isLoading ? <span className="animate-spin text-xs">⏳</span> : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
