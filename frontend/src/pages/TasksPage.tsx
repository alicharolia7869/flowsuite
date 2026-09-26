import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  User as UserIcon,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';

export const TasksPage: React.FC = () => {
  const { currentOrg, hasRole, user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', currentOrg?.id, statusFilter, projectFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (projectFilter !== 'ALL') params.append('projectId', projectFilter);
      return api.get<{ tasks: any[] }>(`/tasks?${params.toString()}`);
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => api.get<{ projects: any[] }>('/projects'),
  });

  const { data: teamData } = useQuery({
    queryKey: ['members', currentOrg?.id],
    queryFn: () => api.get<{ members: any[] }>('/members'),
  });

  const { register, handleSubmit, reset } = useForm();

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.patch(`/tasks/${taskId}`, { status }),
    onSuccess: () => {
      toastSuccess('Task status updated.');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to update task status.'),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/tasks', body),
    onSuccess: () => {
      toastSuccess('Task created successfully.');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      reset();
    },
    onError: (err: any) => toastError(err.message || 'Failed to create task.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => {
      toastSuccess('Task deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setTaskToDelete(null);
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete task.'),
  });

  const tasks = tasksData?.tasks || [];
  const projects = projectsData?.projects || [];
  const members = teamData?.members || [];

  const filteredTasks = tasks.filter((t) =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track daily assignments, update task status, and maintain team execution speed.
          </p>
        </div>

        {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-brand-400 to-emerald-400 hover:from-brand-300 hover:to-emerald-300 rounded-xl transition-all shadow-glow"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            {['ALL', 'TODO', 'IN_PROGRESS', 'DONE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-slate-800 text-brand-300 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Project Filter */}
          {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-slate-300"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks found"
          description={
            currentOrg?.role === 'MEMBER'
              ? 'You do not have any tasks matching this filter.'
              : 'Create a task to assign work to team members.'
          }
          actionText={hasRole(['OWNER', 'ADMIN', 'MANAGER']) ? 'Create Task' : undefined}
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const canUpdateStatus =
              hasRole(['OWNER', 'ADMIN', 'MANAGER']) || task.assigneeId === user?.id;

            return (
              <div
                key={task.id}
                className="glass-card p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-slate-100 truncate">{task.title}</h3>
                    <Badge
                      variant={
                        task.status === 'DONE'
                          ? 'emerald'
                          : task.status === 'IN_PROGRESS'
                          ? 'amber'
                          : 'slate'
                      }
                      size="sm"
                    >
                      {task.status}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mb-2">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-300">
                      <FolderKanban className="w-3.5 h-3.5 text-brand-400" />
                      {task.project?.name}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateStatusMutation.mutate({ taskId: task.id, status: e.target.value })
                    }
                    disabled={!canUpdateStatus}
                    title={
                      !canUpdateStatus ? 'Members can only change status of their own tasks' : ''
                    }
                    className={`glass-input px-3 py-1.5 rounded-lg text-xs bg-slate-900 ${
                      !canUpdateStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>

                  {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
      >
        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              placeholder="e.g. Design Billing Architecture"
              {...register('title', { required: true })}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Project
            </label>
            <select
              {...register('projectId', { required: true })}
              className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Assignee (Optional)
            </label>
            <select
              {...register('assigneeId')}
              className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900"
            >
              <option value="">Unassigned</option>
              {members.map((m: any) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Due Date (Optional)
            </label>
            <input
              type="date"
              {...register('dueDate')}
              className="w-full glass-input px-3 py-2 rounded-xl text-sm bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              {...register('description')}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none"
            />
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
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
