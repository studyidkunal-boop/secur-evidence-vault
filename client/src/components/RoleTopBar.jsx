import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getThemeForRole } from '../config/themeConfig';
import { LEGAL_LABEL } from '../config/legalConfig';
import { Shield, Award, LogOut } from 'lucide-react';

export default function RoleTopBar({ title, subtitle, actions = null }) {
  const { user, logout } = useAuth();
  const theme = getThemeForRole(user?.role);

  return (
    <div className="w-full pb-4 mb-4 border-b border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Title & Statutory Reference */}
      <div>
        <div className="flex items-center space-x-2.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h1>
          {/* Statutory Legal Label Pill */}
          <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {LEGAL_LABEL}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Right Controls: Role Badge & Badge ID & Custom Actions */}
      <div className="flex items-center flex-wrap gap-2.5">
        {actions}

        {/* Distinct Role Accent Badge */}
        <div
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider border shadow-2xs ${theme.badgeClass}`}
        >
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{user?.role || 'OFFICER'}</span>
        </div>

        {/* Officer Badge ID Pill (Uses exact unified users.badge_id) */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-semibold border border-slate-200/80 shadow-2xs">
          <Award className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span>ID: {user?.badge_id || '—'}</span>
        </div>

        {/* User Mini Profile / Logout Button */}
        <button
          type="button"
          onClick={logout}
          title={`Log out ${user?.name || ''}`}
          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

