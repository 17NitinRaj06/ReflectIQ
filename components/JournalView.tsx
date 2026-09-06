'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  JournalEntry,
  JournalMessage,
  GeminiMode,
} from '@/types';
import {
  Trash2,
  PanelLeft,
  PanelRight,
  Sparkles,
  X,
  Send,
  Plus,
  Search,
  Check,
  ChevronRight,
  MessageSquare,
  Sparkle,
} from 'lucide-react';
import { ProfessionalNotice } from '@/components/ui/ProfessionalNotice';

interface JournalViewProps {
  initialJournalId?: string | null;
  onOpenAskJournal: () => void;
}

const MODES: { id: GeminiMode; label: string; desc: string }[] = [
  { id: 'reflect', label: 'Reflect', desc: 'Open-ended inquiry and thoughtful questions' },
  { id: 'brainstorm', label: 'Brainstorm', desc: 'Creative angles grounded in your writing' },
  { id: 'plan', label: 'Plan', desc: 'Distill reflection into concrete steps' },
  { id: 'review', label: 'Review', desc: 'Synthesize themes and cognitive shifts' },
  { id: 'problem_solve', label: 'Problem Solve', desc: 'Structured reasoning through a challenge' },
];

export function JournalView({ initialJournalId, onOpenAskJournal }: JournalViewProps) {
  const { idToken } = useAuth();

  // Primary state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [loadingJournals, setLoadingJournals] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editor state
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Deletion state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Panel visibility toggles (Show & Hide Reflections and Insights)
  const [showReflectionsList, setShowReflectionsList] = useState<boolean>(true);
  const [showIntelligencePanel, setShowIntelligencePanel] = useState<boolean>(false);

  // Copilot sidebar state (opens when requested, otherwise floating button in bottom corner)
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<GeminiMode>('reflect');
  const [promptInput, setPromptInput] = useState<string>('');
  const [isSendingPrompt, setIsSendingPrompt] = useState<boolean>(false);
  const [dialogueNotice, setDialogueNotice] = useState<string | null>(null);

  // Feedback notifications
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Auto-scroll ref for Copilot messages
  const copilotScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottomCopilot = useCallback((smooth = true) => {
    if (copilotScrollRef.current) {
      copilotScrollRef.current.scrollTo({
        top: copilotScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    if (isCopilotOpen && messages.length > 0) {
      const timer = setTimeout(() => scrollToBottomCopilot(true), 60);
      return () => clearTimeout(timer);
    }
  }, [isCopilotOpen, messages.length, scrollToBottomCopilot]);

  // Select a journal
  const selectJournal = useCallback(
    async (journal: JournalEntry) => {
      setSelectedJournal(journal);
      setTitle(journal.title || '');
      setContent(journal.content || '');
      setSaveStatus('saved');
      setDeleteConfirmId(null);

      if (!idToken) return;
      try {
        setLoadingMessages(true);
        const msgs = await apiClient.getMessages(idToken, journal.id);
        setMessages(msgs);
      } catch (err) {
        console.error('Failed to load messages for journal:', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    },
    [idToken]
  );

  // Create brand new reflection
  const handleCreateNew = useCallback(() => {
    const newId = 'jrnl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newEntry: JournalEntry = {
      id: newId,
      uid: '',
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedJournal(newEntry);
    setTitle('');
    setContent('');
    setMessages([]);
    setSaveStatus('saved');
    setDeleteConfirmId(null);
  }, []);

  // Initial load of journals
  useEffect(() => {
    let ignore = false;
    async function init() {
      if (!idToken) return;
      try {
        const list = await apiClient.getJournals(idToken);
        if (!ignore) {
          setJournals(list);
          if (list.length > 0) {
            const match = initialJournalId ? list.find((j) => j.id === initialJournalId) : null;
            const target = match || list[0]!;
            setSelectedJournal(target);
            setTitle(target.title || '');
            setContent(target.content || '');
            setSaveStatus('saved');
            const msgs = await apiClient.getMessages(idToken, target.id);
            if (!ignore) setMessages(msgs);
          } else {
            // Fresh blank canvas if no reflections exist
            handleCreateNew();
          }
        }
      } catch (err) {
        console.error('Failed to load journals:', err);
      } finally {
        if (!ignore) setLoadingJournals(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [idToken, initialJournalId, handleCreateNew]);

  // Save current writing surface
  const handleSaveWriting = async () => {
    if (!idToken || isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const finalTitle = title.trim() || 'Untitled Reflection';
      const finalContent = content.trim();
      const currentId = selectedJournal?.id || ('jrnl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6));

      const updated = await apiClient.updateJournal(idToken, currentId, {
        title: finalTitle,
        content: finalContent,
      });
      setSelectedJournal(updated);
      setJournals((prev) => [updated, ...prev.filter((j) => j.id !== updated.id)]);
      setSaveStatus('saved');
      setFeedbackNotice('Saved');
      setTimeout(() => setFeedbackNotice(null), 2500);
    } catch (err: any) {
      console.error('Failed to save reflection:', err);
      setSaveStatus('dirty');
      setFeedbackNotice('Could not save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete reflection
  const handleDeleteJournal = async (journalId: string) => {
    if (!idToken || isDeleting) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteJournal(idToken, journalId);
      const remaining = journals.filter((j) => j.id !== journalId);
      setJournals(remaining);

      if (selectedJournal?.id === journalId) {
        if (remaining.length > 0) {
          selectJournal(remaining[0]!);
        } else {
          handleCreateNew();
        }
      }
      setFeedbackNotice('Reflection deleted');
      setTimeout(() => setFeedbackNotice(null), 2500);
      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error('Failed to delete reflection:', err);
      setFeedbackNotice('Failed to delete reflection');
    } finally {
      setIsDeleting(false);
    }
  };

  // Send conversation inquiry to Gemini Copilot
  const handleSendPrompt = async (customPrompt?: string) => {
    const textToSend = (customPrompt || promptInput).trim();
    if (!textToSend || !idToken || isSendingPrompt) return;

    let currentJournalId = selectedJournal?.id;
    if (!currentJournalId) {
      currentJournalId = 'jrnl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    }

    const finalTitle = title.trim() || 'Untitled Reflection';
    const finalContent = content.trim();

    // Auto-save to guarantee active context is captured before querying Copilot
    try {
      const persisted = await apiClient.updateJournal(idToken, currentJournalId, {
        title: finalTitle,
        content: finalContent,
      });
      setSelectedJournal(persisted);
      setJournals((prev) => [persisted, ...prev.filter((j) => j.id !== persisted.id)]);
      setSaveStatus('saved');
    } catch (e) {
      console.warn('Auto-save prior to Copilot query:', e);
    }

    if (!customPrompt) {
      setPromptInput('');
    }
    setIsSendingPrompt(true);
    setDialogueNotice(null);

    // Optimistic user message
    const tempUserMsg: JournalMessage = {
      id: 'temp_' + Date.now(),
      journalId: currentJournalId,
      role: 'user',
      content: textToSend,
      mode: activeMode,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await apiClient.sendMessage(
        idToken,
        currentJournalId,
        textToSend,
        activeMode
      );

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        result.userMessage,
        result.assistantMessage,
      ]);

      if (result.extracted?.summary || result.extracted?.themes) {
        setSelectedJournal((prev) =>
          prev
            ? {
                ...prev,
                summary: result.extracted.summary || prev.summary,
                themes: result.extracted.themes || prev.themes,
              }
            : null
        );
      }
    } catch (err: any) {
      console.error('Copilot dialogue error:', err);
      setDialogueNotice(err);
    } finally {
      setIsSendingPrompt(false);
    }
  };

  // Accept a suggested action
  const handleAcceptAction = async (actionTitle: string, dueSuggestion?: string) => {
    if (!idToken) return;
    try {
      await apiClient.createAction(idToken, {
        title: actionTitle,
        journalId: selectedJournal?.id,
        dueSuggestion,
        status: 'accepted',
      });
      setFeedbackNotice(`Action created: "${actionTitle}"`);
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err) {
      setFeedbackNotice('Failed to record action item');
    }
  };

  // Save approved memory item
  const handleApproveMemory = async (content: string, category: 'goal' | 'project' | 'preference' | 'challenge') => {
    if (!idToken) return;
    try {
      await apiClient.saveMemory(idToken, {
        content,
        category,
        status: 'approved',
        sourceJournalId: selectedJournal?.id,
      });
      setFeedbackNotice(`Memory saved: "${content.slice(0, 32)}..."`);
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err) {
      setFeedbackNotice('Failed to save memory');
    }
  };

  // Filtered journals for the list
  const filteredJournals = journals.filter(
    (j) =>
      (j.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.themes?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Metadata from latest Copilot response
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const metadata = lastAssistantMessage?.metadata;

  return (
    <div className="flex-1 min-h-0 h-full flex flex-row overflow-hidden relative">
      {/* -------------------------------------------------------------
          LEFT COLUMN: Reflections Archive (Collapsible / Toggleable)
          ------------------------------------------------------------- */}
      {showReflectionsList && (
        <aside
          className="w-72 sm:w-80 flex-shrink-0 border-r border-[#262624] bg-[#0A0A0A] flex flex-col h-full min-h-0 overflow-hidden z-20"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#262624] space-y-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8A8A85]">
                Reflections ({journals.length})
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  id="new-reflection-btn"
                  onClick={handleCreateNew}
                  className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] text-xs px-2.5 py-1 font-mono uppercase tracking-wider transition-colors font-medium flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
                <button
                  onClick={() => setShowReflectionsList(false)}
                  className="text-[#8A8A85] hover:text-[#E5E5E1] p-1 transition-colors"
                  title="Hide reflections"
                  aria-label="Hide reflections"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter entries & tags..."
                className="w-full bg-[#141414] border border-[#262624] px-2.5 py-1 text-xs text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none focus:border-[#A68E6A] font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-xs text-[#8A8A85] hover:text-[#E5E5E1]"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* List of Reflections */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#262624]">
            {loadingJournals && (
              <div className="p-4 text-xs text-[#8A8A85] font-serif italic text-center">
                Loading reflections...
              </div>
            )}

            {!loadingJournals && filteredJournals.length === 0 && (
              <div className="p-6 text-center space-y-3">
                <p className="text-xs text-[#8A8A85] font-serif leading-relaxed">
                  No reflections recorded yet.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="text-xs border border-[#262624] bg-[#141414] hover:bg-[#1C1C1A] px-3 py-1.5 font-mono text-[#E5E5E1] transition-colors"
                >
                  + Write First Reflection
                </button>
              </div>
            )}

            {!loadingJournals &&
              filteredJournals.map((journal) => {
                const isSelected = selectedJournal?.id === journal.id;
                const isPendingDelete = deleteConfirmId === journal.id;
                const dateStr = journal.createdAt ? journal.createdAt.split('T')[0] : '';

                return (
                  <div
                    key={journal.id}
                    onClick={() => selectJournal(journal)}
                    className={`w-full text-left p-3 transition-colors cursor-pointer group relative ${
                      isSelected
                        ? 'bg-[#141414] border-l-2 border-l-[#A68E6A]'
                        : 'hover:bg-[#141414]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8A8A85] mb-1">
                      <span>{dateStr}</span>
                      <div className="flex items-center space-x-1.5">
                        {journal.themes && journal.themes[0] && (
                          <span className="text-[#A68E6A] truncate max-w-[80px]">
                            #{journal.themes[0]}
                          </span>
                        )}
                        {/* Quick delete icon button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(journal.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-[#8A8A85] p-0.5 transition-opacity"
                          title="Delete reflection"
                          aria-label="Delete reflection"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="font-serif text-sm font-medium text-[#E5E5E1] line-clamp-1 pr-4">
                      {journal.title || 'Untitled Reflection'}
                    </div>

                    <div className="text-xs text-[#8A8A85] font-serif line-clamp-2 mt-1 leading-relaxed">
                      {journal.content || 'Blank entry...'}
                    </div>

                    {/* Inline delete confirmation */}
                    {isPendingDelete && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 pt-2 border-t border-red-500/30 flex items-center justify-between bg-red-950/20 p-2"
                      >
                        <span className="text-[11px] font-mono text-red-400">
                          Delete entry?
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleDeleteJournal(journal.id)}
                            disabled={isDeleting}
                            className="px-2 py-0.5 text-[11px] font-mono bg-red-600 hover:bg-red-700 text-white transition-colors"
                          >
                            {isDeleting ? '...' : 'Yes, Delete'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 text-[11px] font-mono text-[#8A8A85] hover:text-[#E5E5E1]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------
          CENTER COLUMN: The Dedicated Writing Surface
          ------------------------------------------------------------- */}
      <main className="flex-1 min-w-0 min-h-0 h-full flex flex-col bg-[#0A0A0A] overflow-hidden">
        {/* Top Action Toolbar */}
        <div className="border-b border-[#262624] px-4 py-2.5 flex items-center justify-between bg-[#0A0A0A] flex-shrink-0">
          {/* Left panel toggles */}
          <div className="flex items-center space-x-2">
            <button
              id="toggle-reflections-btn"
              onClick={() => setShowReflectionsList(!showReflectionsList)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
                showReflectionsList
                  ? 'border-[#A68E6A] text-[#E5E5E1] bg-[#141414]'
                  : 'border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#383834] bg-[#0A0A0A]'
              }`}
              title={showReflectionsList ? 'Hide reflections list' : 'Show reflections list'}
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span>Reflections</span>
            </button>

            <button
              id="toggle-insights-btn"
              onClick={() => setShowIntelligencePanel(!showIntelligencePanel)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
                showIntelligencePanel
                  ? 'border-[#A68E6A] text-[#E5E5E1] bg-[#141414]'
                  : 'border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#383834] bg-[#0A0A0A]'
              }`}
              title={showIntelligencePanel ? 'Hide insights panel' : 'Show insights panel'}
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span>Insights</span>
            </button>

            <button
              id="toggle-copilot-header-btn"
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
                isCopilotOpen
                  ? 'border-[#A68E6A] text-[#E5E5E1] bg-[#141414]'
                  : 'border-[#262624] text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#383834] bg-[#0A0A0A]'
              }`}
              title={isCopilotOpen ? 'Close assistant sidebar' : 'Open assistant sidebar'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A68E6A]" />
              <span>Assistant</span>
            </button>
          </div>

          {/* Right actions: Save Status, Delete Reflection, Save button */}
          <div className="flex items-center space-x-3">
            <span className="font-mono text-[11px] uppercase hidden sm:inline">
              {saveStatus === 'saved' && <span className="text-[#A68E6A]">Saved</span>}
              {saveStatus === 'saving' && <span className="text-[#A68E6A]">Saving...</span>}
              {saveStatus === 'dirty' && <span className="text-[#8A8A85]">Unsaved changes</span>}
            </span>

            {/* Delete button with confirmation */}
            {deleteConfirmId === selectedJournal?.id ? (
              <div className="flex items-center space-x-1.5 bg-[#141414] border border-red-500/50 px-2 py-0.5">
                <span className="text-[11px] font-mono text-red-400">Delete?</span>
                <button
                  onClick={() => selectedJournal && handleDeleteJournal(selectedJournal.id)}
                  disabled={isDeleting}
                  className="px-2 py-0.5 text-xs font-mono bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  {isDeleting ? '...' : 'Yes'}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-2 py-0.5 text-xs font-mono text-[#8A8A85] hover:text-[#E5E5E1]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                id="delete-reflection-btn"
                onClick={() => selectedJournal && setDeleteConfirmId(selectedJournal.id)}
                disabled={!selectedJournal?.id || isDeleting}
                className="border border-[#262624] bg-[#141414] hover:border-red-500/40 text-[#8A8A85] hover:text-red-400 p-1.5 transition-colors"
                title="Delete this reflection"
                aria-label="Delete reflection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save button */}
            <button
              id="save-reflection-btn"
              onClick={handleSaveWriting}
              disabled={isSaving}
              className="border border-[#A68E6A] bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] px-3 py-1 font-mono text-xs uppercase tracking-wider transition-colors font-medium"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Feedback toast banner */}
        {feedbackNotice && (
          <div className="bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A] text-xs px-4 py-2 text-center font-mono transition-opacity flex-shrink-0">
            {feedbackNotice}
          </div>
        )}

        {/* Writing Canvas Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 md:p-12">
          <div className="max-w-3xl w-full mx-auto space-y-6">
            {/* The Page Sheet */}
            <div className="page-sheet bg-[#141414] border border-[#262624] p-6 sm:p-10 space-y-6">
              {/* Date banner */}
              <div className="border-b border-[#262624] pb-3 text-[11px] font-mono text-[#8A8A85] flex items-center justify-between">
                <span>
                  {selectedJournal?.createdAt
                    ? `DATE: ${new Date(selectedJournal.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`
                    : 'NEW REFLECTION'}
                </span>
                {selectedJournal?.updatedAt && (
                  <span className="text-[10px] text-[#5C5C58]">
                    Last modified {new Date(selectedJournal.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* Title input */}
              <input
                id="reflection-title-input"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus('dirty');
                }}
                placeholder="Title of this reflection..."
                className="w-full font-serif text-2xl sm:text-3xl font-medium text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none border-none bg-transparent p-0 tracking-tight"
              />

              {/* Long-form content textarea */}
              <textarea
                id="reflection-content-input"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setSaveStatus('dirty');
                }}
                rows={16}
                placeholder="Write freely. What are you thinking about, grappling with, or attempting to clarify? Assistant will ground its answers directly in what you write here..."
                className="w-full font-serif text-base sm:text-lg text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none border-none bg-transparent resize-none leading-relaxed p-0 min-h-[360px]"
              />

              {/* Themes & tags banner */}
              {selectedJournal?.themes && selectedJournal.themes.length > 0 && (
                <div className="pt-4 border-t border-[#262624] flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-[#8A8A85]">
                    Themes:
                  </span>
                  {selectedJournal.themes.map((theme, i) => (
                    <span
                      key={i}
                      className="text-xs font-serif bg-[#0A0A0A] text-[#A68E6A] border border-[#262624] px-2 py-0.5"
                    >
                      #{theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* -------------------------------------------------------------
          RIGHT COLUMN: Insights & Extracted Metadata Panel
          ------------------------------------------------------------- */}
      {showIntelligencePanel && (
        <aside className="w-72 sm:w-80 flex-shrink-0 border-l border-[#262624] bg-[#0A0A0A] h-full min-h-0 flex flex-col overflow-hidden z-20">
          <div className="flex items-center justify-between border-b border-[#262624] p-4 flex-shrink-0">
            <h4 className="font-serif text-sm font-medium text-[#E5E5E1]">
              Reflection Insights
            </h4>
            <button
              onClick={() => setShowIntelligencePanel(false)}
              className="text-[#8A8A85] hover:text-[#E5E5E1] p-1 transition-colors"
              title="Close insights"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {/* Quick search CTA */}
            <div className="border border-[#262624] bg-[#141414] p-3 space-y-2">
              <div className="text-xs font-medium text-[#A68E6A]">
                Search Past Entries
              </div>
              <p className="text-xs font-serif text-[#8A8A85] leading-relaxed">
                Semantic search across your past writings and recurring threads.
              </p>
              <button
                onClick={onOpenAskJournal}
                className="w-full border border-[#262624] bg-[#0A0A0A] hover:bg-[#1C1C1A] py-1.5 text-xs font-mono text-[#E5E5E1] transition-colors text-center block"
              >
                Ask My Journal
              </button>
            </div>

            {/* Summary */}
            {selectedJournal?.summary && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Summary
                </span>
                <p className="text-xs font-serif text-[#E5E5E1] bg-[#141414] p-3 border border-[#262624] leading-relaxed">
                  {selectedJournal.summary}
                </p>
              </div>
            )}

            {/* Pattern Notice if detected */}
            {metadata?.detectedPatternNotice && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-[#A68E6A]">
                  Pattern
                </span>
                <div className="text-xs font-serif text-[#E5E5E1] bg-[#141414] p-3 border border-[#262624] border-l-2 border-l-[#A68E6A] leading-relaxed">
                  {metadata.detectedPatternNotice}
                </div>
              </div>
            )}

            {/* Suggested Actions */}
            {metadata?.suggestedActions && metadata.suggestedActions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Suggested Actions
                </span>
                <div className="space-y-2">
                  {metadata.suggestedActions.map((act, i) => (
                    <div
                      key={i}
                      className="bg-[#141414] border border-[#262624] p-2.5 text-xs space-y-1"
                    >
                      <div className="font-serif text-[#E5E5E1]">{act.title}</div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-mono text-[#8A8A85]">
                          {act.dueSuggestion || 'Next step'}
                        </span>
                        <button
                          onClick={() => handleAcceptAction(act.title, act.dueSuggestion)}
                          className="text-[10px] font-mono text-[#A68E6A] hover:underline"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Proposals */}
            {metadata?.proposedMemories && metadata.proposedMemories.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[#8A8A85]">
                  Suggested Memories
                </span>
                <div className="space-y-2">
                  {metadata.proposedMemories.map((mem, i) => (
                    <div
                      key={i}
                      className="bg-[#141414] border border-[#262624] p-2.5 text-xs space-y-1"
                    >
                      <div className="font-mono text-[10px] uppercase text-[#A68E6A]">
                        [{mem.category}]
                      </div>
                      <div className="font-serif text-[#E5E5E1]">{mem.content}</div>
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handleApproveMemory(mem.content, mem.category)}
                          className="text-[10px] font-mono text-[#A68E6A] hover:underline"
                        >
                          Remember this
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty insights helper if none generated yet */}
            {!selectedJournal?.summary && !metadata?.suggestedActions?.length && (
              <div className="text-center p-4 border border-[#262624] bg-[#141414] space-y-2">
                <p className="text-xs text-[#8A8A85] font-serif leading-relaxed">
                  As you write and converse with Assistant, automated summaries, themes, and suggested actions appear here.
                </p>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------
          ASSISTANT SIDEBAR (Slide-over / Docked browser-style copilot)
          ------------------------------------------------------------- */}
      {isCopilotOpen && (
        <aside
          className="w-full sm:w-96 lg:w-[420px] flex-shrink-0 border-l border-[#262624] bg-[#0A0A0A] h-full flex flex-col min-h-0 z-30 shadow-2xl absolute right-0 top-0 bottom-0 sm:relative"
        >
          {/* Copilot Header */}
          <div className="border-b border-[#262624] p-3.5 bg-[#0A0A0A] flex-shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#A68E6A]" />
                <span className="font-serif text-sm font-medium text-[#E5E5E1]">
                  ReflectIQ Assistant
                </span>
              </div>
              <div className="flex items-center space-x-1">
                {/* Mode Selector Dropdown */}
                <select
                  id="copilot-mode-select"
                  value={activeMode}
                  onChange={(e) => setActiveMode(e.target.value as GeminiMode)}
                  className="bg-[#141414] border border-[#262624] px-2 py-1 text-xs font-mono text-[#A68E6A] focus:outline-none focus:border-[#A68E6A] cursor-pointer"
                >
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#141414] text-[#E5E5E1]">
                      {m.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsCopilotOpen(false)}
                  className="text-[#8A8A85] hover:text-[#E5E5E1] p-1 transition-colors"
                  title="Close Assistant"
                  aria-label="Close copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Reference badge (showing grounded tab context) */}
            <div className="bg-[#141414] border border-[#262624] px-2.5 py-1.5 flex items-center justify-between text-[11px] text-[#8A8A85] font-mono">
              <span className="truncate mr-2">
                Context: <strong className="text-[#E5E5E1] font-normal">{title || 'Untitled Reflection'}</strong>
              </span>
              <span className="text-[10px] text-[#A68E6A] whitespace-nowrap uppercase">
                Active Tab
              </span>
            </div>
          </div>

          {/* Copilot Messages Thread */}
          <div
            ref={copilotScrollRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
          >
            {/* Empty dialogue: Starter suggestions */}
            {messages.length === 0 && !loadingMessages && (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-1">
                  <p className="text-xs font-serif text-[#8A8A85] leading-relaxed">
                    Assistant is grounded in your active reflection above. Ask questions, explore tensions, or try a prompt:
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleSendPrompt('What blind spots or unexamined assumptions exist in this reflection?')}
                    disabled={isSendingPrompt}
                    className="w-full text-left p-2.5 border border-[#262624] bg-[#141414] hover:bg-[#1C1C1A] text-xs font-serif text-[#E5E5E1] transition-colors space-y-1 block group"
                  >
                    <div className="text-[10px] font-mono uppercase text-[#A68E6A] flex items-center justify-between">
                      <span>Inquiry</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>What blind spots or unexamined assumptions exist here?</div>
                  </button>

                  <button
                    onClick={() => handleSendPrompt('Help me distill 3 realistic, concrete next steps from this entry.')}
                    disabled={isSendingPrompt}
                    className="w-full text-left p-2.5 border border-[#262624] bg-[#141414] hover:bg-[#1C1C1A] text-xs font-serif text-[#E5E5E1] transition-colors space-y-1 block group"
                  >
                    <div className="text-[10px] font-mono uppercase text-[#A68E6A] flex items-center justify-between">
                      <span>Action</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>Help me distill 3 realistic, concrete next steps.</div>
                  </button>

                  <button
                    onClick={() => handleSendPrompt('Reflect back the underlying emotional tension and recurring theme in this reflection.')}
                    disabled={isSendingPrompt}
                    className="w-full text-left p-2.5 border border-[#262624] bg-[#141414] hover:bg-[#1C1C1A] text-xs font-serif text-[#E5E5E1] transition-colors space-y-1 block group"
                  >
                    <div className="text-[10px] font-mono uppercase text-[#A68E6A] flex items-center justify-between">
                      <span>Synthesis</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <div>Reflect back the underlying emotional tension and theme.</div>
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`border ${
                    isUser
                      ? 'border-[#262624] bg-[#141414] ml-4'
                      : 'border-[#262624] border-l-2 border-l-[#A68E6A] bg-[#141414] mr-2'
                  } p-3.5 space-y-2.5`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono border-b border-[#262624] pb-1.5">
                    <span
                      className={`uppercase tracking-wider ${
                        isUser ? 'text-[#8A8A85]' : 'text-[#A68E6A] font-medium'
                      }`}
                    >
                      {isUser ? 'You' : 'Assistant'}
                    </span>
                    <div className="flex items-center space-x-1.5 text-[#8A8A85]">
                      {msg.mode && <span>[{msg.mode.toUpperCase()}]</span>}
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                  </div>

                  <div className="font-serif text-xs sm:text-sm text-[#E5E5E1] leading-relaxed whitespace-pre-line">
                    {msg.content}
                  </div>

                  {/* Grounded pattern notice */}
                  {msg.metadata?.detectedPatternNotice && (
                    <div className="border-t border-[#262624] pt-2 text-[11px] font-serif text-[#A68E6A] italic">
                      {msg.metadata.detectedPatternNotice}
                    </div>
                  )}

                  {/* Actions inside message */}
                  {msg.metadata?.suggestedActions && msg.metadata.suggestedActions.length > 0 && (
                    <div className="border-t border-[#262624] pt-2 space-y-1">
                      <div className="text-[10px] uppercase font-mono text-[#8A8A85]">
                        Suggested Action
                      </div>
                      {msg.metadata.suggestedActions.map((act, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-[#0A0A0A] border border-[#262624] p-1.5 text-xs"
                        >
                          <span className="font-serif text-[#E5E5E1] truncate mr-2">{act.title}</span>
                          <button
                            onClick={() => handleAcceptAction(act.title, act.dueSuggestion)}
                            className="text-[10px] font-mono text-[#A68E6A] hover:underline whitespace-nowrap"
                          >
                            + Add
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Memories inside message */}
                  {msg.metadata?.proposedMemories && msg.metadata.proposedMemories.length > 0 && (
                    <div className="border-t border-[#262624] pt-2 space-y-1">
                      <div className="text-[10px] uppercase font-mono text-[#8A8A85]">
                        Suggested Memory
                      </div>
                      {msg.metadata.proposedMemories.map((mem, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-[#0A0A0A] border border-[#262624] p-1.5 text-xs"
                        >
                          <span className="font-serif text-[#E5E5E1] truncate mr-2">
                            <span className="font-mono text-[9px] uppercase text-[#A68E6A] mr-1">
                              [{mem.category}]
                            </span>
                            {mem.content}
                          </span>
                          <button
                            onClick={() => handleApproveMemory(mem.content, mem.category)}
                            className="text-[10px] font-mono text-[#A68E6A] hover:underline whitespace-nowrap"
                          >
                            + Remember
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {isSendingPrompt && (
              <div className="border border-[#262624] bg-[#141414] p-3.5 text-xs font-serif italic text-[#8A8A85] flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-[#A68E6A] animate-spin" />
                <span>Assistant is reasoning through your reflection...</span>
              </div>
            )}

            {dialogueNotice && (
              <ProfessionalNotice
                error={dialogueNotice}
                onRetry={() => handleSendPrompt()}
                onDismiss={() => setDialogueNotice(null)}
              />
            )}
          </div>

          {/* Copilot Input Box */}
          <div className="border-t border-[#262624] p-3 bg-[#0A0A0A] flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="border border-[#262624] bg-[#141414] p-2.5 space-y-2"
            >
              <textarea
                id="copilot-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isSendingPrompt && promptInput.trim()) {
                      handleSendPrompt();
                    }
                  }
                }}
                rows={2}
                placeholder={`Ask Assistant in ${MODES.find((m) => m.id === activeMode)?.label} mode... (Enter to send)`}
                className="w-full font-serif text-xs sm:text-sm text-[#E5E5E1] placeholder-[#5C5C58] focus:outline-none border-none bg-transparent resize-none leading-relaxed p-0"
              />

              <div className="flex items-center justify-between pt-2 border-t border-[#262624]">
                <span className="text-[10px] text-[#8A8A85] font-serif truncate mr-2">
                  Grounded in open reflection
                </span>
                <button
                  id="copilot-send-btn"
                  type="submit"
                  disabled={isSendingPrompt || !promptInput.trim()}
                  className="bg-[#A68E6A] text-[#0A0A0A] hover:bg-[#BFAB88] disabled:opacity-40 px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors font-medium flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </aside>
      )}

      {/* -------------------------------------------------------------
          FLOATING ASSISTANT BUTTON (Down in the corner when sidebar is closed)
          ------------------------------------------------------------- */}
      {!isCopilotOpen && (
        <button
          id="open-copilot-floating-btn"
          onClick={() => setIsCopilotOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#141414] hover:bg-[#1C1C1A] text-[#E5E5E1] border border-[#A68E6A] shadow-2xl px-4 py-2.5 flex items-center space-x-2.5 transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
          title="Open ReflectIQ Assistant"
        >
          <Sparkles className="w-4 h-4 text-[#A68E6A] group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-mono font-medium tracking-wide">Ask Assistant</span>
          {messages.length > 0 && (
            <span className="text-[10px] bg-[#A68E6A] text-[#0A0A0A] px-1.5 py-0.2 font-mono font-bold">
              {messages.length}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
