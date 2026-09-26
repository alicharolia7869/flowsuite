import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  FolderKanban,
  ArrowLeft,
  CheckSquare,
  Users,
  Plus,
  Edit2,
  Calendar,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasRole, user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'tasks' | 'customers'>('tasks');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<{ project: any }>(`/projects/${id}`),
    enabled: !!id,
  });

  const { data: teamData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<{ members: any[] }>('/members'),
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit } = useForm();
  const { register: registerTask, handleSubmit: handleSubmitTask, reset: resetTask } = useForm();

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.patch(`/projects/${id}`, body),
    onSuccess: () => {
      toastSuccess('Project updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setIsEditModalOpen(false);
    },
    onError: (err: any) => toastError(err.message || 'Failed to update project.'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (body: any) => api.post('/tasks', { ...body, projectId: id }),
    onSuccess: () => {
      toastSuccess('Task created in project.');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setIsNewTaskModalOpen(false);
      resetTask();
    },
    onError: (err: any) => toastError(err.message || 'Failed to create task.'),
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.patch(`/tasks/${taskId}`, { status }),
    onSuccess: () => {
      toastSuccess('Task status updated.');
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
    onError: (err: any) => toastError(err.message || 'Failed to update task status.'),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const project = data?.project;

  if (!project) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold text-slate-200">Project Not Found</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          This project does not exist or you lack permission to view it.
        </p>
        <Link to="/projects" className="text-xs font-semibold text-brand-400 hover:underline">
          Return to projects
        </Link>
      </div>
    );
  }

  const members = teamData?.members || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to projects
        </Link>
      </div>

      {/* Project Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{project.name}</h1>
            <Badge
              variant={
                project.status === 'COMPLETED'
                  ? 'emerald'
                  : project.status === 'IN_PROGRESS'
                  ? 'blue'
                  : 'amber'
              }
            >
              {project.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            {project.description || 'No description provided.'}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 mt-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>{project.tasks?.length || 0} Total Tasks</span>
            <span>•</span>
            <span>{project.customers?.length || 0} Linked Clients</span>
          </div>
        </div>

        {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Project
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'tasks'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Tasks ({project.tasks?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'customers'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Clients ({project.customers?.length || 0})
          </button>
        </div>

        {activeTab === 'tasks' && hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' ? (
        <div className="space-y-3">
          {project.tasks?.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center glass-card rounded-2xl">
              No tasks have been added to this project yet.
            </p>
          ) : (
            project.tasks.map((task: any) => (
              <div
                key={task.id}
                className="glass-card p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-slate-100">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                    <span>Assignee: {task.assignee?.name || 'Unassigned'}</span>
                    {task.dueDate && (
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTaskStatusMutation.mutate({ taskId: task.id, status: e.target.value })
                    }
                    disabled={
                      !hasRole(['OWNER', 'ADMIN', 'MANAGER']) && task.assigneeId !== user?.id
                    }
                    className="glass-input px-3 py-1.5 rounded-lg text-xs bg-slate-900 text-slate-200"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {project.customers?.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center glass-card rounded-2xl">
              No clients linked to this project yet.
            </p>
          ) : (
            project.customers.map((c: any) => (
              <div
                key={c.id}
                className="glass-card p-4 rounded-xl border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-semibold text-sm text-slate-100">{c.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{c.company} • {c.email}</p>
                </div>
                {c.phone && <span className="text-xs text-slate-400 font-mono">{c.phone}</span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Project">
        <form
          onSubmit={handleSubmitEdit((data) => updateMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              defaultValue={project.name}
              {...registerEdit('name', { required: true })}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              defaultValue={project.description || ''}
              {...registerEdit('description')}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Status
            </label>
            <select
              defaultValue={project.status}
              {...registerEdit('status')}
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
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Task Modal */}
      <Modal isOpen={isNewTaskModalOpen} onClose={() => setIsNewTaskModalOpen(false)} title="New Task in Project">
        <form
          onSubmit={handleSubmitTask((data) => createTaskMutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              placeholder="e.g. Implement Webhook Handlers"
              {...registerTask('title', { required: true })}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
              Assignee (Optional)
            </label>
            <select
              {...registerTask('assigneeId')}
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
              Description (Optional)
            </label>
            <textarea
              rows={2}
              {...registerTask('description')}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl"
            >
              Create Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
