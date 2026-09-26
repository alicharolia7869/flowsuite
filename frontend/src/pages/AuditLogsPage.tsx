import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScrollText,
  Filter,
  Calendar,
  User,
  Shield,
  Code,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const AuditLogsPage: React.FC = () => {
  const { currentOrg, hasRole } = useAuth();

  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMetadata, setSelectedMetadata] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', currentOrg?.id, page, actionFilter, sortOrder],
    queryFn: () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      params.append('sort', sortOrder);
      if (actionFilter) params.append('action', actionFilter);
      return api.get<{ logs: any[]; pagination: any }>(`/audit-logs?${params.toString()}`);
    },
    enabled: hasRole(['OWNER', 'ADMIN']),
  });

  if (!hasRole(['OWNER', 'ADMIN'])) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
        <p className="text-xs text-slate-400 mt-1">
          Audit logs are accessible strictly to Organization Owners and Administrators.
        </p>
      </div>
    );
  }

  const logs = data?.logs || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('CREATED') || action.includes('INVITED')) return 'emerald';
    if (action.includes('DELETED') || action.includes('REMOVED')) return 'rose';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'amber';
    return 'blue';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-brand-400" />
            Audit Activity Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Immutable compliance record of all administrative, membership, project, and billing events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand" size="sm">
            <Shield className="w-3 h-3" />
            SOC-2 Compliant Logs
          </Badge>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="glass-input px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-slate-300"
          >
            <option value="">All Actions</option>
            <option value="ORGANIZATION_CREATED">ORGANIZATION_CREATED</option>
            <option value="ORGANIZATION_UPDATED">ORGANIZATION_UPDATED</option>
            <option value="MEMBER_INVITED">MEMBER_INVITED</option>
            <option value="MEMBER_ROLE_CHANGED">MEMBER_ROLE_CHANGED</option>
            <option value="MEMBER_REMOVED">MEMBER_REMOVED</option>
            <option value="PROJECT_CREATED">PROJECT_CREATED</option>
            <option value="PROJECT_UPDATED">PROJECT_UPDATED</option>
            <option value="TASK_CREATED">TASK_CREATED</option>
            <option value="CUSTOMER_CREATED">CUSTOMER_CREATED</option>
            <option value="SUBSCRIPTION_UPDATED">SUBSCRIPTION_UPDATED</option>
          </select>

          <button
            onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            Date: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {logs.length} of {pagination.total} records
        </span>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center glass-card rounded-2xl border border-slate-800 text-xs text-slate-400">
          No audit records matched your filter.
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Actor</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-5 py-4">
                      <Badge variant={getActionBadgeVariant(log.action) as any} size="sm">
                        {log.action}
                      </Badge>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {log.actor?.name?.substring(0, 1) || 'S'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-200 block truncate">
                            {log.actor?.name || 'System'}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {log.actor?.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300 font-mono text-[11px]">
                      {log.targetType} {log.targetId ? `(${log.targetId.substring(0, 8)}...)` : ''}
                    </td>

                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {log.metadata ? (
                        <button
                          onClick={() => setSelectedMetadata(log.metadata)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-brand-400" /> View JSON
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata JSON Inspection Modal */}
      <Modal
        isOpen={!!selectedMetadata}
        onClose={() => setSelectedMetadata(null)}
        title="Audit Log Event Metadata"
        maxWidth="lg"
      >
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400 max-h-96">
            <pre>{JSON.stringify(selectedMetadata, null, 2)}</pre>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setSelectedMetadata(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
