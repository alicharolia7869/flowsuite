import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Building2,
  CreditCard,
  Gauge,
  ScrollText,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { user, currentOrg, hasRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Projects', path: '/projects', icon: FolderKanban, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Customers', path: '/customers', icon: Building2, roles: ['OWNER', 'ADMIN', 'MANAGER'] },
    { name: 'Team', path: '/team', icon: Users, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Billing & Plans', path: '/billing', icon: CreditCard, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Usage Metrics', path: '/usage', icon: Gauge, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
    { name: 'Audit Logs', path: '/audit-logs', icon: ScrollText, roles: ['OWNER', 'ADMIN'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER'] },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 glass-panel border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-glow shrink-0">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
              FlowSuite
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400">
                SaaS
              </span>
            </span>
            <span className="text-xs text-slate-400 truncate font-medium">
              {currentOrg?.name || 'Workspace'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => hasRole(item.roles as any))
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-300 font-semibold shadow-inner border border-brand-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
        </nav>

        {/* Plan & Subscription Card */}
        <div className="p-3 mx-3 mb-3 glass-card rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">Plan Tier</span>
            <Badge variant="brand" size="sm">
              {currentOrg?.plan || 'STARTER'}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Multi-tenant workspace with role-based access control.
          </p>
          <NavLink
            to="/billing"
            onClick={onClose}
            className="block text-center text-xs font-semibold py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 transition-colors border border-slate-700/60"
          >
            Manage Billing
          </NavLink>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-slate-200 truncate">{user?.name}</span>
              <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
