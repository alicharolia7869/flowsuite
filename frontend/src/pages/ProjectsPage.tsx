import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Archive,
  Users,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

interface ProjectInput {
  name: string;
  description?: string;
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
}

export const ProjectsPage: React.FC = () => {
  const { currentOrg, hasRole } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [planLimitError, setPlanLimitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectInput>({
    defaultValues: { status: 'PLANNING' },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['projects', currentOrg?.id, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      return api.get<{ projects: any[] }>(`/projects?${params.toString()}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: ProjectInput) => api.post<{ project: any }>('/projects', body),
    onSuccess: () => {
      toastSuccess('Project created successfully.');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
      setIsCreateModalOpen(false);
      setPlanLimitError(null);
      reset();
    },
    onError: (err: any) => {
      if (err.code === 'PLAN_LIMIT_REACHED') {
        setPlanLimitError(err.message);
      } else {
        toastError(err.message || 'Failed to create project.');
      }
    },
  });

  const projects = data?.projects || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-brand-400" />
            Projects
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your workspace initiatives and track progress across client deliverables.
          </p>
        </div>

        {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
          <button
            onClick={() => {
              setPlanLimitError(null);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 rounded-xl transition-all shadow-glow"
          >
            <Plus className="w-4 h-4" /> Create Project
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === st
                  ? 'bg-slate-800 text-brand-300 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards Grid */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description={
            currentOrg?.role === 'MEMBER'
              ? 'You do not have any tasks assigned to projects in this workspace yet.'
              : 'Create your first project to organize tasks and deliverables.'
          }
          actionText={hasRole(['OWNER', 'ADMIN', 'MANAGER']) ? 'Create Project' : undefined}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-card p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge
                    variant={
                      project.status === 'COMPLETED'
                        ? 'emerald'
                        : project.status === 'IN_PROGRESS'
                        ? 'blue'
                        : project.status === 'ARCHIVED'
                        ? 'rose'
                        : 'amber'
                    }
                    size="sm"
                  >
                    {project.status}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-100 text-base group-hover:text-brand-300 transition-colors line-clamp-1 mb-1">
                  {project.name}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />
                    {project.completedTasks}/{project.totalTasks} Tasks
                  </span>
                  {project.customerCount > 0 && (
                    <span className="flex items-center gap-1 font-mono">
                      <Users className="w-3.5 h-3.5 text-sky-400" />
                      {project.customerCount} Clients
                    </span>
                  )}
                </div>

                <Link
                  to={`/projects/${project.id}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="View details"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal with Plan Limit Enforcement UI */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        {planLimitError ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="flex items-center gap-2 font-semibold mb-1 text-sm text-rose-400">
                <AlertCircle className="w-4 h-4" />
                Plan Limit Reached
              </div>
              <p className="leading-relaxed">{planLimitError}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <Link
                to="/billing"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all"
              >
                Upgrade Subscription
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                placeholder="e.g. Mobile App Redesign"
                {...register('name', { required: 'Project name is required' })}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
              />
              {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of goals and deliverables..."
                {...register('description')}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                {...register('status')}
                className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900"
              >
                <option value="PLANNING">Planning</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all flex items-center gap-1.5"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
