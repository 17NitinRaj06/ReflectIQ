'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { Navbar, ActiveTab } from './Navbar';
import { LandingPage } from './LandingPage';
import { JournalView } from './JournalView';
import { PatternsView } from './PatternsView';
import { GoalsView } from './GoalsView';
import { MemoryView } from './MemoryView';
import { WeeklyReviewView } from './WeeklyReviewView';
import { PrivacyView } from './PrivacyView';
import { AskJournalModal } from './AskJournalModal';

export function AppShell() {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [isAskJournalOpen, setIsAskJournalOpen] = useState(false);

  // Loading state (guaranteed to match on server and initial client render)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-[#E5E5E1]">
        <div className="font-serif text-2xl font-medium tracking-tight mb-2 text-[#E5E5E1]">ReflectIQ</div>
        <div className="text-xs font-mono text-[#8A8A85] italic">
          Initializing thinking surface...
        </div>
      </div>
    );
  }

  // Pre-auth landing page: No journal data or app chrome visible pre-auth
  if (!profile) {
    return <LandingPage />;
  }

  // Authenticated app experience
  return (
    <div className="h-screen w-full overflow-hidden bg-[#0A0A0A] text-[#E5E5E1] flex flex-col font-sans antialiased">
      {/* Editorial Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
        }}
        onOpenAskJournal={() => setIsAskJournalOpen(true)}
      />

      {/* Main Viewport */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'journal' && (
          <JournalView
            initialJournalId={selectedJournalId}
            onOpenAskJournal={() => setIsAskJournalOpen(true)}
          />
        )}

        {activeTab === 'patterns' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PatternsView
              onSelectJournal={(id) => {
                setSelectedJournalId(id);
                setActiveTab('journal');
              }}
            />
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <GoalsView />
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MemoryView />
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <WeeklyReviewView />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <PrivacyView />
          </div>
        )}
      </div>

      {/* Global RAG Semantic Search Modal */}
      <AskJournalModal
        isOpen={isAskJournalOpen}
        onClose={() => setIsAskJournalOpen(false)}
        onSelectJournal={(id) => {
          setSelectedJournalId(id);
          setActiveTab('journal');
        }}
      />
    </div>
  );
}
