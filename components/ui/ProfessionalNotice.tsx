'use client';

import React from 'react';
import { Sparkles, Clock, ShieldCheck, RotateCcw, X, Info } from 'lucide-react';
import { formatUserFriendlyError, FormattedError } from '@/lib/error-handling';

interface ProfessionalNoticeProps {
  error: any;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function ProfessionalNotice({
  error,
  onRetry,
  onDismiss,
  className = '',
  compact = false,
}: ProfessionalNoticeProps) {
  if (!error) return null;

  const formatted: FormattedError =
    typeof error === 'object' && error?.title && error?.message && 'isQuota' in error
      ? error
      : formatUserFriendlyError(error);

  const getIcon = () => {
    if (formatted.isQuota) {
      return <Clock className="w-4 h-4 text-[#A68E6A] flex-shrink-0" />;
    }
    if (formatted.code === 'TEMPORARILY_UNAVAILABLE') {
      return <Sparkles className="w-4 h-4 text-[#A68E6A] flex-shrink-0" />;
    }
    return <Info className="w-4 h-4 text-[#A68E6A] flex-shrink-0" />;
  };

  if (compact) {
    return (
      <div
        className={`border border-[#262624] bg-[#141414] p-2.5 text-xs text-[#E5E5E1] flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {getIcon()}
          <span className="font-serif text-[#E5E5E1] truncate">{formatted.message}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && formatted.retryable && (
            <button
              onClick={onRetry}
              className="text-[11px] font-mono text-[#A68E6A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[#8A8A85] hover:text-[#E5E5E1] p-0.5 cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border border-[#262624] bg-[#141414] p-4 text-[#E5E5E1] relative space-y-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <h4 className="font-serif text-sm font-medium text-[#E5E5E1] tracking-tight">
            {formatted.title}
          </h4>
        </div>

        <div className="flex items-center space-x-2">
          {/* Note Preservation Assurance Badge */}
          <span className="inline-flex items-center space-x-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[#262624] bg-[#0A0A0A] text-[#8A8A85]">
            <ShieldCheck className="w-3 h-3 text-[#A68E6A]" />
            <span>Writings Safe</span>
          </span>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-[#8A8A85] hover:text-[#E5E5E1] p-1 transition-colors cursor-pointer"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Narrative Message */}
      <p className="text-xs sm:text-sm font-serif text-[#C4C4C0] leading-relaxed">
        {formatted.message}
      </p>

      {/* Action Footer */}
      {(onRetry || onDismiss) && (
        <div className="flex items-center justify-between pt-1 border-t border-[#262624]/60">
          <span className="text-[11px] font-mono text-[#8A8A85]">
            {formatted.isQuota
              ? 'Capacity automatically restores as demand normalizes.'
              : 'You may continue writing freely while the assistant refreshes.'}
          </span>

          <div className="flex items-center space-x-2">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-2.5 py-1 text-xs font-mono text-[#8A8A85] hover:text-[#E5E5E1] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            )}
            {onRetry && formatted.retryable && (
              <button
                onClick={onRetry}
                className="px-3 py-1 text-xs font-mono border border-[#A68E6A] text-[#E5E5E1] hover:bg-[#1E1E1C] transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-[#A68E6A]" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
