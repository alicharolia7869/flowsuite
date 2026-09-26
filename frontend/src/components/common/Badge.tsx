import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'blue' | 'amber' | 'emerald' | 'rose' | 'slate' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
}) => {
  const variantStyles = {
    brand: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blue: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  }[variant];

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${variantStyles} ${sizeStyles} tracking-wide`}
    >
      {children}
    </span>
  );
};
