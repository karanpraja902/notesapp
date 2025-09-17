import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from './auth';

export type UserRole = 'admin' | 'member';

export interface RBACOptions {
  requiredRole?: UserRole;
  allowSelf?: boolean; // Allow users to access their own resources
  resourceUserId?: string; // The user ID of the resource being accessed
}

/**
 * Role-based access control middleware
 * @param request - NextRequest object
 * @param options - RBAC configuration options
 * @returns Auth object if authorized, null if unauthorized
 */
export function requireAuth(
  request: NextRequest, 
  options: RBACOptions = {}
): { auth: any; response?: NextResponse } | { auth: null; response: NextResponse } {
  const auth = getAuthFromRequest(request);
  
  if (!auth) {
    return {
      auth: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // Check role requirements
  if (options.requiredRole) {
    if (options.requiredRole === 'admin' && auth.role !== 'admin') {
      return {
        auth: null,
        response: NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
      };
    }
  }

  // Check if user can access their own resources
  if (options.allowSelf && options.resourceUserId) {
    if (auth.userId === options.resourceUserId) {
      return { auth };
    }
  }

  // If resourceUserId is specified but allowSelf is false, deny access
  if (options.resourceUserId && !options.allowSelf && auth.userId !== options.resourceUserId) {
    return {
      auth: null,
      response: NextResponse.json({ error: 'Forbidden. Cannot access other users\' resources.' }, { status: 403 })
    };
  }

  return { auth };
}

/**
 * Check if user has admin role
 */
export function isAdmin(auth: any): boolean {
  return auth?.role === 'admin';
}

/**
 * Check if user has member role or higher
 */
export function isMember(auth: any): boolean {
  return auth?.role === 'member' || auth?.role === 'admin';
}

/**
 * Check if user can manage users (admin only)
 */
export function canManageUsers(auth: any): boolean {
  return isAdmin(auth);
}

/**
 * Check if user can upgrade subscriptions (admin only)
 */
export function canUpgradeSubscription(auth: any): boolean {
  return isAdmin(auth);
}

/**
 * Check if user can manage notes (all authenticated users)
 */
export function canManageNotes(auth: any): boolean {
  return isMember(auth);
}
