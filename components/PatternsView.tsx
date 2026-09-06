'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import { InsightPattern } from '@/types';
import { ProfessionalNotice } from '@/components/ui/ProfessionalNotice';

interface PatternsViewProps {
  onSelectJournal?: (journalId: string) => void;
}

export function PatternsView({ onSelectJournal }: PatternsViewProps) {
  const { idToken } = useAuth();
  const [patterns, setPatterns] = useState<InsightPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'detected' | 'acknowledged' | 'dismissed'>('all');

  const loadPatterns = useCallback(async () => {
    if (!idToken) return;
    try {
      const data = await apiClient.getInsights(idToken);
      setPatterns(data);
    } catch (err: any) {
      console.error('Failed to load patterns:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!idToken) return;
      try {
        const data = await apiClient.getInsights(idToken);
        if (!ignore) setPatterns(data);
      } catch (err: any) {
        console.error('Failed to load patterns:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [idToken]);

  const handleRunAnalysis = async () => {
    if (!idToken || analyzing) return;
    setAnalyzing(true);
    setNotice(null);
    setErrorNotice(null);
    try {
      const newPatterns = await apiClient.detectPatterns(idToken);
      await loadPatterns();
      setNotice(`Analysis complete. Found ${newPatterns.length} possible patterns/shifts.`);
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'acknowledged' | 'dismissed') => {
    if (!idToken) return;
    try {
      const updated = await apiClient.updatePatternStatus(idToken, id, status);
      setPatterns((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err: any) {
      setNotice('Failed to update status');
    }
  };

  const filtered = patterns.filter((p) => {
    if (filter === 'all') return p.status !== 'dismissed';
    return p.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262624] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-[#E5E5E1] tracking-tight">
            Patterns & Trends
          </h1>
          <p className="text-sm font-serif text-[#8A8A85] mt-1 max-w-xl leading-relaxed">
            ReflectIQ notices recurring themes, blockers, and changes in your thinking across your reflections over time. Everything is a gentle suggestion to consider, never a diagnosis.
          </p>
        </div>

        <button
          id="run-pattern-analysis-btn"
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] disabled:opacity-50 px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-none transition-colors whitespace-nowrap self-start font-medium"
        >
          {analyzing ? 'Reading entries...' : 'Look for patterns'}
        </button>
      </div>

      {errorNotice && (
        <ProfessionalNotice
          error={errorNotice}
          onRetry={handleRunAnalysis}
          onDismiss={() => setErrorNotice(null)}
        />
      )}

      {notice && (
        <div className="p-3 border border-[#262624] bg-[#141414] text-xs font-mono text-[#E5E5E1] flex items-center justify-between">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            className="text-[#8A8A85] hover:text-[#E5E5E1] text-[11px] uppercase tracking-wider font-mono cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#262624] pb-2 text-xs font-mono">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 transition-colors ${filter === 'all' ? 'bg-[#A68E6A] text-[#0A0A0A] font-medium' : 'text-[#8A8A85] hover:text-[#E5E5E1]'}`}
        >
          Active Patterns ({patterns.filter((p) => p.status !== 'dismissed').length})
        </button>
        <button
          onClick={() => setFilter('acknowledged')}
          className={`px-3 py-1 transition-colors ${filter === 'acknowledged' ? 'bg-[#A68E6A] text-[#0A0A0A] font-medium' : 'text-[#8A8A85] hover:text-[#E5E5E1]'}`}
        >
          Acknowledged ({patterns.filter((p) => p.status === 'acknowledged').length})
        </button>
        <button
          onClick={() => setFilter('dismissed')}
          className={`px-3 py-1 transition-colors ${filter === 'dismissed' ? 'bg-[#A68E6A] text-[#0A0A0A] font-medium' : 'text-[#8A8A85] hover:text-[#E5E5E1]'}`}
        >
          Dismissed ({patterns.filter((p) => p.status === 'dismissed').length})
        </button>
      </div>

      {/* Content list */}
      {loading && (
        <div className="py-12 text-center text-sm font-serif italic text-[#8A8A85]">
          Loading discovered patterns...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border border-[#262624] bg-[#141414] p-8 text-center space-y-3">
          <p className="font-serif text-sm text-[#8A8A85]">
            No patterns found yet. Write a couple reflections and tap &ldquo;Look for patterns&rdquo; above.
          </p>
          <button
            onClick={handleRunAnalysis}
            className="border border-[#262624] bg-[#0A0A0A] hover:bg-[#1C1C1A] px-4 py-2 text-xs font-mono text-[#E5E5E1] transition-colors"
          >
            Look for patterns
          </button>
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border border-[#262624] bg-[#141414] p-6 space-y-4 shadow-none"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-[#262624] pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A68E6A] bg-[#0A0A0A] px-2 py-0.5 border border-[#262624]">
                      Possible {item.type}
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8A85]">
                      Found: {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    {item.status === 'acknowledged' && (
                      <span className="text-[10px] font-mono uppercase text-[#A68E6A] bg-[#0A0A0A] border border-[#262624] px-1.5 py-0.5">
                        Acknowledged
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg font-medium text-[#E5E5E1]">
                    {item.title}
                  </h3>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center space-x-2 text-xs font-mono">
                  {item.status !== 'acknowledged' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'acknowledged')}
                      className="border border-[#A68E6A] text-[#A68E6A] hover:bg-[#A68E6A]/10 px-2.5 py-1 text-[11px] transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {item.status !== 'dismissed' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'dismissed')}
                      className="border border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#1C1C1A] px-2.5 py-1 text-[11px] transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>

              {/* Interpretation Body (Visually distinguished) */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Observation
                </span>
                <p className="font-serif text-sm text-[#E5E5E1] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Supporting Evidence Quotes */}
              {item.evidenceSnippets && item.evidenceSnippets.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#262624]">
                  <span className="text-xs font-medium text-[#8A8A85]">
                    Quotes from your entries
                  </span>
                  <div className="space-y-2">
                    {item.evidenceSnippets.map((snippet, idx) => (
                      <blockquote
                        key={idx}
                        className="font-serif italic text-xs text-[#8A8A85] border-l-2 border-l-[#A68E6A] pl-3 py-1 bg-[#0A0A0A]"
                      >
                        &ldquo;{snippet}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
