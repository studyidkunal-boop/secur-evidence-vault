import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { user, getRoleHomePath } = useAuth();
  const homePath = user ? getRoleHomePath(user.role) : '/login';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="p-4 rounded-2xl bg-slate-800/60 text-slate-400 w-fit mx-auto mb-4 border border-slate-700/50">
          <FileQuestion className="w-10 h-10" />
        </div>
        <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
          HTTP 404 • NOT FOUND
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Endpoint Does Not Exist</h1>
        <p className="text-sm text-slate-400 mb-6">
          The requested forensic resource or case path could not be located in the vault registry.
        </p>

        <Link
          to={homePath}
          className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-semibold transition space-x-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}

