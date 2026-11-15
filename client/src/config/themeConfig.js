import { Shield, ClipboardCheck, Scale } from 'lucide-react';

/**
 * Role Theme Configuration
 * Distinct visual accents, badges, buttons, and empty states.
 */
export const ROLE_THEMES = {
  INSPECTOR: {
    roleName: 'INSPECTOR',
    displayName: 'Police Inspector (IO)',
    accentName: 'blue',
    accentColor: '#2563eb',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20',
    headerBadge: 'bg-blue-600 text-white',
    activeNavClass: 'bg-blue-600 text-white shadow-xs',
    accentButton: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    accentBorder: 'border-blue-500',
    accentText: 'text-blue-600',
    lightBg: 'bg-blue-50/60',
    emptyState: {
      icon: Shield,
      title: 'No Evidence Registered Yet',
      description: 'You have not ingested any digital evidence cases yet. Click "Ingest Evidence" to register your first seizure.',
      actionLabel: 'Ingest New Evidence',
    },
  },

  DCP: {
    roleName: 'DCP',
    displayName: 'Deputy Commissioner of Police',
    accentName: 'amber',
    accentColor: '#d97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20',
    headerBadge: 'bg-amber-600 text-white',
    activeNavClass: 'bg-amber-600 text-white shadow-xs',
    accentButton: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
    accentBorder: 'border-amber-500',
    accentText: 'text-amber-600',
    lightBg: 'bg-amber-50/60',
    emptyState: {
      icon: ClipboardCheck,
      title: 'Review Queue Clear',
      description: 'All submitted evidence records have been processed. No pending seizures currently awaiting supervisory approval.',
      actionLabel: 'Refresh Docket',
    },
  },

  JUDGE: {
    roleName: 'JUDGE',
    displayName: 'District & Sessions Judge',
    accentName: 'emerald',
    accentColor: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-500/20',
    headerBadge: 'bg-emerald-700 text-white',
    activeNavClass: 'bg-emerald-700 text-white shadow-xs',
    accentButton: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
    accentBorder: 'border-emerald-600',
    accentText: 'text-emerald-700',
    lightBg: 'bg-emerald-50/60',
    emptyState: {
      icon: Scale,
      title: 'No Admitted Court Exhibits',
      description: 'No verified Section 63 BSA electronic exhibits are currently admitted to this judicial chamber docket.',
      actionLabel: 'Refresh Bench Exhibits',
    },
  },
};

export function getThemeForRole(role) {
  return ROLE_THEMES[role] || ROLE_THEMES.INSPECTOR;
}

