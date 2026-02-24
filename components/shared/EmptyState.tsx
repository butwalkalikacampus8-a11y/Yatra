'use client';

import type React from 'react';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-8 px-4 gap-2 text-gray-600 ${className}`}
    >
      {icon && <div className="mb-1 text-gray-400">{icon}</div>}
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {description && (
        <p className="text-xs text-gray-500 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          className="mt-2 min-h-11 px-4"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};


