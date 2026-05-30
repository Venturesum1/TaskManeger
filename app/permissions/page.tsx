'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useRouter } from 'next/navigation';
import { apiUrl } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Plus, Trash2, Users, ChevronDown,
  RotateCcw, History, Search, X,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface PermDef {
  key: string;
  label: string;
  category: string;
}

interface Role {
  _id: string;
  name: string;
  label: string;
  description?: string;
  isSystem: boolean;
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditEntry {
  _id: string;
  action: string;
  performedByName: string;
  target: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

type Tab = 'roles' | 'users' | 'audit';

// ── Helpers ────────────────────────────────────────────────────────────────

function groupByCategory(defs: PermDef[]): Record<string, PermDef[]> {
  return defs.reduce<Record<string, PermDef[]>>((acc, d) => {
    (acc[d.category] = acc[d.category] || []).push(d);
    return acc;
  }, {});
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    'role.created': 'Role Created',
    'role.updated': 'Role Updated',
    'role.deleted': 'Role Deleted',
    'role_permission.toggled': 'Permission Toggled',
    'role_permission.bulk_updated': 'Permissions Bulk Updated',
    'user_permission.set': 'User Override Set',
    'user_permission.cleared': 'User Override Cleared',
    'user_permission.all_cleared': 'All User Overrides Cleared',
  };
  return map[action] ?? action;
}

// ── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11, padding: 2, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? '#10B981' : '#D1D5DB',
        display: 'inline-flex', alignItems: 'center', transition: 'background 0.2s',
        flexShrink: 0, opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transform: checked ? 'translateX(18px)' : 'translateX(0)',
        transition: 'transform 0.2s', display: 'block',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PermissionsPage() {
  const { user } = useAuth();
  const { reload: reloadPerms } = usePermissions();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('roles');

  // Role-permissions state
  const [defs, setDefs] = useState<PermDef[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [permMap, setPermMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Custom role creation
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  // User overrides state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [userRolePerms, setUserRolePerms] = useState<Record<string, boolean>>({});
  const [savingUser, setSavingUser] = useState(false);

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') router.replace('/');
  }, [user, router]);

  // Load definitions + roles on mount
  useEffect(() => {
    Promise.all([
      fetch(apiUrl('/api/permissions/definitions'), { credentials: 'include' }).then(r => r.json()),
      fetch(apiUrl('/api/permissions/roles'), { credentials: 'include' }).then(r => r.json()),
    ]).then(([defsRes, rolesRes]) => {
      if (defsRes.success) setDefs(defsRes.data);
      if (rolesRes.success) {
        setRoles(rolesRes.data);
        if (rolesRes.data.length > 0) setSelectedRole(rolesRes.data[0].name);
      }
    });
  }, []);

  // Load permissions for selected role
  useEffect(() => {
    if (!selectedRole) return;
    fetch(apiUrl(`/api/permissions/roles/${selectedRole}/permissions`), { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res.success) setPermMap(res.data); });
  }, [selectedRole]);

  // Load team members
  useEffect(() => {
    if (tab !== 'users') return;
    fetch(apiUrl('/api/users'), { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res.success) setMembers(res.data); });
  }, [tab]);

  // Load audit logs
  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    const res = await fetch(apiUrl('/api/permissions/audit?limit=50'), { credentials: 'include' }).then(r => r.json());
    if (res.success) { setAuditLogs(res.data.logs); setAuditTotal(res.data.total); }
    setAuditLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'audit') loadAudit();
  }, [tab, loadAudit]);

  // Load user overrides when a user is selected
  useEffect(() => {
    if (!selectedUser) return;
    Promise.all([
      fetch(apiUrl(`/api/permissions/users/${selectedUser._id}/overrides`), { credentials: 'include' }).then(r => r.json()),
      fetch(apiUrl(`/api/permissions/roles/${selectedUser.role}/permissions`), { credentials: 'include' }).then(r => r.json()),
    ]).then(([overrideRes, roleRes]) => {
      if (overrideRes.success) setUserOverrides(overrideRes.data);
      if (roleRes.success) setUserRolePerms(roleRes.data);
    });
  }, [selectedUser]);

  // ── Role permission handlers ─────────────────────────────────────────────

  const handleToggle = (key: string, val: boolean) => {
    setPermMap(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveRole = async () => {
    setSaving(true);
    const updates = Object.entries(permMap).map(([key, enabled]) => ({ key, enabled }));
    const res = await fetch(apiUrl(`/api/permissions/roles/${selectedRole}/permissions`), {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    }).then(r => r.json());
    setSaving(false);
    if (res.success) {
      toast.success('Permissions saved');
      reloadPerms();
    } else {
      toast.error(res.message || 'Failed to save');
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleLabel.trim()) return toast.error('Label is required');
    setCreatingRole(true);
    const res = await fetch(apiUrl('/api/permissions/roles'), {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName || newRoleLabel, label: newRoleLabel, description: newRoleDesc }),
    }).then(r => r.json());
    setCreatingRole(false);
    if (res.success) {
      toast.success(`Role "${newRoleLabel}" created`);
      setRoles(prev => [...prev, res.data]);
      setSelectedRole(res.data.name);
      setShowNewRole(false);
      setNewRoleName(''); setNewRoleLabel(''); setNewRoleDesc('');
    } else {
      toast.error(res.message || 'Failed to create role');
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    const res = await fetch(apiUrl(`/api/permissions/roles/${roleName}`), {
      method: 'DELETE', credentials: 'include',
    }).then(r => r.json());
    if (res.success) {
      toast.success('Role deleted');
      const remaining = roles.filter(r => r.name !== roleName);
      setRoles(remaining);
      setSelectedRole(remaining[0]?.name ?? '');
    } else {
      toast.error(res.message || 'Failed to delete');
    }
  };

  // ── User override handlers ───────────────────────────────────────────────

  const handleUserOverrideToggle = (key: string, val: boolean) => {
    setUserOverrides(prev => ({ ...prev, [key]: val }));
  };

  const isUserOverrideActive = (key: string) => key in userOverrides;

  const handleSaveUserOverrides = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    const entries = Object.entries(userOverrides);
    for (const [permissionKey, enabled] of entries) {
      await fetch(apiUrl(`/api/permissions/users/${selectedUser._id}/overrides`), {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionKey, enabled }),
      });
    }
    setSavingUser(false);
    toast.success('User overrides saved');
    reloadPerms();
  };

  const handleClearAllOverrides = async () => {
    if (!selectedUser) return;
    if (!confirm(`Clear all permission overrides for ${selectedUser.name}?`)) return;
    const res = await fetch(apiUrl(`/api/permissions/users/${selectedUser._id}/overrides`), {
      method: 'DELETE', credentials: 'include',
    }).then(r => r.json());
    if (res.success) {
      toast.success('All overrides cleared');
      setUserOverrides({});
    }
  };

  const handleRemoveOverride = async (key: string) => {
    if (!selectedUser) return;
    await fetch(apiUrl(`/api/permissions/users/${selectedUser._id}/overrides/${key}`), {
      method: 'DELETE', credentials: 'include',
    });
    setUserOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    toast.success('Override removed — role default restored');
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const grouped = groupByCategory(defs);
  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!user || user.role !== 'admin') return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg,#6366F1,#8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ShieldCheck style={{ width: 20, height: 20, color: '#fff' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Permission Management</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Control what each role can see and do — changes take effect immediately.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {(['roles', 'users', 'audit'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {t === 'roles' ? 'Role Permissions' : t === 'users' ? 'User Overrides' : 'Audit Log'}
          </button>
        ))}
      </div>

      {/* ── TAB: Role Permissions ─────────────────────────────────────────── */}
      {tab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Role list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roles</span>
              <button
                onClick={() => setShowNewRole(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
              >
                <Plus style={{ width: 14, height: 14 }} /> New
              </button>
            </div>

            {showNewRole && (
              <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  placeholder="Display label *"
                  value={newRoleLabel}
                  onChange={e => setNewRoleLabel(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                />
                <input
                  placeholder="Description (optional)"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleCreateRole}
                    disabled={creatingRole}
                    style={{ flex: 1, padding: '6px 10px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {creatingRole ? 'Creating…' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowNewRole(false)}
                    style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {roles.map(role => (
              <div
                key={role.name}
                onClick={() => setSelectedRole(role.name)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: selectedRole === role.name ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                  borderLeft: selectedRole === role.name ? '3px solid var(--primary)' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{role.label}</div>
                  {role.isSystem && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>System</div>
                  )}
                </div>
                {!role.isSystem && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteRole(role.name); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 2, opacity: 0.6, display: 'flex' }}
                    title="Delete role"
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Permission toggles */}
          {selectedRole && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    {roles.find(r => r.name === selectedRole)?.label} Permissions
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Toggle which actions and pages this role can access.
                  </p>
                </div>
                <button
                  onClick={handleSaveRole}
                  disabled={saving}
                  style={{
                    padding: '8px 20px', background: 'var(--primary)', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              {Object.entries(grouped).map(([category, perms]) => (
                <div
                  key={category}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}
                >
                  <div style={{ padding: '10px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {category}
                    </span>
                  </div>
                  {perms.map((perm, i) => (
                    <div
                      key={perm.key}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 16px',
                        borderBottom: i < perms.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{perm.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, fontFamily: 'monospace' }}>{perm.key}</div>
                      </div>
                      <Toggle
                        checked={!!permMap[perm.key]}
                        onChange={val => handleToggle(perm.key, val)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: User Overrides ───────────────────────────────────────────── */}
      {tab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
          {/* User list */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-muted)' }} />
                <input
                  placeholder="Search members…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px 7px 28px', border: '1px solid var(--border)',
                    borderRadius: 7, fontSize: 12, background: 'var(--bg)', color: 'var(--text)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {filteredMembers.map(member => (
                <div
                  key={member._id}
                  onClick={() => setSelectedUser(member)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    background: selectedUser?._id === member._id ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent',
                    borderLeft: selectedUser?._id === member._id ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{member.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {member.email} · <span style={{ textTransform: 'capitalize' }}>{member.role}</span>
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No members found</div>
              )}
            </div>
          </div>

          {/* Override editor */}
          {selectedUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                    {selectedUser.name}
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Role: <strong style={{ textTransform: 'capitalize' }}>{selectedUser.role}</strong> — overrides below replace the role default for this user only.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleClearAllOverrides}
                    style={{ padding: '7px 14px', background: 'none', border: '1px solid #EF4444', color: '#EF4444', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <RotateCcw style={{ width: 13, height: 13 }} /> Clear All
                  </button>
                  <button
                    onClick={handleSaveUserOverrides}
                    disabled={savingUser}
                    style={{ padding: '7px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: savingUser ? 'not-allowed' : 'pointer', opacity: savingUser ? 0.7 : 1 }}
                  >
                    {savingUser ? 'Saving…' : 'Save Overrides'}
                  </button>
                </div>
              </div>

              {Object.entries(grouped).map(([category, perms]) => (
                <div key={category} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{category}</span>
                  </div>
                  {perms.map((perm, i) => {
                    const hasOverride = isUserOverrideActive(perm.key);
                    const effectiveVal = hasOverride ? userOverrides[perm.key] : (userRolePerms[perm.key] ?? false);
                    return (
                      <div
                        key={perm.key}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 16px',
                          borderBottom: i < perms.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          background: hasOverride ? 'color-mix(in srgb, #F59E0B 6%, transparent)' : 'transparent',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{perm.label}</span>
                            {hasOverride && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'color-mix(in srgb, #F59E0B 15%, transparent)', padding: '1px 6px', borderRadius: 4 }}>
                                OVERRIDE
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            Role default: <strong>{userRolePerms[perm.key] ? 'ON' : 'OFF'}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <Toggle
                            checked={effectiveVal}
                            onChange={val => handleUserOverrideToggle(perm.key, val)}
                          />
                          {hasOverride && (
                            <button
                              onClick={() => handleRemoveOverride(perm.key)}
                              title="Remove override — use role default"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
                            >
                              <X style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', gap: 10 }}>
              <Users style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Select a team member to manage their overrides</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Audit Log ────────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              <History style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: -2 }} />
              Permission Change History ({auditTotal})
            </span>
            <button onClick={loadAudit} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
          </div>

          {auditLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No audit entries yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  {['When', 'Action', 'By', 'Target', 'Detail'].map(h => (
                    <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry, i) => (
                  <tr key={entry._id} style={{ borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <td style={{ padding: '9px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: 'var(--text)' }}>
                      {actionLabel(entry.action)}
                    </td>
                    <td style={{ padding: '9px 14px', color: 'var(--text)' }}>{entry.performedByName || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text)', fontFamily: 'monospace', fontSize: 12 }}>{entry.target || '—'}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-muted)', fontSize: 11, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(entry.detail)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
