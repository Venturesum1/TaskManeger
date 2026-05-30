'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard, CheckSquare, Calendar, Video,
  Users, Settings, ChevronLeft, ChevronRight,
  LogOut, BarChart2, Activity, Kanban, User,
  FolderKanban, Flag, Bell, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';

const NAV_MAIN = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { href: '/my-tasks', icon: User, label: 'My Tasks' },
  { href: '/milestones', icon: Flag, label: 'Milestones' },
  { href: '/kanban', icon: Kanban, label: 'Kanban' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/meetings', icon: Video, label: 'Meetings' },
];

const NAV_TEAM = [
  { href: '/team', icon: Users, label: 'Team' },
  { href: '/workload', icon: BarChart3, label: 'Workload', roles: ['admin', 'manager'] as string[] },
  { href: '/reports', icon: BarChart2, label: 'Reports' },
  { href: '/activity', icon: Activity, label: 'Activity' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(apiUrl('/api/notifications/unread-count'), { credentials: 'include' });
        const data = await res.json();
        if (data.success) setUnreadCount(data.data.count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const renderNavItem = (item: typeof NAV_MAIN[0] & { roles?: string[] }) => {
    if (item.roles && user && !item.roles.includes(user.role)) return null;
    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    const isNotifications = item.href === '/notifications';

    return (
      <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}>
        <div className={cn('nav-item', active && 'active')} style={{ position: 'relative' }}>
          <item.icon className="flex-shrink-0" style={{ width: 18, height: 18 }} />
          {!collapsed && <span style={{ opacity: 1 }}>{item.label}</span>}
          {isNotifications && unreadCount > 0 && (
            <span style={{
              position: collapsed ? 'absolute' : 'static',
              top: collapsed ? 4 : undefined,
              right: collapsed ? 4 : undefined,
              marginLeft: collapsed ? 0 : 'auto',
              minWidth: 18, height: 18,
              background: '#EF4444',
              color: '#fff',
              borderRadius: 9,
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              lineHeight: 1,
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </Link>
    );
  };

  const notifItem = { href: '/notifications', icon: Bell, label: 'Notifications' };

  return (
    <aside className={cn('sidebar', collapsed && 'collapsed')} style={{ width: collapsed ? 60 : 232 }}>
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-3 border-b"
        style={{ height: 56, borderColor: 'var(--border)', flexShrink: 0 }}
      >
        <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 28, height: 28 }}>
          <Image src="/logo.jpg" alt="B4U" width={28} height={28} style={{ objectFit: 'cover', borderRadius: 6 }} />
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #92400E 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            B4Utaskmanagement
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {/* Main section */}
        {NAV_MAIN.map(renderNavItem)}

        {/* Notifications */}
        {renderNavItem(notifItem)}

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 12px' }} />

        {/* Team section */}
        {NAV_TEAM.map(renderNavItem)}
      </nav>

      {/* User */}
      {user && (
        <div className="border-t" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
          <div className={cn('flex items-center gap-2.5 px-4 py-3', !collapsed && 'justify-between')}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                className="avatar flex-shrink-0"
                style={{ background: 'var(--primary)', fontSize: collapsed ? 9 : 11 }}
              >
                {getInitials(user.name)}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                    {user.name}
                  </p>
                  <p className="truncate" style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                    {user.role}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button onClick={() => logout()} title="Logout" className="btn btn-ghost btn-icon-sm" style={{ flexShrink: 0 }}>
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
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 50,
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
