import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  AlertCircle,
  Mail,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth, Role } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProgressBar } from '../components/common/ProgressBar';

interface InviteInput {
  email: string;
  name?: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

export const TeamPage: React.FC = () => {
  const { currentOrg, hasRole, user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [seatLimitError, setSeatLimitError] = useState<string | null>(null);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['members', currentOrg?.id],
    queryFn: () => api.get<{ members: any[] }>('/members'),
  });

  const { data: usageData } = useQuery({
    queryKey: ['usage', currentOrg?.id],
    queryFn: () => api.get<any>('/usage'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteInput>({
    defaultValues: { role: 'MEMBER' },
  });

  const inviteMutation = useMutation({
    mutationFn: (body: InviteInput) => api.post('/members/invite', body),
    onSuccess: () => {
      toastSuccess('Team member invited successfully.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      setIsInviteModalOpen(false);
      setSeatLimitError(null);
      reset();
    },
    onError: (err: any) => {
      if (err.code === 'PLAN_LIMIT_REACHED') {
        setSeatLimitError(err.message);
      } else {
        toastError(err.message || 'Failed to invite member.');
      }
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch(`/members/${id}/role`, { role }),
    onSuccess: () => {
      toastSuccess('Member role updated.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to change role.'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      toastSuccess('Member removed from organization.');
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      setMemberToRemove(null);
    },
    onError: (err: any) => toastError(err.message || 'Failed to remove member.'),
  });

  const members = teamData?.members || [];
  const seatsUsed = usageData?.seats?.used || members.length;
  const seatLimit = usageData?.seats?.limit || 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-purple-400" />
            Team & Members
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage organization members, assign roles, and allocate workspace seats.
          </p>
        </div>

        {hasRole(['OWNER', 'ADMIN']) && (
          <button
            onClick={() => {
              setSeatLimitError(null);
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 rounded-xl transition-all shadow-glow"
          >
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        )}
      </div>

      {/* Seat Limit Quota Banner */}
      <div className="glass-card p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-300">Seat Utilization ({currentOrg?.plan || 'STARTER'} Plan)</span>
            <span className="text-brand-400 font-mono font-semibold">
              {seatsUsed} of {seatLimit} seats occupied
            </span>
          </div>
          <ProgressBar value={seatsUsed} max={seatLimit} />
        </div>

        {seatsUsed >= seatLimit && hasRole(['OWNER']) && (
          <Link
            to="/billing"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 rounded-xl transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Upgrade Plan for More Seats
          </Link>
        )}
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Joined</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((m) => {
                  const isSelf = m.userId === user?.id;
                  const isOwner = m.role === 'OWNER';

                  return (
                    <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                            {m.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-100 text-sm block">
                              {m.name} {isSelf && <span className="text-slate-500 text-xs font-normal">(You)</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-300 font-mono text-xs">
                        {m.email}
                      </td>

                      <td className="px-5 py-4">
                        {hasRole(['OWNER']) && !isSelf ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              roleMutation.mutate({ id: m.id, role: e.target.value as Role })
                            }
                            className="glass-input px-2.5 py-1 rounded-lg text-xs bg-slate-900 font-medium"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        ) : (
                          <Badge
                            variant={
                              m.role === 'OWNER'
                                ? 'purple'
                                : m.role === 'ADMIN'
                                ? 'brand'
                                : m.role === 'MANAGER'
                                ? 'blue'
                                : 'slate'
                            }
                            size="sm"
                          >
                            <Shield className="w-3 h-3" />
                            {m.role}
                          </Badge>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-400">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {hasRole(['OWNER']) && !isSelf && (
                          <button
                            onClick={() => setMemberToRemove(m)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal with Plan Enforcement */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Team Member"
      >
        {seatLimitError ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="flex items-center gap-2 font-semibold mb-1 text-sm text-rose-400">
                <AlertCircle className="w-4 h-4" />
                Seat Limit Reached
              </div>
              <p className="leading-relaxed">{seatLimitError}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <Link
                to="/billing"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all"
              >
                Upgrade Plan
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) => inviteMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="colleague@company.com"
                {...register('email', { required: 'Email is required' })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
              {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Jane Colleague"
                {...register('name')}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Assigned Role
              </label>
              <select
                {...register('role')}
                className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900"
              >
                <option value="MEMBER">MEMBER (View & Update Assigned Tasks)</option>
                <option value="MANAGER">MANAGER (Manage Projects & Assign Tasks)</option>
                <option value="ADMIN">ADMIN (Manage Users, Projects, Customers)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl"
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Remove Member Dialog */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} (${memberToRemove?.email}) from ${currentOrg?.name}? They will lose access immediately.`}
        confirmText="Remove Member"
        isDestructive={true}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
};
