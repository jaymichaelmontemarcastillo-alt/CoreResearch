import React from 'react';

const badgeVariants = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  slate: 'bg-slate-800 text-slate-400 border-slate-700',
};

export const Badge = ({ children, variant = 'blue', className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        badgeVariants[variant] || badgeVariants.blue
      } ${className}`}
    >
      {children}
    </span>
  );
};
