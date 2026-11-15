import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import SecuraLogo from './SecuraLogo';
import { getNavItemsForRole } from '../config/navConfig';
import { getThemeForRole } from '../config/themeConfig';
import {
  LogOut,
  Search,
  Menu,
  X,
  PlusCircle,
  Shield,
} from 'lucide-react';

export default function Sidebar({
  searchQuery,
  onSearchChange,
  pendingReviewCount = 0,
  onTriggerChainVerify = null,
}) {
  const { user, logout, getRoleHomePath } = useAuth();
  const { notificationCount, clearNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentPath = location.pathname;
  const homePath = getRoleHomePath(user?.role);
  const navItems = getNavItemsForRole(user?.role);
  const theme = getThemeForRole(user?.role);

  return (
    <>
      {/* Mobile Top Header Bar (md:hidden) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#f4f6f8]/95 backdrop-blur-md border-b border-slate-200/90 flex items-center justify-between px-4 z-30 shadow-xs">
        <div
          onClick={() => navigate(homePath)}
          className="cursor-pointer select-none"
        >
          <SecuraLogo className="text-[18px]" />
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${theme.badgeClass}`}>
            {user?.role}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-white transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* Mobile Floating Action Button (FAB) - Strictly for INSPECTOR role only */}
      {user?.role === 'INSPECTOR' && (
        <div className="block md:hidden fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/inspector/ingest');
            }}
            className="flex items-center space-x-2 px-5 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl border-2 border-white/20 transition-all duration-150 cursor-pointer active:scale-95"
            aria-label="Ingest Evidence"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Ingest Evidence</span>
          </button>
        </div>
      )}

      {/* Left Sidebar: Off-white (#f4f6f8) background, role-configured navigation */}
      <aside
        className={`fixed md:relative top-0 left-0 z-40 h-full w-72 sm:w-76 bg-[#f4f6f8] border-r border-slate-200/80 flex flex-col justify-between pt-6 pb-5 px-4 sm:px-5 select-none transition-transform duration-200 ease-in-out font-sans flex-shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Mark: SECURA with equal letter sizing */}
          <div
            onClick={() => {
              setMobileMenuOpen(false);
              navigate(homePath);
            }}
            className="flex items-center mb-6 pl-1 cursor-pointer select-none group"
          >
            <SecuraLogo className="text-[21px]" />
          </div>

          {/* Search Box: Active and wired strictly to allowed role scope */}
          {onSearchChange ? (
            <div className="relative mb-5">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={`Search ${user?.role === 'INSPECTOR' ? 'own evidence' : user?.role === 'JUDGE' ? 'court exhibits' : 'all records'}...`}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-300 shadow-2xs transition-colors duration-150"
              />
            </div>
          ) : (
            <div className="mb-3" />
          )}

          {/* Role Indicator Banner inside Sidebar (Shows exact unified badge_id) */}
          <div className={`mb-4 px-3.5 py-2 rounded-xl flex items-center justify-between border ${theme.badgeClass}`}>
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-mono text-[11px] font-bold tracking-wider">{user?.role} CONSOLE</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              ID: {user?.badge_id || '—'}
            </span>
          </div>

          {/* Role-Specific Config-Driven Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path &&
                (currentPath === item.path ||
                  (item.path !== homePath && currentPath.startsWith(item.path)));

              // Ingest Evidence primary action: Outlined/lighter style so only active tab has solid accent
              if (item.primaryAction) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={`w-full mb-3 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-150 cursor-pointer border ${
                      isActive
                        ? 'bg-blue-100 text-blue-800 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white hover:bg-blue-50/70 text-blue-700 border-blue-200 hover:border-blue-300 shadow-2xs'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>+ {item.label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (item.isNotificationTrigger) {
                      setNotificationsOpen(!notificationsOpen);
                      if (clearNotifications && notificationCount > 0) {
                        clearNotifications();
                      }
                    } else if (item.isActionModal && onTriggerChainVerify) {
                      onTriggerChainVerify();
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 cursor-pointer ${
                    isActive
                      ? theme.activeNavClass
                      : 'text-slate-700 hover:bg-white/80 hover:text-black font-medium'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-colors flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {/* DCP Pending Queue Badge */}
                  {item.showPendingBadge && pendingReviewCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {pendingReviewCount} pending
                    </span>
                  )}

                  {/* Notification Badge */}
                  {item.isNotificationTrigger && notificationCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                      {notificationCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Interactive Notifications Drawer */}
          {notificationsOpen && (
            <div className="mt-3 p-3.5 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                  Live Socket Alerts
                </span>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Real-time cryptographic audit alerts and custody notifications will stream here live.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Officer Profile & Logout (With full name tooltip & clean wrapping) */}
        <div className="pt-4 border-t border-slate-200/90">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center space-x-2.5 overflow-hidden min-w-0 pr-1">
              <div className="w-8 h-8 rounded-lg bg-black text-white font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div
                  className="text-xs font-bold text-slate-900 leading-snug line-clamp-1"
                  title={user?.name || 'Officer'}
                >
                  {user?.name || 'Officer'}
                </div>
                <div
                  className="text-[10px] text-slate-500 font-mono truncate"
                  title={`Badge: ${user?.badge_id || '—'} • ${user?.email || ''}`}
                >
                  {user?.badge_id ? `ID: ${user.badge_id}` : (user?.email || '—')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout Session"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
