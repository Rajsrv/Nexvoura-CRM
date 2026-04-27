import { UserProfile, Company, Permission } from '../types';

export const hasPermission = (user: UserProfile, company: Company | null, permission: Permission): boolean => {
  // Admins have all permissions by default
  if (user.role === 'admin') return true;
  
  // 1. Check direct user permission overrides (highest priority)
  if (user.permissions?.includes(permission)) return true;
  
  // 2. Check company-level role permission mapping (RBAC settings)
  if (company?.rolePermissions?.[user.role]?.includes(permission)) return true;
  
  // 3. Fallback to hardcoded defaults if no granular settings exist yet
  // This ensures the app doesn't break for companies that haven't set up RBAC
  const defaultPermissions: Record<string, Permission[]> = {
    manager: [
      'leads:view', 'leads:edit', 'leads:assign',
      'tasks:view', 'tasks:edit', 'tasks:assign',
      'team:view', 'team:manage', 'team:invite',
      'finance:view', 'settings:company',
      'blog:view', 'blog:manage', 'media:manage'
    ],
    team_lead: [
      'leads:view', 'leads:edit',
      'tasks:view', 'tasks:edit', 'tasks:assign',
      'team:view', 'blog:view', 'blog:manage', 'media:manage'
    ],
    sales: [
      'leads:view', 'leads:edit',
      'tasks:view', 'tasks:edit',
      'blog:view'
    ]
  };

  const defaults = defaultPermissions[user.role] || [];
  return defaults.includes(permission);
};
