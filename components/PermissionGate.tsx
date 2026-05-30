'use client';
import { usePermission } from '@/contexts/PermissionContext';

interface Props {
  perm: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PermissionGate({ perm, children, fallback = null }: Props) {
  const allowed = usePermission(perm);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
