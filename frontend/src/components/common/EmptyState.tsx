import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-2xl border border-dashed border-slate-800 my-4">
      <div className="p-4 rounded-2xl bg-brand-500/10 text-brand-400 mb-4 border border-brand-500/20 shadow-glow">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-semibold text-slate-100 mb-1">{title}</h4>
      <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition-all shadow-lg shadow-brand-900/40"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
