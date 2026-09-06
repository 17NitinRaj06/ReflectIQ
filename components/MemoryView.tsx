'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import { MemoryItem, MemoryCategory } from '@/types';

const CATEGORIES: { id: MemoryCategory; label: string; desc: string }[] = [
  { id: 'goal', label: 'Goals', desc: 'Long-term aspirations and targets' },
  { id: 'project', label: 'Projects', desc: 'Active initiatives and builds' },
  { id: 'preference', label: 'Preferences', desc: 'Thinking habits, cadences, and styles' },
  { id: 'challenge', label: 'Challenges', desc: 'Known cognitive frictions and obstacles' },
];

export function MemoryView() {
  const { idToken } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // New memory item form
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('project');
  const [isAdding, setIsAdding] = useState(false);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const loadMemories = useCallback(async () => {
    if (!idToken) return;
    try {
      const list = await apiClient.getMemories(idToken);
      setMemories(list);
    } catch (err: any) {
      console.error('Failed to load memory items:', err);
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!idToken) return;
      try {
        const list = await apiClient.getMemories(idToken);
        if (!ignore) setMemories(list);
      } catch (err: any) {
        console.error('Failed to load memory items:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [idToken]);

  const handleAddManualMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || !idToken || isAdding) return;

    setIsAdding(true);
    try {
      const created = await apiClient.saveMemory(idToken, {
        content: newContent.trim(),
        category: newCategory,
        status: 'approved',
      });
      setMemories((prev) => [created, ...prev]);
      setNewContent('');
      setNotice('Memory item added.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to add memory');
    } finally {
      setIsAdding(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!idToken) return;
    try {
      const updated = await apiClient.updateMemory(idToken, id, { status: 'approved' });
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setNotice('Memory approved.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to approve memory');
    }
  };

  const handleDismiss = async (id: string) => {
    if (!idToken) return;
    try {
      const updated = await apiClient.updateMemory(idToken, id, { status: 'dismissed' });
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch (err) {
      setNotice('Failed to dismiss memory');
    }
  };

  const handleDelete = async (id: string) => {
    if (!idToken) return;
    try {
      await apiClient.deleteMemory(idToken, id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      setNotice('Memory deleted.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to delete memory');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!idToken || !editingContent.trim()) return;
    try {
      const updated = await apiClient.updateMemory(idToken, id, { content: editingContent.trim() });
      setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
      setEditingContent('');
      setNotice('Memory updated.');
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      setNotice('Failed to update memory');
    }
  };

  const handleClearAll = async () => {
    if (!idToken) return;
    if (!window.confirm('Are you sure you want to clear all stored memories? This cannot be undone.')) {
      return;
    }
    try {
      await apiClient.clearAllMemories(idToken);
      setMemories([]);
      setNotice('All memory records cleared.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice('Failed to clear memories');
    }
  };

  const pendingMemories = memories.filter((m) => m.status === 'pending');
  const approvedMemories = memories.filter((m) => m.status === 'approved');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262624] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-medium text-[#E5E5E1] tracking-tight">
            Memory
          </h1>
          <p className="text-sm font-serif text-[#8A8A85] mt-1 max-w-xl leading-relaxed">
            What ReflectIQ remembers about you across reflections. Nothing is ever remembered without your explicit approval.
          </p>
        </div>

        {approvedMemories.length > 0 && (
          <button
            onClick={handleClearAll}
            className="border border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#1C1C1A] px-3 py-1.5 text-xs font-mono uppercase tracking-wider self-start transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {notice && (
        <div className="p-3 border border-[#262624] bg-[#141414] text-xs font-mono text-[#E5E5E1]">
          {notice}
        </div>
      )}

      {/* SECTION: PENDING PROPOSALS */}
      {pendingMemories.length > 0 && (
        <div className="border border-[#A68E6A] bg-[#141414] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#A68E6A] font-semibold">
              Suggested memories ({pendingMemories.length})
            </span>
            <span className="text-xs text-[#8A8A85] font-serif">Needs your review</span>
          </div>

          <div className="space-y-3">
            {pendingMemories.map((item) => (
              <div
                key={item.id}
                className="bg-[#0A0A0A] border border-[#262624] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <span className="font-mono text-[10px] uppercase text-[#A68E6A] mr-2">
                    [{item.category}]
                  </span>
                  <span className="font-serif text-sm text-[#E5E5E1]">{item.content}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-3 py-1 text-xs font-medium transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDismiss(item.id)}
                    className="border border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#1C1C1A] px-3 py-1 text-xs transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: ADD MANUAL MEMORY */}
      <form onSubmit={handleAddManualMemory} className="border border-[#262624] bg-[#141414] p-5 space-y-3">
        <div className="text-xs font-mono uppercase text-[#8A8A85]">
          Add a memory
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
            className="bg-[#0A0A0A] border border-[#262624] px-2.5 py-1.5 text-xs font-mono text-[#E5E5E1] focus:outline-none focus:border-[#A68E6A]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.id})
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. Current writing schedule is 7:00am - 9:00am daily."
            className="flex-1 bg-[#0A0A0A] border border-[#262624] px-3 py-1.5 text-xs font-serif text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A]"
          />
          <button
            type="submit"
            disabled={isAdding || !newContent.trim()}
            className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-4 py-1.5 text-xs font-mono uppercase tracking-wider font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </form>

      {/* SECTION: STORED MEMORIES BY CATEGORY */}
      <div className="space-y-8">
        <h2 className="font-serif text-xl font-medium text-[#E5E5E1] border-b border-[#262624] pb-2">
          Saved memories ({approvedMemories.length})
        </h2>

        {loading && (
          <div className="py-8 text-center text-xs font-serif italic text-[#8A8A85]">
            Loading memory store...
          </div>
        )}

        {!loading && approvedMemories.length === 0 && (
          <div className="border border-[#262624] bg-[#141414] p-8 text-center text-sm font-serif text-[#8A8A85]">
            No saved memories yet. Add something you want ReflectIQ to keep in mind, or approve suggestions from your reflections.
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATEGORIES.map((cat) => {
              const catItems = approvedMemories.filter((m) => m.category === cat.id);
              return (
                <div key={cat.id} className="border border-[#262624] bg-[#141414] p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#262624] pb-2">
                    <div>
                      <h3 className="font-serif text-base font-medium text-[#E5E5E1]">
                        {cat.label}
                      </h3>
                      <p className="text-[11px] font-mono text-[#8A8A85]">{cat.desc}</p>
                    </div>
                    <span className="font-mono text-xs text-[#8A8A85]">({catItems.length})</span>
                  </div>

                  {catItems.length === 0 ? (
                    <p className="text-xs font-serif italic text-[#8A8A85] py-2">
                      No {cat.label.toLowerCase()} stored.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#0A0A0A] border border-[#262624] p-3 space-y-2 text-xs"
                        >
                          {editingId === item.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full bg-[#141414] border border-[#262624] p-2 text-xs font-serif text-[#E5E5E1] focus:outline-none focus:border-[#A68E6A]"
                                rows={2}
                              />
                              <div className="flex justify-end gap-2 font-mono text-[10px]">
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-2 py-1 font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="border border-[#262624] px-2 py-1 text-[#8A8A85] hover:text-[#E5E5E1]"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-serif text-[#E5E5E1] leading-relaxed">
                                {item.content}
                              </p>
                              <div className="flex items-center justify-end space-x-3 pt-2 font-mono text-[10px] text-[#8A8A85]">
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditingContent(item.content);
                                  }}
                                  className="hover:text-[#E5E5E1] transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="hover:text-[#E5E5E1] transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
