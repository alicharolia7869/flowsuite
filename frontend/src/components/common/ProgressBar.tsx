import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  isUnlimited?: boolean;
  unit?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  isUnlimited = false,
  unit = '',
}) => {
  const percentage = isUnlimited ? 0 : Math.min(100, Math.round((value / max) * 100));

  const getColor = () => {
    if (isUnlimited) return 'bg-sky-500';
    if (percentage >= 95) return 'bg-rose-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-brand-500';
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium">{label}</span>
          <span className="text-slate-200 font-semibold font-mono">
            {value.toLocaleString()} {unit} / {isUnlimited ? 'Unlimited' : `${max.toLocaleString()} ${unit}`}
            {!isUnlimited && ` (${percentage}%)`}
          </span>
        </div>
      )}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
};
