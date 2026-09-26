import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Check, Building, FileCode, Shield } from 'lucide-react';
import { useAuth, Role } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const Navbar: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const { currentOrg, organizations, switchOrganization } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleVariant = (role?: Role) => {
    switch (role) {
      case 'OWNER':
        return 'purple';
      case 'ADMIN':
        return 'brand';
      case 'MANAGER':
        return 'blue';
      default:
        return 'slate';
    }
  };

  return (
    <header className="h-16 glass-panel border-b border-slate-800/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Organization Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 transition-all text-sm font-semibold text-slate-200"
          >
            <Building className="w-4 h-4 text-brand-400" />
            <span className="max-w-[130px] sm:max-w-[200px] truncate">{currentOrg?.name || 'Workspace'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-64 glass-panel rounded-xl border border-slate-800 shadow-2xl p-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Your Organizations
              </div>
              <div className="space-y-1 mt-1">
                {organizations.map((org) => {
                  const isCurrent = org.id === currentOrg?.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isCurrent
                          ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate font-semibold">{org.name}</span>
                        <span className="text-[10px] text-slate-400">{org.role}</span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-brand-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Current Role Badge */}
        {currentOrg?.role && (
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Badge variant={getRoleVariant(currentOrg.role) as any} size="sm">
              <Shield className="w-3 h-3" />
              {currentOrg.role}
            </Badge>
          </div>
        )}
      </div>

      {/* Right Navbar Actions */}
      <div className="flex items-center gap-3">
        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 transition-colors"
        >
          <FileCode className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Swagger API Docs</span>
        </a>

        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium">Tenant Isolated</span>
        </div>
      </div>
    </header>
  );
};
