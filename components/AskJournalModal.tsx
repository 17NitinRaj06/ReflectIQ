'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import { AskJournalResult } from '@/types';
import { ProfessionalNotice } from '@/components/ui/ProfessionalNotice';

interface AskJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectJournal?: (journalId: string) => void;
}

export function AskJournalModal({ isOpen, onClose, onSelectJournal }: AskJournalModalProps) {
  const { idToken } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskJournalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.askMyJournal(idToken, query.trim());
      setResult(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0A0A]/80 backdrop-blur-none">
      <div
        className="bg-[#141414] border border-[#262624] max-w-2xl w-full max-h-[85vh] flex flex-col shadow-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rag-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262624] flex items-center justify-between">
          <div>
            <h2 id="rag-modal-title" className="font-serif text-xl font-medium text-[#E5E5E1]">
              Ask My Journal
            </h2>
            <p className="text-xs text-[#8A8A85] mt-0.5">
              Ask a question and I&apos;ll search your past entries for the answer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#8A8A85] hover:text-[#E5E5E1] px-2 py-1 border border-transparent hover:border-[#262624] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="p-6 border-b border-[#262624] bg-[#111111]">
          <label htmlFor="rag-query-input" className="block text-xs font-mono uppercase text-[#8A8A85] mb-2">
            Ask a question
          </label>
          <div className="flex gap-2">
            <input
              id="rag-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What recurring blockers have I noted when starting new writing projects?"
              className="flex-1 bg-[#141414] border border-[#262624] px-3 py-2 text-sm text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A] rounded-none font-serif"
              autoFocus
            />
            <button
              id="rag-submit-btn"
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] disabled:opacity-50 px-4 py-2 text-xs uppercase tracking-wider font-medium font-mono transition-colors"
            >
              {loading ? 'Searching...' : 'Ask'}
            </button>
          </div>
        </form>

        {/* Results area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && (
            <div className="py-8 text-center text-sm text-[#8A8A85] font-serif italic">
              Searching your past reflections...
            </div>
          )}

          {error && (
            <ProfessionalNotice
              error={error}
              onRetry={() => {
                const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                handleSearch(fakeEvent);
              }}
              onDismiss={() => setError(null)}
            />
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Grounded synthesis answer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-[#A68E6A] font-mono">
                    Answer from your entries
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${
                      result.confidence === 'high'
                        ? 'border-[#A68E6A] text-[#A68E6A] bg-[#0A0A0A]'
                        : result.confidence === 'moderate'
                        ? 'border-[#8A8A85] text-[#8A8A85] bg-[#0A0A0A]'
                        : 'border-[#262624] text-[#8A8A85] bg-[#0A0A0A]'
                    }`}
                  >
                    Match: {result.confidence}
                  </span>
                </div>
                <div className="font-serif text-base text-[#E5E5E1] leading-relaxed bg-[#0A0A0A] p-4 border border-[#262624]">
                  {result.answer}
                </div>
              </div>

              {/* Citations list */}
              {result.citations && result.citations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#8A8A85] font-mono">
                    Related Entries ({result.citations.length})
                  </div>
                  <div className="space-y-2">
                    {result.citations.map((citation, index) => (
                      <div
                        key={index}
                        className="border border-[#262624] bg-[#0A0A0A] p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              if (onSelectJournal) {
                                onSelectJournal(citation.journalId);
                                onClose();
                              }
                            }}
                            className="font-serif font-medium text-[#E5E5E1] hover:text-[#A68E6A] transition-colors text-left"
                          >
                            {citation.title}
                          </button>
                          <div className="flex items-center space-x-2 font-mono text-[10px] text-[#8A8A85]">
                            <span>{citation.date}</span>
                            <span>&middot;</span>
                            <span>Match: {Math.round(citation.similarity * 100)}%</span>
                          </div>
                        </div>
                        <p className="text-[#8A8A85] font-serif italic text-xs leading-relaxed">
                          &ldquo;{citation.snippet}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-8 text-xs text-[#8A8A85] font-serif">
              Ask questions about previous decisions, recurring obstacles, changes in focus, or specific topics documented in your reflections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
