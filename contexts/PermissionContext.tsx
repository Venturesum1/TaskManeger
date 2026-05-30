'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';
import { useAuth } from './AuthContext';

type PermMap = Record<string, boolean>;

interface PermissionContextType {
  permissions: PermMap;
  can: (key: string) => boolean;
  reload: () => Promise<void>;
  loading: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: {},
  can: () => false,
  reload: async () => {},
  loading: true,
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PermMap>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setPermissions({}); setLoading(false); return; }
    try {
      const res = await fetch(apiUrl('/api/permissions/my'), { credentials: 'include' });
      const data = await res.json();
      if (data.success) setPermissions(data.data);
    } catch {}
    setLoading(false);
  }, [user]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  // Poll every 60 s so permission changes by admin take effect quickly
  useEffect(() => {
    if (!user) return;
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [user, reload]);

  // Re-fetch immediately when the user switches back to this tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const can = useCallback((key: string): boolean => {
    if (!user) return false;
    // Admin always has access even before permissions load
    if (user.role === 'admin') return true;
    return permissions[key] === true;
  }, [permissions, user]);

  return (
    <PermissionContext.Provider value={{ permissions, can, reload, loading }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

export function usePermission(key: string): boolean {
  const { can } = useContext(PermissionContext);
  return can(key);
}
