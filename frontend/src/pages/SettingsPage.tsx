import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Building,
  Shield,
  Key,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';

export const SettingsPage: React.FC = () => {
  const { currentOrg, hasRole, user, refreshUserData } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit } = useForm({
    defaultValues: { name: currentOrg?.name || '' },
  });

  const updateOrgMutation = useMutation({
    mutationFn: (body: { name: string }) => api.patch('/organizations/current', body),
    onSuccess: () => {
      toastSuccess('Organization name updated successfully.');
      refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to update organization name.'),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
          Organization & Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure organization identity, tenant preferences, and verify security posture.
        </p>
      </div>

      {/* Organization Profile Settings */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
          <Building className="w-5 h-5 text-brand-400" />
          <h3 className="text-base font-semibold text-white">Organization Identity</h3>
        </div>

        {hasRole(['OWNER']) ? (
          <form
            onSubmit={handleSubmit((data) => updateOrgMutation.mutate(data))}
            className="space-y-4 max-w-md"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                {...register('name', { required: true })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={updateOrgMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all shadow-glow"
            >
              {updateOrgMutation.isPending ? 'Saving...' : 'Save Organization Name'}
            </button>
          </form>
        ) : (
          <div className="text-xs text-slate-400 space-y-1">
            <p>
              Current Organization: <strong className="text-slate-200">{currentOrg?.name}</strong>
            </p>
            <p className="text-[11px] text-slate-500 italic">
              (Only Organization Owners can rename the workspace)
            </p>
          </div>
        )}
      </div>

      {/* Account & Role Context */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-semibold text-white">Your Authentication & Membership</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Authenticated User</span>
            <span className="font-semibold text-slate-200 block text-sm">{user?.name}</span>
            <span className="text-slate-400 block font-mono">{user?.email}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Assigned Role</span>
            <div className="pt-1">
              <Badge variant="brand" size="md">
                {currentOrg?.role}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              Server-side RBAC enforces permissions across API routes.
            </span>
          </div>
        </div>
      </div>

      {/* Security Info */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
          <Key className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Tenant Isolation & Security</h3>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict SQL query scoping to <code>organizationId</code> on every protected endpoint.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>JWT access tokens with 15-minute expiration and rotating refresh tokens.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Bcrypt password hashing with salt rounds 10.</span>
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Rate limiting enforced for repeated login failures via Redis.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
