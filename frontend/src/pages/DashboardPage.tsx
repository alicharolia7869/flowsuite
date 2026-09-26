import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

export const DashboardPage: React.FC = () => {
  const { currentOrg, hasRole, user } = useAuth();

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['usage', currentOrg?.id],
    queryFn: () => api.get<any>('/usage'),
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', currentOrg?.id],
    queryFn: () => api.get<{ projects: any[] }>('/projects'),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', currentOrg?.id],
    queryFn: () => api.get<{ tasks: any[] }>('/tasks'),
  });

  const projects = projectsData?.projects || [];
  const tasks = tasksData?.tasks || [];
  const myTasks = tasks.filter(t => t.assigneeId === user?.id || currentOrg?.role === 'MEMBER');

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Workspace: <span className="text-slate-200 font-semibold">{currentOrg?.name}</span> • Role:{' '}
            <span className="text-brand-400 font-semibold">{currentOrg?.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasRole(['OWNER', 'ADMIN', 'MANAGER']) && (
            <Link
              to="/projects"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-brand-400 hover:bg-brand-300 rounded-xl transition-all shadow-glow"
            >
              <Plus className="w-4 h-4" /> New Project
            </Link>
          )}
          {hasRole(['OWNER', 'ADMIN']) && (
            <Link
              to="/team"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700/60 transition-colors"
            >
              <Users className="w-4 h-4" /> Invite Member
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Projects */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Projects</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {projectsLoading ? '...' : projects.length}
            </span>
            {usageData?.projects && (
              <span className="text-xs text-slate-400">
                / {usageData.projects.isUnlimited ? '∞' : usageData.projects.limit} limit
              </span>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar
              value={usageData?.projects?.used || projects.length}
              max={usageData?.projects?.limit || 20}
              isUnlimited={usageData?.projects?.isUnlimited}
            />
          </div>
        </div>

        {/* Metric 2: Tasks */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {tasksLoading ? '...' : tasks.length}
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {tasks.filter(t => t.status === 'DONE').length} completed
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-3 truncate">
            {tasks.filter(t => t.status === 'IN_PROGRESS').length} currently in progress
          </p>
        </div>

        {/* Metric 3: Team Seats */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Seats</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {usageLoading ? '...' : usageData?.seats?.used || 1}
            </span>
            <span className="text-xs text-slate-400">/ {usageData?.seats?.limit || 3} allowed</span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={usageData?.seats?.used || 1}
              max={usageData?.seats?.limit || 3}
            />
          </div>
        </div>

        {/* Metric 4: API Quota */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly API Calls</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {usageLoading ? '...' : (usageData?.apiRequests?.used || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              / {(usageData?.apiRequests?.limit || 1000).toLocaleString()}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={usageData?.apiRequests?.used || 0}
              max={usageData?.apiRequests?.limit || 1000}
            />
          </div>
        </div>
      </div>

      {/* Main Dashboard Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-brand-400" />
                Active Projects Overview
              </h3>
              <Link to="/projects" className="text-xs font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No projects in this organization yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-4">
                      <Link to={`/projects/${p.id}`} className="font-semibold text-sm text-slate-200 hover:text-brand-400 truncate block">
                        {p.name}
                      </Link>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{p.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={
                          p.status === 'COMPLETED'
                            ? 'emerald'
                            : p.status === 'IN_PROGRESS'
                            ? 'blue'
                            : 'slate'
                        }
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        {p.completedTasks}/{p.totalTasks} Tasks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assigned Tasks */}
        <div className="space-y-4">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                My Tasks
              </h3>
              <Link to="/tasks" className="text-xs font-medium text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View board <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {myTasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No tasks assigned to you.</p>
            ) : (
              <div className="space-y-2.5">
                {myTasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-xs text-slate-200 block truncate">{t.title}</span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {t.project?.name || 'Workspace Project'}
                      </span>
                    </div>
                    <Badge
                      variant={
                        t.status === 'DONE' ? 'emerald' : t.status === 'IN_PROGRESS' ? 'amber' : 'slate'
                      }
                      size="sm"
                    >
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
