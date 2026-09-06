'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import { WeeklyReview } from '@/types';
import { ProfessionalNotice } from '@/components/ui/ProfessionalNotice';

export function WeeklyReviewView() {
  const { idToken } = useAuth();
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<any>(null);

  const loadReviews = useCallback(async () => {
    if (!idToken) return;
    try {
      const list = await apiClient.getWeeklyReviews(idToken);
      setReviews(list);
      if (list.length > 0 && !selectedReview) {
        setSelectedReview(list[0]!);
      }
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken, selectedReview]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!idToken) return;
      try {
        const list = await apiClient.getWeeklyReviews(idToken);
        if (!ignore) {
          setReviews(list);
          if (list.length > 0) {
            setSelectedReview(list[0]!);
          }
        }
      } catch (err: any) {
        console.error('Failed to load reviews:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [idToken]);

  const handleGenerateWeekly = async () => {
    if (!idToken || generating) return;
    setGenerating(true);
    setNotice(null);
    setErrorNotice(null);
    try {
      const generated = await apiClient.generateWeeklyReview(idToken);
      setReviews((prev) => [generated, ...prev]);
      setSelectedReview(generated);
      setNotice('Weekly review created.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setErrorNotice(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262624] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-[#E5E5E1] tracking-tight">
            Weekly Review
          </h1>
          <p className="text-sm font-serif text-[#8A8A85] mt-1 max-w-xl leading-relaxed">
            A thoughtful summary of your week: themes, progress on goals, wins, and friction points — with an intentional focus for the week ahead.
          </p>
        </div>

        <button
          id="generate-weekly-btn"
          onClick={handleGenerateWeekly}
          disabled={generating}
          className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] disabled:opacity-50 px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-none transition-colors whitespace-nowrap self-start font-medium"
        >
          {generating ? 'Creating review...' : 'Create weekly review'}
        </button>
      </div>

      {errorNotice && (
        <ProfessionalNotice
          error={errorNotice}
          onRetry={handleGenerateWeekly}
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

      {loading && (
        <div className="py-12 text-center text-xs font-serif italic text-[#8A8A85]">
          Loading weekly synthesis archives...
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <div className="border border-[#262624] bg-[#141414] p-8 text-center space-y-4">
          <p className="font-serif text-sm text-[#8A8A85]">
            No weekly reviews yet. Write a reflection entry and click &ldquo;Create weekly review&rdquo; to summarize your week.
          </p>
          <button
            onClick={handleGenerateWeekly}
            disabled={generating}
            className="border border-[#262624] bg-[#0A0A0A] hover:bg-[#1C1C1A] px-4 py-2 text-xs font-mono text-[#E5E5E1] transition-colors"
          >
            Review this past week
          </button>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* History Sidebar */}
          <div className="lg:col-span-1 space-y-2 border-r border-[#262624] pr-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8A85] block mb-2">
              Previous Weeks ({reviews.length})
            </span>
            <div className="space-y-1">
              {reviews.map((rev) => (
                <button
                  key={rev.id}
                  onClick={() => setSelectedReview(rev)}
                  className={`w-full text-left p-2.5 text-xs transition-colors block border ${
                    selectedReview?.id === rev.id
                      ? 'border-[#A68E6A] bg-[#141414] font-medium'
                      : 'border-transparent hover:bg-[#141414] text-[#8A8A85]'
                  }`}
                >
                  <div className="font-serif text-[#E5E5E1]">{rev.weekLabel}</div>
                  <div className="font-mono text-[10px] text-[#8A8A85] mt-0.5">
                    {rev.reflectionCount} entries &middot; {rev.actionsCompleted} actions
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Review Document */}
          {selectedReview && (
            <div className="lg:col-span-3 bg-[#141414] border border-[#262624] p-6 sm:p-8 space-y-8">
              {/* Document Header */}
              <div className="border-b border-[#262624] pb-4">
                <div className="flex items-center justify-between text-xs font-mono text-[#8A8A85]">
                  <span>WEEKLY SUMMARY</span>
                  <span>Created: {new Date(selectedReview.createdAt).toLocaleDateString()}</span>
                </div>
                <h2 className="font-serif text-2xl font-medium text-[#E5E5E1] mt-1">
                  {selectedReview.weekLabel}
                </h2>
                <div className="flex items-center gap-4 text-xs font-mono text-[#8A8A85] mt-2">
                  <span>{selectedReview.reflectionCount} reflections written</span>
                  <span>&middot;</span>
                  <span>{selectedReview.actionsCompleted} actions completed</span>
                </div>
              </div>

              {/* Recurring Themes */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Themes
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedReview.recurringThemes.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-serif bg-[#0A0A0A] border border-[#262624] px-2.5 py-1 text-[#A68E6A]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Notable Wins & Unresolved Challenges Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Wins */}
                <div className="border border-[#262624] bg-[#0A0A0A] p-4 space-y-2">
                  <span className="text-xs font-medium text-[#A68E6A]">
                    Wins & Realizations
                  </span>
                  <ul className="space-y-2">
                    {selectedReview.notableWins.map((w, idx) => (
                      <li key={idx} className="text-xs font-serif text-[#E5E5E1] leading-relaxed flex items-start">
                        <span className="font-mono text-[#A68E6A] mr-2">&bull;</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Challenges */}
                <div className="border border-[#262624] bg-[#0A0A0A] p-4 space-y-2">
                  <span className="text-xs font-medium text-[#8A8A85]">
                    Challenges & Friction
                  </span>
                  <ul className="space-y-2">
                    {selectedReview.unresolvedChallenges.length > 0 ? (
                      selectedReview.unresolvedChallenges.map((c, idx) => (
                        <li key={idx} className="text-xs font-serif text-[#E5E5E1] leading-relaxed flex items-start">
                          <span className="font-mono text-[#8A8A85] mr-2">&bull;</span>
                          <span>{c}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs font-serif italic text-[#8A8A85]">
                        No acute challenges recorded this cycle.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Possible Pattern */}
              <div className="border border-[#A68E6A] bg-[#0A0A0A] p-4 space-y-1.5">
                <span className="text-xs font-medium text-[#A68E6A]">
                  Pattern to watch
                </span>
                <p className="font-serif text-sm text-[#E5E5E1] leading-relaxed">
                  {selectedReview.possiblePattern}
                </p>
              </div>

              {/* Suggested Focus */}
              <div className="border border-[#262624] bg-[#0A0A0A] p-4 space-y-1.5">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Focus for next week
                </span>
                <p className="font-serif text-sm text-[#E5E5E1] leading-relaxed">
                  {selectedReview.suggestedFocus}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
