// src/components/auth/RoleBasedGuard.tsx

'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface RoleBasedGuardProps {
  children: ReactNode;
  permissions?: Record<string, boolean>;
  requiredPermissions?: string[];
  fallback?: ReactNode;
}

export function RoleBasedGuard({ 
  children, 
  permissions, 
  requiredPermissions = [],
  fallback 
}: RoleBasedGuardProps) {
  const { data: session } = useSession();

  if (!session) {
    return fallback || <div>Please sign in to access this content.</div>;
  }

  // Check if user has required permissions
  if (requiredPermissions.length > 0 && permissions) {
    const hasAllPermissions = requiredPermissions.every(
      permission => permissions[permission] === true
    );

    if (!hasAllPermissions) {
      return fallback || (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">
            You don't have permission to view this content.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}