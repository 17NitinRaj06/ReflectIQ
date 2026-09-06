'use client';

import React from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

export type ActiveTab =
  | 'journal'
  | 'patterns'
  | 'goals'
  | 'memory'
  | 'weekly'
  | 'privacy';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAskJournal: () => void;
}

export function Navbar({ activeTab, onSelectTab, onOpenAskJournal }: NavbarProps) {
  const { profile, logout, isDemoUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-[#262624] bg-[#0A0A0A] sticky top-0 z-30 flex-shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <button
            id="brand-logo-btn"
            onClick={() => onSelectTab('journal')}
            className="text-left font-serif text-lg tracking-tight font-medium italic text-[#E5E5E1] hover:text-[#A68E6A] transition-colors"
          >
            ReflectIQ
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <button
              id="nav-journal-btn"
              onClick={() => onSelectTab('journal')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'journal'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Reflection
            </button>
            <button
              id="nav-patterns-btn"
              onClick={() => onSelectTab('patterns')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'patterns'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Patterns
            </button>
            <button
              id="nav-goals-btn"
              onClick={() => onSelectTab('goals')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'goals'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Goals & Actions
            </button>
            <button
              id="nav-memory-btn"
              onClick={() => onSelectTab('memory')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'memory'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Memory
            </button>
            <button
              id="nav-weekly-btn"
              onClick={() => onSelectTab('weekly')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'weekly'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Weekly Review
            </button>
            <button
              id="nav-privacy-btn"
              onClick={() => onSelectTab('privacy')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]'
                  : 'text-[#8A8A85] hover:text-[#E5E5E1] hover:bg-[#141414]'
              }`}
            >
              Privacy & Export
            </button>
          </nav>
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Light / Dark Mode Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={toggleTheme}
            className="border border-[#262624] bg-[#141414] p-1.5 text-xs text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#A68E6A] transition-colors flex items-center justify-center"
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#A68E6A]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#A68E6A]" />
            )}
          </button>

          {/* Ask My Journal quick search */}
          <button
            id="nav-ask-journal-trigger"
            onClick={onOpenAskJournal}
            className="border border-[#262624] bg-[#141414] px-3 py-1 text-xs text-[#E5E5E1] hover:border-[#A68E6A] transition-colors rounded-none font-sans flex items-center"
            title="Search past entries"
          >
            <span className="font-serif italic font-medium">Ask My Journal</span>
          </button>

          {/* User profile identifier & sign out */}
          <div className="flex items-center space-x-2 pl-2 border-l border-[#262624]">
            <span
              className="text-xs text-[#8A8A85] hidden sm:inline max-w-[140px] truncate"
              title={profile?.email || profile?.displayName || ''}
            >
              {profile?.displayName || profile?.email || 'Writer'}
            </span>
            {isDemoUser && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 border border-[#262624] text-[#A68E6A] bg-[#141414]">
                Demo
              </span>
            )}
            <button
              id="nav-sign-out-btn"
              onClick={logout}
              className="text-xs text-[#8A8A85] hover:text-[#E5E5E1] px-2 py-1 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation bar */}
      <div className="flex md:hidden border-t border-[#262624] px-2 py-1 overflow-x-auto gap-1 text-xs bg-[#0A0A0A]">
        <button
          onClick={() => onSelectTab('journal')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'journal' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Reflection
        </button>
        <button
          onClick={() => onSelectTab('patterns')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'patterns' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Patterns
        </button>
        <button
          onClick={() => onSelectTab('goals')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'goals' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Goals
        </button>
        <button
          onClick={() => onSelectTab('memory')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'memory' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Memory
        </button>
        <button
          onClick={() => onSelectTab('weekly')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'weekly' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Weekly
        </button>
        <button
          onClick={() => onSelectTab('privacy')}
          className={`px-2.5 py-1 whitespace-nowrap ${activeTab === 'privacy' ? 'bg-[#141414] text-[#E5E5E1] border-b border-[#A68E6A]' : 'text-[#8A8A85]'}`}
        >
          Privacy
        </button>
      </div>
    </header>
  );
}
