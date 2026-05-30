'use client';
import { useState } from 'react';
import { Search, Plus, X, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/contexts/PermissionContext';

interface Props {
  title: string;
  onNewTask?: () => void;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  actions?: React.ReactNode;
}

export default function Header({ title, onNewTask, searchPlaceholder, onSearch, actions }: Props) {
  const [search, setSearch] = useState('');
  const { user } = useAuth();
  const canCreateTask = usePermission('tasks.create');

  const handleSearch = (v: string) => {
    setSearch(v);
    onSearch?.(v);
  };

  return (
    <header className="header">
      {/* Title */}
      <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0, flexShrink: 0, whiteSpace: 'nowrap' }}>
        {title}
      </h1>

      {/* Search */}
      {(searchPlaceholder || onSearch) && (
        <div className="relative" style={{ flex: 1, maxWidth: 320 }}>
          <Search
            className="absolute"
            style={{ left: 10, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: 'var(--text-placeholder)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder || 'Search...'}
            className="input input-sm"
            style={{ paddingLeft: 32, paddingRight: search ? 32 : 10 }}
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute"
              style={{ right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, color: 'var(--text-placeholder)' }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Custom Actions */}
      {actions}

      {/* New Task Button — only shown when tasks.create permission is ON */}
      {onNewTask && canCreateTask && (
        <button onClick={onNewTask} className="btn btn-primary btn-sm">
          <Plus style={{ width: 15, height: 15 }} />
          New Task
        </button>
      )}

      {/* User Avatar */}
      {user && (
        <div
          className="avatar"
          style={{ background: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
          title={user.name}
        >
          {getInitials(user.name)}
        </div>
      )}
    </header>
  );
}
