'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth, googleProvider } from './config';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  idToken: string | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithGoogle: () => Promise<void>;
  signInDemoMode: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  idToken: null,
  loading: true,
  isDemoUser: false,
  signInWithGoogle: async () => {},
  signInDemoMode: async () => {},
  logout: async () => {},
  refreshToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    // Asynchronously verify local demo session on client mount
    const demoTimeout = setTimeout(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem('reflectiq_demo_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.uid && !auth.currentUser) {
            setProfile({
              uid: parsed.uid,
              email: parsed.email || 'demo.writer@reflectiq.internal',
              displayName: parsed.displayName || 'Demo Journaler',
              photoURL: null,
              createdAt: parsed.createdAt || new Date().toISOString(),
              memoryEnabled: true,
            });
            setIdToken(`DEMO_BEARER_${parsed.uid}`);
            setIsDemoUser(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('Error reading demo user from localStorage:', err);
      }
    }, 0);

    // Subscribe to Firebase Auth
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      if (!active) return;
      clearTimeout(demoTimeout);
      setUser(currentUser);
      if (currentUser) {
        setIsDemoUser(false);
        try {
          localStorage.removeItem('reflectiq_demo_user');
        } catch {}

        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName || 'Reflective Writer',
            photoURL: currentUser.photoURL,
            createdAt: currentUser.metadata.creationTime || new Date().toISOString(),
            memoryEnabled: true,
          });
        } catch (err) {
          console.error('Error fetching token:', err);
          setIdToken(null);
        }
      } else {
        const savedDemo = (() => {
          try {
            return localStorage.getItem('reflectiq_demo_user');
          } catch {
            return null;
          }
        })();

        if (!savedDemo) {
          setIdToken(null);
          setProfile(null);
          setIsDemoUser(false);
        }
      }
      setLoading(false);
    });

    return () => {
      active = false;
      clearTimeout(demoTimeout);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google Sign-in popup error (might be iframe blocked):', err);
      // Attempt anonymous auth or fallback
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInDemoMode = useCallback(async () => {
    setLoading(true);
    try {
      // First attempt anonymous sign-in through Firebase Auth
      let uid = 'demo_user_1079693146736';
      try {
        const anon = await signInAnonymously(auth);
        if (anon.user) {
          uid = anon.user.uid;
        }
      } catch (e) {
        // Fallback for isolated preview sandboxes
        uid = 'demo_' + Math.random().toString(36).substring(2, 10);
      }

      const demoProfile: UserProfile = {
        uid,
        email: 'demo.writer@reflectiq.internal',
        displayName: 'Guest Journaler',
        photoURL: null,
        createdAt: new Date().toISOString(),
        memoryEnabled: true,
      };

      localStorage.setItem('reflectiq_demo_user', JSON.stringify(demoProfile));
      setIsDemoUser(true);
      setProfile(demoProfile);
      setIdToken(`DEMO_BEARER_${uid}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem('reflectiq_demo_user');
    setIsDemoUser(false);
    setUser(null);
    setProfile(null);
    setIdToken(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Signout error:', err);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (user) {
      try {
        const token = await user.getIdToken(true);
        setIdToken(token);
        return token;
      } catch (err) {
        console.error('Failed refreshing token:', err);
        return null;
      }
    }
    if (isDemoUser && profile) {
      return `DEMO_BEARER_${profile.uid}`;
    }
    return null;
  }, [user, isDemoUser, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        idToken,
        loading,
        isDemoUser,
        signInWithGoogle,
        signInDemoMode,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
