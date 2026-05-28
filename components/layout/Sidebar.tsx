'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Calendar, Video,
  Users, Settings, ChevronLeft, ChevronRight,
  Zap, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/meetings', icon: Video, label: 'Meetings' },
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')} style={{ width: collapsed ? 60 : 232 }}>
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 border-b"
        style={{ height: 56, borderColor: 'var(--border)', flexShrink: 0 }}
      >
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--primary)' }}
        >
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        {!collapsed && (
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            TaskFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
              <div className={cn('nav-item', active && 'active')}>
                <item.icon
                  className="flex-shrink-0"
                  style={{ width: 18, height: 18 }}
                />
                {!collapsed && (
                  <span style={{ opacity: 1 }}>{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div
          className="border-t"
          style={{ borderColor: 'var(--border)', flexShrink: 0 }}
        >
          <div
            className={cn(
              'flex items-center gap-2.5 px-4 py-3',
              !collapsed && 'justify-between'
            )}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="avatar flex-shrink-0"
                style={{ background: 'var(--primary)', fontSize: collapsed ? 9 : 11 }}
              >
                {getInitials(user.name)}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p
                    className="truncate"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="truncate"
                    style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}
                  >
                    {user.role}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => logout()}
                title="Logout"
                className="btn btn-ghost btn-icon-sm"
                style={{ flexShrink: 0 }}
              >
                <LogOut style={{ width: 15, height: 15 }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-14"
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          zIndex: 50,
        }}
      >
        {collapsed
          ? <ChevronRight style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
          : <ChevronLeft style={{ width: 12, height: 12, color: 'var(--text-muted)' }} />
        }
      </button>
    </aside>
  );
}
