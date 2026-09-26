import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  FolderKanban,
  FileText,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

export const CustomersPage: React.FC = () => {
  const { currentOrg, hasRole } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', currentOrg?.id, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return api.get<{ customers: any[] }>(`/customers?${params.toString()}`);
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => api.get<{ projects: any[] }>('/projects'),
  });

  const { register: registerCreate, handleSubmit: handleSubmitCreate, reset: resetCreate } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit } = useForm();

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/customers', body),
    onSuccess: () => {
      toastSuccess('Customer created successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateModalOpen(false);
      resetCreate();
    },
    onError: (err: any) => toastError(err.message || 'Failed to create customer.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/customers/${id}`, body),
    onSuccess: () => {
      toastSuccess('Customer updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditingCustomer(null);
    },
    onError: (err: any) => toastError(err.message || 'Failed to update customer.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toastSuccess('Customer removed successfully.');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete customer.'),
  });

  const customers = data?.customers || [];
  const projects = projectsData?.projects || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-sky-400" />
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Maintain client records, contact details, and associate key initiatives with client accounts.
          </p>
        </div>

        {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 rounded-xl transition-all shadow-glow"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search customers or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
        />
      </div>

      {/* Customer Table */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No customers found"
          description="Build your client roster to tie projects directly to stakeholders."
          actionText={hasRole(['OWNER', 'ADMIN', 'MANAGER']) ? 'Add Customer' : undefined}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Customer & Company</th>
                  <th className="px-5 py-3.5">Contact Details</th>
                  <th className="px-5 py-3.5">Linked Project</th>
                  <th className="px-5 py-3.5">Notes</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-100 text-sm">{c.name}</div>
                      <div className="text-slate-400 mt-0.5">{c.company || 'Individual'}</div>
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.project ? (
                        <span className="inline-flex items-center gap-1.5 text-brand-300 bg-brand-500/10 px-2 py-1 rounded-lg border border-brand-500/20 font-medium">
                          <FolderKanban className="w-3.5 h-3.5" />
                          {c.project.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="px-5 py-4 max-w-xs truncate text-slate-400">
                      {c.notes || '-'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingCustomer(c);
                              resetEdit(c);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit customer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCustomerToDelete(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Customer">
        <form onSubmit={handleSubmitCreate((data) => createMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Full Name</label>
            <input type="text" placeholder="John Doe" {...registerCreate('name', { required: true })} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Email Address</label>
            <input type="email" placeholder="john@client.com" {...registerCreate('email', { required: true })} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Company</label>
              <input type="text" placeholder="Globex Corp" {...registerCreate('company')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Phone</label>
              <input type="text" placeholder="+1 555-0100" {...registerCreate('phone')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Linked Project (Optional)</label>
            <select {...registerCreate('projectId')} className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Notes</label>
            <textarea rows={2} placeholder="Account notes, requirements..." {...registerCreate('notes')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl">Save Customer</button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={!!editingCustomer} onClose={() => setEditingCustomer(null)} title="Edit Customer">
        <form onSubmit={handleSubmitEdit((data) => editingCustomer && updateMutation.mutate({ id: editingCustomer.id, body: data }))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Full Name</label>
            <input type="text" defaultValue={editingCustomer?.name} {...registerEdit('name', { required: true })} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Email Address</label>
            <input type="email" defaultValue={editingCustomer?.email} {...registerEdit('email', { required: true })} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Company</label>
              <input type="text" defaultValue={editingCustomer?.company || ''} {...registerEdit('company')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Phone</label>
              <input type="text" defaultValue={editingCustomer?.phone || ''} {...registerEdit('phone')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Linked Project</label>
            <select defaultValue={editingCustomer?.projectId || ''} {...registerEdit('projectId')} className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900">
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Notes</label>
            <textarea rows={2} defaultValue={editingCustomer?.notes || ''} {...registerEdit('notes')} className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setEditingCustomer(null)} className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={updateMutation.isPending} className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl">Update Customer</button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => customerToDelete && deleteMutation.mutate(customerToDelete.id)}
        title="Delete Customer"
        message={`Are you sure you want to delete "${customerToDelete?.name}"? This record will be permanently removed.`}
        confirmText="Delete Customer"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
