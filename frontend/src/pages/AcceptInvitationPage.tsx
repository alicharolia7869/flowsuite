import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Layers,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  User,
  Lock,
  Mail,
  Building,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';

interface AcceptInvitationForm {
  name: string;
  password: string;
  confirmPassword: string;
}

export const AcceptInvitationPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token') || '';
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<AcceptInvitationForm>();

  // Fetch invitation details
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api.get<{ invitation: any }>(`/auth/invitations/${token}`),
    enabled: Boolean(token),
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: (form: { name: string; password: string }) =>
      api.post<any>('/auth/accept-invitation', {
        token,
        name: form.name,
        password: form.password,
      }),
    onSuccess: async (res) => {
      if (res.tokens) {
        localStorage.setItem('flowsuite_access_token', res.tokens.accessToken);
        localStorage.setItem('flowsuite_refresh_token', res.tokens.refreshToken);
      }
      if (res.organization?.id) {
        localStorage.setItem('flowsuite_active_org_id', res.organization.id);
      }
      toastSuccess(`Welcome to ${res.organization?.name || 'the workspace'}!`);
      await refreshUserData();
      navigate('/dashboard', { replace: true });
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to accept invitation.';
      setErrorMessage(msg);
      toastError(msg);
    },
  });

  const onSubmit = (formData: AcceptInvitationForm) => {
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setErrorMessage(null);
    acceptMutation.mutate({
      name: formData.name,
      password: formData.password,
    });
  };

  const invitation = data?.invitation;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-brand-500 selection:text-slate-950">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Brand Logo Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-500 to-emerald-400 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform duration-300">
            <Layers className="w-5 h-5 text-slate-950" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">FlowSuite</span>
        </Link>
        <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Workspace Invitation
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          You have been invited to join a collaborative SaaS workspace.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Verifying invitation credentials...</p>
            </div>
          ) : isError || !invitation ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Invalid or Expired Invitation</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {(error as any)?.message ||
                    'This invitation token is invalid, has expired, or has already been accepted.'}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700/60"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Workspace Badge Banner */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Organization
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 truncate">
                      {invitation.organizationName}
                    </h4>
                  </div>
                </div>
                <Badge variant={invitation.role === 'ADMIN' ? 'brand' : invitation.role === 'MANAGER' ? 'blue' : 'slate'} size="sm">
                  <ShieldCheck className="w-3 h-3" />
                  {invitation.role}
                </Badge>
              </div>

              {/* Invitee Email Info */}
              <div className="flex items-center gap-2 text-xs text-slate-400 px-1 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Invited Email:</span>
                <span className="text-slate-200 font-semibold">{invitation.email}</span>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form to set password and accept */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Your Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Sarah Connor"
                      {...register('name', { required: 'Name is required' })}
                      className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' },
                      })}
                      className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('confirmPassword', { required: 'Please confirm password' })}
                      className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-400 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={acceptMutation.isPending}
                  className="w-full mt-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 transition-all shadow-glow flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {acceptMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Join {invitation.organizationName}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
