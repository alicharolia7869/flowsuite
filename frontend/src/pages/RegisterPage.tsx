import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Sparkles, ArrowRight, Building, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface RegisterFormInputs {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export const RegisterPage: React.FC = () => {
  const { register: registerAuth } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>();

  const onSubmit = async (data: RegisterFormInputs) => {
    setIsLoading(true);
    try {
      await registerAuth(data);
      toastSuccess('Organization and Owner account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      toastError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 shadow-glow mb-4">
            <Sparkles className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Create your Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">Start your 14-day free trial on FlowSuite</p>
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Sarah Connor"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  placeholder="sarah@company.com"
                  {...register('email', { required: 'Email is required' })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Cyberdyne Systems"
                  {...register('organizationName', { required: 'Organization name is required' })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.organizationName && <p className="text-xs text-rose-400 mt-1">{errors.organizationName.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Must be at least 8 characters' },
                  })}
                  className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {isLoading ? (
                <span className="animate-spin text-xs">⏳</span>
              ) : (
                <>
                  Create Organization <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
