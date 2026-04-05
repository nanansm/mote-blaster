import * as React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'bg-primary text-white': variant === 'default',
          'bg-status-success text-white': variant === 'success',
          'bg-status-error text-white': variant === 'error',
          'bg-status-warning text-white': variant === 'warning',
          'bg-status-info text-white': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
