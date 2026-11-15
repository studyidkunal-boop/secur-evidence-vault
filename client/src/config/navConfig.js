import {
  PlusCircle,
  FolderLock,
  History,
  Bell,
  Clock,
  Layers,
  ShieldCheck,
  CheckSquare,
  Scale,
  FileCheck,
  GitBranch,
} from 'lucide-react';

/**
 * Role-Based Navigation Configuration
 * Maps authenticated user role to permitted navigation items.
 */
export const ROLE_NAV_ITEMS = {
  INSPECTOR: [
    {
      id: 'ingest',
      label: 'Ingest Evidence',
      path: '/inspector/ingest',
      icon: PlusCircle,
      primaryAction: true,
    },
    {
      id: 'evidence',
      label: 'My Evidence',
      path: '/inspector/evidence',
      icon: FolderLock,
      isDefault: true,
    },
    {
      id: 'activity',
      label: 'My Activity',
      path: '/inspector/activity',
      icon: History,
      tooltip: 'Your personal audit entries only',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      isNotificationTrigger: true,
      icon: Bell,
    },
  ],

  DCP: [
    {
      id: 'review-queue',
      label: 'Review Queue',
      path: '/dcp/review-queue',
      icon: Clock,
      isDefault: true,
      showPendingBadge: true,
    },
    {
      id: 'all-evidence',
      label: 'All Evidence',
      path: '/dcp/all-evidence',
      icon: Layers,
    },
    {
      id: 'audit',
      label: 'Global Audit Logs',
      path: '/dcp/audit',
      icon: ShieldCheck,
    },
    {
      id: 'verify-chain',
      label: 'Verify Audit Chain',
      path: '/dcp/verify-chain',
      icon: CheckSquare,
      isActionModal: true,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      isNotificationTrigger: true,
      icon: Bell,
    },
  ],

  JUDGE: [
    {
      id: 'exhibits',
      label: 'Approved Exhibits',
      path: '/judge/exhibits',
      icon: Scale,
      isDefault: true,
    },
    {
      id: 'verify-external',
      label: 'Verify External Copy',
      path: '/judge/verify-external',
      icon: FileCheck,
    },
    {
      id: 'custody-trail',
      label: 'Custody Trail',
      path: '/judge/custody-trail',
      icon: GitBranch,
    },
  ],
};

/**
 * Get navigation items for a specific role
 */
export function getNavItemsForRole(role) {
  return ROLE_NAV_ITEMS[role] || [];
}

