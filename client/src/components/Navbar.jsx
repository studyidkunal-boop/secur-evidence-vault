import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Shield, LogOut, CheckCircle2, UserCheck, Bell, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout, getRoleHomePath } = useAuth();
  const { notificationCount, notifications, clearNotifications } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const roleBadgeColors = {
    INSPECTOR: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    DCP: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    JUDGE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  const homePath = getRoleHomePath(user.role);

  return (
    <nav className="bg-[#111827] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link to={homePath} className="flex items-center space-x-3 group">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-wide block text-sm sm:text-base">
                SECURA EVIDENCE VAULT
              </span>
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider block">
                TAMPER-EVIDENT FORENSIC CHAIN
              </span>
            </div>
          </Link>

          {/* Right Section: Notifications, Status, User Details, Logout */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Real-Time Notification Bell with Badge Counter */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  if (showDropdown && notificationCount > 0) {
                    clearNotifications();
                  }
                }}
                title="Real-Time Vault Alerts"
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>

              {/* Dropdown Notification List */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-3 z-50 text-slate-200">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">
                      Vault Alerts
                    </span>
                    {notificationCount > 0 && (
                      <button
                        onClick={clearNotifications}
                        className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 font-mono">
                        No new notifications
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-slate-800/40 transition text-xs">
                          <div className="font-semibold text-slate-200">
                            New Evidence Ingested - Pending Review
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                            Case #{item.case_number}: {item.title}
                          </div>
                          <div className="text-[10px] text-cyan-500 font-mono mt-1">
                            {item.receivedAt}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* System Status Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>CHAIN INTACT</span>
            </div>

            {/* Officer Details & Role Badge */}
            <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="text-[10px] font-mono text-slate-400">BADGE: {user.badge_id}</div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider font-mono border ${
                  roleBadgeColors[user.role] || 'bg-slate-800 text-slate-300'
                }`}
              >
                {user.role}
              </span>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Secure Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

