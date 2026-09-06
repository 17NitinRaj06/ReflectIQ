'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

export function LandingPage() {
  const { signInWithGoogle, signInDemoMode, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    setErrorNotice(null);
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Popup sign in notice:', err);
      setErrorNotice(
        'Google popup sign-in could not complete in this frame window. You can use the direct interactive demo mode below to explore the complete reflection loop.'
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDemoSignIn = async () => {
    setErrorNotice(null);
    setIsSigningIn(true);
    try {
      await signInDemoMode();
    } catch (err: any) {
      setErrorNotice('Unable to initialize guest session. Please retry.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0A0A0A] text-[#E5E5E1] flex flex-col justify-between overflow-hidden transition-colors duration-200">
      {/* Top minimal header */}
      <header className="border-b border-[#262624] py-3.5 px-6 max-w-5xl mx-auto w-full flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="font-serif text-xl font-medium tracking-tight italic text-[#E5E5E1]">ReflectIQ</div>
          <span className="text-xs text-[#8A8A85] font-mono hidden sm:inline">Personal Reflection Intelligence</span>
        </div>
        <div className="flex items-center space-x-3">
          {/* Header Theme Toggle */}
          <button
            id="landing-header-theme-toggle-btn"
            onClick={toggleTheme}
            className="border border-[#262624] bg-[#141414] px-2.5 py-1 text-xs text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#A68E6A] transition-colors flex items-center space-x-1.5"
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-[#A68E6A]" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-[#A68E6A]" />
            )}
            <span className="font-mono text-[11px] capitalize">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </div>
      </header>

      {/* Main content hero - Centered in viewport without scrolling */}
      <main className="max-w-3xl mx-auto px-6 py-4 flex-1 flex flex-col justify-center w-full min-h-0">
        <div className="space-y-5">
          {/* Core Product Title */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-[#A68E6A] font-mono">
              Personal Reflection
            </p>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-[#E5E5E1] leading-tight">
              Write. Reflect. Notice what keeps coming up.
            </h1>

            <p className="text-sm sm:text-base text-[#8A8A85] leading-relaxed font-serif max-w-2xl">
              A quiet space to write long-form thoughts, talk them through with guidance,
              and discover recurring themes, shifts in focus, and clear next steps over time.
            </p>
          </div>

          {/* Authentication Call-to-Action in Hero Section */}
          <div className="pt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn || loading}
                className="bg-[#E5E5E1] text-[#0A0A0A] hover:bg-[#FFFFFF] px-5 py-2.5 text-sm font-medium tracking-wide rounded-none transition-colors flex items-center justify-center space-x-2.5 shadow-none border border-[#E5E5E1] cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>

              <button
                id="demo-mode-btn"
                onClick={handleDemoSignIn}
                disabled={isSigningIn || loading}
                className="border border-[#262624] bg-[#141414] text-[#E5E5E1] hover:border-[#A68E6A] hover:bg-[#1C1C1A] px-4 py-2.5 text-sm font-medium tracking-wide rounded-none transition-colors text-center cursor-pointer"
              >
                Explore Demo Session
              </button>

              {/* Quick theme toggle right beside sign-in options */}
              <button
                id="landing-signin-theme-toggle-btn"
                onClick={toggleTheme}
                className="border border-[#262624] bg-[#141414] text-[#8A8A85] hover:text-[#E5E5E1] hover:border-[#A68E6A] hover:bg-[#1C1C1A] px-3 py-2.5 text-xs font-mono tracking-wide rounded-none transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-[#A68E6A]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#A68E6A]" />
                )}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
            </div>

            {errorNotice && (
              <div className="p-2.5 border border-[#262624] bg-[#141414] text-xs text-[#E5E5E1] leading-relaxed">
                {errorNotice}
              </div>
            )}
          </div>

          {/* The Product Loop - Compact Flow */}
          <div className="pt-4 border-t border-[#262624]">
            <div className="text-[10px] uppercase tracking-wider text-[#8A8A85] font-mono mb-2">
              Continuous Product Loop
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-serif text-[#E5E5E1]">
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">WRITE</span>
              <span className="text-[#8A8A85] text-[10px]">&rarr;</span>
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">REFLECT</span>
              <span className="text-[#8A8A85] text-[10px]">&rarr;</span>
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">UNDERSTAND</span>
              <span className="text-[#8A8A85] text-[10px]">&rarr;</span>
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">DISCOVER PATTERNS</span>
              <span className="text-[#8A8A85] text-[10px]">&rarr;</span>
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">SET GOALS</span>
              <span className="text-[#8A8A85] text-[10px]">&rarr;</span>
              <span className="font-medium bg-[#141414] px-2 py-0.5 border border-[#262624]">TAKE ACTION</span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="pt-3 border-t border-[#262624] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-[#8A8A85] leading-relaxed">
            <div>
              <span className="font-medium text-[#E5E5E1] block mb-0.5">Your data stays yours</span>
              Reflections, memories, and patterns belong strictly to you and remain private.
            </div>
            <div>
              <span className="font-medium text-[#E5E5E1] block mb-0.5">Thoughtful &amp; intentional</span>
              An intentional space to think clearly and notice patterns over time.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#262624] py-3 px-6 max-w-5xl mx-auto w-full flex flex-row items-center justify-between text-[11px] text-[#8A8A85] flex-shrink-0">
        <div>ReflectIQ &middot; Personal Reflection Intelligence</div>
        <div className="font-mono text-[10px] text-[#5C5C58]">Private &middot; Thoughtful &middot; Intentional</div>
      </footer>
    </div>
  );
}
