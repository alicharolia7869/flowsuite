import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gauge,
  Users,
  FolderKanban,
  Zap,
  TrendingUp,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';

export const UsageDashboardPage: React.FC = () => {
  const { currentOrg } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['usage', currentOrg?.id],
    queryFn: () => api.get<any>('/usage'),
  });

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  const { plan, seats, projects, apiRequests, chartData } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Gauge className="w-6 h-6 text-brand-400" />
            Workspace Usage & Quotas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time server telemetry tracking seats, project limits, and monthly API consumption.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="brand">
            <Sparkles className="w-3.5 h-3.5" />
            {plan?.name || 'STARTER'} TIER
          </Badge>
        </div>
      </div>

      {/* Quota Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Seats Usage Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Seat Quota
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {seats?.used || 0}
            </span>
            <span className="text-sm text-slate-400 font-mono">
              / {seats?.limit || 0} seats
            </span>
          </div>

          <ProgressBar
            value={seats?.used || 0}
            max={seats?.limit || 1}
          />

          <p className="text-[11px] text-slate-400">
            {seats?.limit - seats?.used > 0
              ? `${seats?.limit - seats?.used} seats available to invite.`
              : 'Seat quota fully utilized.'}
          </p>
        </div>

        {/* Projects Usage Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Project Quota
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {projects?.used || 0}
            </span>
            <span className="text-sm text-slate-400 font-mono">
              / {projects?.isUnlimited ? 'Unlimited' : `${projects?.limit} projects`}
            </span>
          </div>

          <ProgressBar
            value={projects?.used || 0}
            max={projects?.limit || 1}
            isUnlimited={projects?.isUnlimited}
          />

          <p className="text-[11px] text-slate-400">
            {projects?.isUnlimited
              ? 'Professional plan includes unlimited active projects.'
              : `${Math.max(0, projects?.limit - projects?.used)} project slots remaining.`}
          </p>
        </div>

        {/* API Requests Usage Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              API Requests / Month
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {(apiRequests?.used || 0).toLocaleString()}
            </span>
            <span className="text-sm text-slate-400 font-mono">
              / {(apiRequests?.limit || 1000).toLocaleString()}
            </span>
          </div>

          <ProgressBar
            value={apiRequests?.used || 0}
            max={apiRequests?.limit || 1000}
          />

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Resets on: {plan?.renewalDate ? new Date(plan.renewalDate).toLocaleDateString() : 'Next Cycle'}
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              API Consumption Velocity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live request trend logged against Redis counters and database usage limits.
            </p>
          </div>
          <Badge variant="blue" size="sm">
            Live Stream
          </Badge>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="apiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#22c55e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#apiGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
