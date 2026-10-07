import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Building,
  Shield,
  Key,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';

interface SettingsFormInputs {
  name: string;
}

export const SettingsPage: React.FC = () => {
  const { currentOrg, hasRole, user, refreshUserData } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // Load live organization metadata from server
  const { data: orgData, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization', currentOrg?.id],
    queryFn: () => api.get<{ organization: any }>('/organizations/current'),
    enabled: !!currentOrg?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormInputs>({
    defaultValues: { name: currentOrg?.name || '' },
  });

  // Keep form synchronized when current organization is resolved or updated
  useEffect(() => {
    if (currentOrg?.name) {
      reset({ name: currentOrg.name });
    }
  }, [currentOrg?.name, reset]);

  const updateOrgMutation = useMutation({
    mutationFn: (body: { name: string }) => api.patch('/organizations/current', body),
    onSuccess: (res: any) => {
      toastSuccess('Organization name updated successfully.');
      refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', currentOrg?.id] });
      if (res?.organization?.name) {
        reset({ name: res.organization.name });
      }
    },
    onError: (err: any) => toastError(err.message || 'Failed to update organization name.'),
  });

  const onSubmit = (data: SettingsFormInputs) => {
    updateOrgMutation.mutate({ name: data.name.trim() });
  };

  const isOwner = hasRole(['OWNER']);
  const liveOrg = orgData?.organization;

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

      {/* Organization Identity Settings */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-semibold text-white">Organization Identity</h3>
          </div>
          {isOwner ? (
            <Badge variant="purple" size="sm">Owner Managed</Badge>
          ) : (
            <Badge variant="slate" size="sm">Read Only</Badge>
          )}
        </div>

        {isOwner ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                disabled={updateOrgMutation.isPending}
                {...register('name', {
                  required: 'Organization name is required.',
                  minLength: {
                    value: 2,
                    message: 'Organization name must be at least 2 characters long.',
                  },
                  maxLength: {
                    value: 50,
                    message: 'Organization name cannot exceed 50 characters.',
                  },
                  validate: (val) =>
                    val.trim().length >= 2 || 'Organization name cannot be blank or whitespace only.',
                })}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm disabled:opacity-60"
                placeholder="e.g. Acme Corporation"
              />
              {errors.name && (
                <p className="text-xs text-rose-400 mt-1.5 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={updateOrgMutation.isPending || !isDirty}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all shadow-glow disabled:opacity-50 flex items-center gap-2"
              >
                {updateOrgMutation.isPending ? (
                  <>
                    <span className="animate-spin text-xs">⏳</span>
                    Saving Changes...
                  </>
                ) : (
                  'Save Organization Name'
                )}
              </button>

              {isDirty && !updateOrgMutation.isPending && (
                <button
                  type="button"
                  onClick={() => reset({ name: currentOrg?.name || '' })}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="text-xs text-slate-400 space-y-2">
            <p>
              Current Organization: <strong className="text-slate-200">{currentOrg?.name}</strong>
            </p>
            <p className="text-[11px] text-slate-500 italic">
              (Only Organization Owners have permission to rename the workspace under FlowSuite RBAC policies)
            </p>
          </div>
        )}

        {/* Live Workspace Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/60 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1 text-[11px] font-semibold">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Workspace ID</span>
            </div>
            <span className="font-mono text-slate-300 text-[11px] truncate block" title={currentOrg?.id}>
              {currentOrg?.id || '—'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1 text-[11px] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              <span>Status</span>
            </div>
            <span className="font-semibold text-emerald-400">
              {liveOrg?.status || 'ACTIVE'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1 text-[11px] font-semibold">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Team Members</span>
            </div>
            <span className="font-semibold text-slate-200">
              {isOrgLoading ? '...' : (liveOrg?.memberCount ?? 1)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Created</span>
            </div>
            <span className="text-slate-300">
              {liveOrg?.createdAt
                ? new Date(liveOrg.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Active'}
            </span>
          </div>
        </div>
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
                {currentOrg?.role || 'MEMBER'}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              Server-side RBAC enforces permissions across API routes.
            </span>
          </div>
        </div>
      </div>

      {/* Security & Tenant Posture */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
          <Key className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-semibold text-white">Tenant Isolation & Security</h3>
        </div>

        <ul className="space-y-2 text-xs text-slate-300">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict query scoping to <code>organizationId</code> on every protected endpoint.</span>
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
            <span>Rate limiting enforced for repeated login failures via Redis fallback.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
