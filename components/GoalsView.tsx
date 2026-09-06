'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import { Goal, ActionItem } from '@/types';

export function GoalsView() {
  const { idToken } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // New goal form state
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // New action form state
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDue, setNewActionDue] = useState('');

  const loadData = useCallback(async () => {
    if (!idToken) return;
    try {
      const [goalsList, actionsList] = await Promise.all([
        apiClient.getGoals(idToken),
        apiClient.getActions(idToken),
      ]);
      setGoals(goalsList);
      setActions(actionsList);
    } catch (err: any) {
      console.error('Failed to load goals/actions:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!idToken) return;
      try {
        const [goalsList, actionsList] = await Promise.all([
          apiClient.getGoals(idToken),
          apiClient.getActions(idToken),
        ]);
        if (!ignore) {
          setGoals(goalsList);
          setActions(actionsList);
        }
      } catch (err: any) {
        console.error('Failed to load goals/actions:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [idToken]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !idToken || submittingGoal) return;

    setSubmittingGoal(true);
    try {
      const created = await apiClient.createGoal(idToken, {
        title: newGoalTitle.trim(),
        description: newGoalDesc.trim(),
        targetDate: newGoalTarget || undefined,
        progress: 0,
      });
      setGoals((prev) => [created, ...prev]);
      setNewGoalTitle('');
      setNewGoalDesc('');
      setNewGoalTarget('');
      setShowGoalForm(false);
      setNotice('New goal recorded.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err: any) {
      setNotice('Failed to create goal');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    if (!idToken) return;
    try {
      const updated = await apiClient.updateGoal(idToken, id, {
        progress: newProgress,
        status: newProgress >= 100 ? 'completed' : 'active',
      });
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      setNotice('Failed to update progress');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!idToken) return;
    try {
      await apiClient.deleteGoal(idToken, id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setNotice('Goal removed.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to delete goal');
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle.trim() || !idToken) return;

    try {
      const created = await apiClient.createAction(idToken, {
        title: newActionTitle.trim(),
        dueSuggestion: newActionDue.trim() || undefined,
        status: 'accepted',
      });
      setActions((prev) => [created, ...prev]);
      setNewActionTitle('');
      setNewActionDue('');
      setNotice('Action item created.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to create action');
    }
  };

  const handleUpdateActionStatus = async (
    id: string,
    status: 'accepted' | 'completed' | 'dismissed'
  ) => {
    if (!idToken) return;
    try {
      const updated = await apiClient.updateAction(idToken, id, { status });
      setActions((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      setNotice('Failed to update action');
    }
  };

  const handleDeleteAction = async (id: string) => {
    if (!idToken) return;
    try {
      await apiClient.deleteAction(idToken, id);
      setActions((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setNotice('Failed to delete action');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-12">
      {/* Page Header */}
      <div className="border-b border-[#262624] pb-6">
        <h1 className="font-serif text-3xl font-medium text-[#E5E5E1] tracking-tight">
          Goals & Next Steps
        </h1>
        <p className="text-sm font-serif text-[#8A8A85] mt-1 max-w-xl leading-relaxed">
          Turn your reflections into intentional next steps. ReflectIQ may suggest a goal update or task during your conversations, but nothing is ever saved without your confirmation.
        </p>
      </div>

      {notice && (
        <div className="p-3 border border-[#262624] bg-[#141414] text-xs font-mono text-[#E5E5E1]">
          {notice}
        </div>
      )}

      {/* SECTION 1: GOALS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#262624] pb-2">
          <h2 className="font-serif text-xl font-medium text-[#E5E5E1]">
            Goals ({goals.length})
          </h2>
          <button
            id="open-new-goal-form-btn"
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="border border-[#A68E6A] bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors font-medium"
          >
            {showGoalForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {/* Create Goal Form */}
        {showGoalForm && (
          <form onSubmit={handleCreateGoal} className="border border-[#262624] bg-[#141414] p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase text-[#8A8A85]">New Goal</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Goal title (e.g. Complete manuscript first draft)"
                className="w-full bg-[#0A0A0A] border border-[#262624] px-3 py-2 text-sm font-serif text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A]"
                required
              />
              <textarea
                value={newGoalDesc}
                onChange={(e) => setNewGoalDesc(e.target.value)}
                placeholder="Description, context, or why this matters..."
                rows={2}
                className="w-full bg-[#0A0A0A] border border-[#262624] px-3 py-2 text-sm font-serif text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A]"
              />
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#262624] px-3 py-1.5 text-xs font-mono text-[#E5E5E1] focus:outline-none focus:border-[#A68E6A]"
                />
                <button
                  type="submit"
                  disabled={submittingGoal || !newGoalTitle.trim()}
                  className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-4 py-1.5 text-xs font-mono uppercase tracking-wider font-medium transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Goals List */}
        {loading && (
          <div className="py-6 text-center text-xs font-serif italic text-[#8A8A85]">
            Loading goals...
          </div>
        )}

        {!loading && goals.length === 0 && !showGoalForm && (
          <div className="border border-[#262624] bg-[#141414] p-6 text-center text-sm font-serif text-[#8A8A85]">
            No goals recorded yet. Add a focus area or let Gemini distill a goal from your reflections.
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="border border-[#262624] bg-[#141414] p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${
                          goal.status === 'completed'
                            ? 'border-[#A68E6A] text-[#A68E6A] bg-[#0A0A0A]'
                            : 'border-[#262624] text-[#8A8A85] bg-[#0A0A0A]'
                        }`}
                      >
                        {goal.status}
                      </span>
                      {goal.targetDate && (
                        <span className="text-[10px] font-mono text-[#8A8A85]">
                          Target: {goal.targetDate}
                        </span>
                      )}
                    </div>
                    <h4 className="font-serif text-base font-semibold text-[#E5E5E1]">
                      {goal.title}
                    </h4>
                    {goal.description && (
                      <p className="text-xs font-serif text-[#8A8A85] leading-relaxed">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-[11px] text-[#8A8A85] hover:text-[#E5E5E1] font-mono transition-colors"
                  >
                    Delete
                  </button>
                </div>

                {/* Progress bar and slider */}
                <div className="pt-2 border-t border-[#262624] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-[#8A8A85]">
                    <span>Progress</span>
                    <span className="text-[#A68E6A] font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-[#262624] h-1.5">
                    <div
                      className="bg-[#A68E6A] h-1.5 transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {[0, 25, 50, 75, 100].map((step) => (
                      <button
                        key={step}
                        onClick={() => handleUpdateProgress(goal.id, step)}
                        className={`text-[10px] font-mono px-2 py-0.5 border transition-colors ${
                          goal.progress === step
                            ? 'bg-[#A68E6A] text-[#0A0A0A] border-[#A68E6A] font-medium'
                            : 'bg-[#0A0A0A] text-[#8A8A85] border-[#262624] hover:bg-[#1C1C1A]'
                        }`}
                      >
                        {step}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: CONCRETE ACTIONS */}
      <div className="space-y-6">
        <div className="border-b border-[#262624] pb-2">
          <h2 className="font-serif text-xl font-medium text-[#E5E5E1]">
            Next Steps ({actions.filter((a) => a.status !== 'dismissed').length})
          </h2>
          <p className="text-xs text-[#8A8A85] font-serif mt-0.5">
            Small, tangible steps from your reflections.
          </p>
        </div>

        {/* Quick Add Action Form */}
        <form onSubmit={handleCreateAction} className="border border-[#262624] bg-[#141414] p-3 flex gap-2">
          <input
            type="text"
            value={newActionTitle}
            onChange={(e) => setNewActionTitle(e.target.value)}
            placeholder="Add an actionable next step..."
            className="flex-1 bg-[#0A0A0A] border border-[#262624] px-3 py-1.5 text-xs font-serif text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A]"
          />
          <input
            type="text"
            value={newActionDue}
            onChange={(e) => setNewActionDue(e.target.value)}
            placeholder="Due / Timing"
            className="w-28 bg-[#0A0A0A] border border-[#262624] px-2 py-1.5 text-xs font-mono text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A]"
          />
          <button
            type="submit"
            disabled={!newActionTitle.trim()}
            className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-3 py-1.5 text-xs font-mono uppercase tracking-wider font-medium transition-colors"
          >
            + Add
          </button>
        </form>

        {/* Actions List */}
        <div className="space-y-2">
          {actions
            .filter((a) => a.status !== 'dismissed')
            .map((act) => {
              const isDone = act.status === 'completed';
              return (
                <div
                  key={act.id}
                  className={`border ${
                    isDone ? 'border-[#262624] bg-[#111111]' : 'border-[#262624] bg-[#141414]'
                  } p-3 flex items-center justify-between gap-3 text-xs`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => handleUpdateActionStatus(act.id, isDone ? 'accepted' : 'completed')}
                      className={`w-4 h-4 border flex items-center justify-center font-mono text-[10px] ${
                        isDone
                          ? 'border-[#A68E6A] bg-[#A68E6A] text-[#0A0A0A] font-bold'
                          : 'border-[#8A8A85] bg-[#0A0A0A]'
                      }`}
                      title={isDone ? 'Mark active' : 'Mark complete'}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span
                      className={`font-serif ${
                        isDone ? 'line-through text-[#8A8A85]' : 'text-[#E5E5E1]'
                      }`}
                    >
                      {act.title}
                    </span>
                    {act.dueSuggestion && (
                      <span className="text-[10px] font-mono text-[#A68E6A] border border-[#262624] bg-[#0A0A0A] px-1 py-0.5">
                        {act.dueSuggestion}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <button
                      onClick={() => handleUpdateActionStatus(act.id, 'dismissed')}
                      className="text-[#8A8A85] hover:text-[#E5E5E1] transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleDeleteAction(act.id)}
                      className="text-[#8A8A85] hover:text-[#E5E5E1] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
