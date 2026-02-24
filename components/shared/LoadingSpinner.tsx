'use client';

import { Loader2 } from 'lucide-react';
import type React from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  colorClassName?: string;
  label?: string;
  className?: string;
}

const sizeMap: Record<LoadingSpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  colorClassName = 'text-blue-500',
  label,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2
        className={`${sizeMap[size]} animate-spin text-muted-foreground ${colorClassName}`}
      />
      {label && (
        <span className="text-xs font-medium text-muted-foreground animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
};


