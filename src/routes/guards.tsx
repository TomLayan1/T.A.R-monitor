import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types/user';
import { SIGN_IN_PATH, homePath } from './paths';

/**
 * Route-level access control. Signed-out visitors go to the unified Sign In page; signed-in users on a
 * page their role may not open are sent to their own home. Sensitive operations are ALSO enforced in the
 * services and in the scoped data hooks, so typing a URL (or editing the DOM) grants nothing.
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to={SIGN_IN_PATH} replace />;
  if (!allow.includes(user.role)) return <Navigate to={homePath(user.role)} replace />;
  return <>{children}</>;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to={homePath(user.role)} replace />;
  return <>{children}</>;
}
