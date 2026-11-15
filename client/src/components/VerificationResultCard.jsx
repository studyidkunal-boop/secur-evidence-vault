import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, Clock, Copy, Hash } from 'lucide-react';

export default function VerificationResultCard({ result, onClose }) {
  if (!result) return null;

  const isMatch = result.match || result.status === 'MATCH';
  const sealedHash = result.sealed_db_hash || result.original_hash;
  const comparedHash = result.recomputed_storage_hash || result.recomputed_hash || result.external_file_hash || result.external_hash;

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div
      className={`rounded-2xl p-6 border shadow-2xl transition-all ${
        isMatch
          ? 'bg-emerald-950/80 border-emerald-500/60 shadow-emerald-950/50'
          : 'bg-red-950/90 border-red-500/80 shadow-red-950/60 animate-pulse'
      }`}
    >
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`p-3 rounded-2xl border ${
              isMatch
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-red-500/20 text-red-400 border-red-500/50'
            }`}
          >
            {isMatch ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider border ${
                  isMatch
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-500/30 text-red-200 border-red-500/60'
                }`}
              >
                {isMatch ? 'VERIFIED' : 'TAMPERED'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {result.type === 'EXTERNAL' ? 'EXTERNAL COPY EVALUATION' : 'STORAGE HASH AUDIT'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              {isMatch ? 'VERIFIED - INTEGRITY INTACT' : 'CRITICAL ALERT - EVIDENCE TAMPERED'}
            </h3>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Explanatory Message */}
      <p className="text-xs text-slate-300 mb-6 leading-relaxed">
        {result.message ||
          (isMatch
            ? 'The byte buffer SHA-256 hash mathematically matches the original sealed vault digest. Chain of custody is intact.'
            : 'The cryptographic hash of the examined file buffer does NOT match the sealed vault hash. The evidence has been edited, corrupted, or replaced.')}
      </p>

      {/* Hash Comparison Table */}
      <div className="space-y-3 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs">
        <div>
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-cyan-400" />
              <span>SEALED DATABASE RECORD HASH</span>
            </span>
            <button
              onClick={() => copyToClipboard(sealedHash)}
              className="hover:text-cyan-300 transition flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 break-all select-all">
            {sealedHash || 'N/A'}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span className="flex items-center space-x-1">
              <Hash className="w-3 h-3 text-amber-400" />
              <span>
                {result.type === 'EXTERNAL' ? 'UPLOADED EXTERNAL COPY HASH' : 'RECOMPUTED STORAGE BUFFER HASH'}
              </span>
            </span>
            <button
              onClick={() => copyToClipboard(comparedHash)}
              className="hover:text-amber-300 transition flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <div
            className={`p-2 rounded border break-all select-all ${
              isMatch
                ? 'bg-slate-900 border-slate-800 text-emerald-300'
                : 'bg-red-950/40 border-red-500/40 text-red-300 font-bold'
            }`}
          >
            {comparedHash || 'N/A'}
          </div>
        </div>
      </div>

      {/* Footer Timestamp & Forensic Verdict */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400 font-mono gap-2">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>VERIFIED AT: {new Date(result.verified_at || Date.now()).toUTCString()}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {isMatch ? (
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>COURT ADMISSIBLE (SEC 65B COMPLIANT)</span>
            </span>
          ) : (
            <span className="text-red-400 font-semibold flex items-center space-x-1">
              <X className="w-3.5 h-3.5" />
              <span>ADMISSIBILITY REJECTED (TAMPER EVIDENCE DETECTED)</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

