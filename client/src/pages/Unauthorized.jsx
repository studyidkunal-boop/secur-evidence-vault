import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user, getRoleHomePath } = useAuth();
  const homePath = user ? getRoleHomePath(user.role) : '/login';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-red-500/30 shadow-2xl relative overflow-hidden">
        <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 w-fit mx-auto mb-4 border border-red-500/20">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="text-[11px] font-mono text-red-400 uppercase tracking-widest mb-1">
          HTTP 403 • ACCESS FORBIDDEN
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Role Restriction Enforced</h1>
        <p className="text-sm text-slate-400 mb-6">
          Your current authenticated credentials ({user?.role || 'ANONYMOUS'}) are not authorized to access this department console.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs font-mono text-slate-400 mb-6 space-y-1">
          <div>INCIDENT RECORDED IN AUDIT LOG:</div>
          <div className="text-emerald-400">● Action: ACCESS_DENIED</div>
          <div className="text-slate-500 truncate">● Officer: {user?.name || 'Anonymous'}</div>
        </div>

        <Link
          to={homePath}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Authorized Console</span>
        </Link>
      </div>
    </div>
  );
}

