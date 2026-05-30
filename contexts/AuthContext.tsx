'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';
import { IUser } from '@/lib/types';

const CACHE_KEY = 'b4u_user';

function readCache(): IUser | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeCache(user: IUser | null) {
  try {
    if (user) sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialise from cache immediately — eliminates blank-screen flash
  const [user, setUser] = useState<IUser | null>(() => readCache());
  // If we had a cached user we can skip the loading spinner entirely
  const [loading, setLoading] = useState<boolean>(() => readCache() === null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
        writeCache(data.data);
      } else {
        setUser(null);
        writeCache(null);
      }
    } catch {
      // Network error — keep cached user rather than logging out
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Always verify with server in background, but don't block render
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        writeCache(data.data);
        return {
          success: true,
          requiresPasswordChange: !!data.data?.requiresPasswordChange,
        };
      }
      return { success: false, error: data.message || data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    setUser(null);
    writeCache(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
