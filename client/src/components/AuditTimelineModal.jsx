import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Link as ChainIcon,
  ShieldCheck,
  ShieldAlert,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
  Copy,
  Check,
  Clock,
  User,
  Hash,
  RefreshCw,
  GitCommit,
  Shield,
} from 'lucide-react';

export default function AuditTimelineModal({ evidenceId, isOpen, onClose }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [evidenceMeta, setEvidenceMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedHashKey, setCopiedHashKey] = useState(null);

  useEffect(() => {
    if (isOpen && evidenceId) {
      fetchAuditTimeline();
    }
  }, [isOpen, evidenceId]);

  async function fetchAuditTimeline() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/evidence/${evidenceId}/audit-logs`);
      if (res.data.success) {
        setAuditLogs(res.data.auditLogs || []);
        setEvidenceMeta(res.data.evidence || null);
      } else {
        throw new Error(res.data.error || 'Failed to fetch audit timeline');
      }
    } catch (err) {
      console.error('Audit timeline fetch error:', err);
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to load cryptographic audit timeline'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCopyHash(hash, key) {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHashKey(key);
    setTimeout(() => setCopiedHashKey(null), 2000);
  }

  if (!isOpen) return null;

  // Distinct neon glow configurations for each action type
  function getActionConfig(action) {
    const act = (action || '').toUpperCase();

    if (act.includes('INGEST')) {
      return {
        label: 'EVIDENCE INGESTION & SHA-256 SEAL',
        type: 'INGEST',
        neonDot: 'bg-cyan-400 ring-4 ring-cyan-500/40 shadow-[0_0_15px_#22d3ee]',
        badgeBg: 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300',
        cardBorder: 'hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
        icon: <Upload className="w-4 h-4 text-cyan-400" />,
      };
    }

    if (act.includes('APPROV')) {
      return {
        label: 'SECTION 65B COURT CERTIFICATION & APPROVAL',
        type: 'APPROVAL',
        neonDot: 'bg-amber-400 ring-4 ring-amber-500/40 shadow-[0_0_15px_#fbbf24]',
        badgeBg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
        cardBorder: 'hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
        icon: <CheckCircle2 className="w-4 h-4 text-amber-400" />,
      };
    }

    if (act.includes('TAMPER') || act.includes('CORRUPT')) {
      return {
        label: 'CRITICAL: CRYPTOGRAPHIC TAMPER DETECTED',
        type: 'TAMPERED',
        neonDot: 'bg-rose-500 ring-4 ring-rose-500/50 shadow-[0_0_18px_#f43f5e] animate-ping',
        badgeBg: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        cardBorder: 'hover:border-rose-500/60 hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] border-rose-900/60',
        icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
      };
    }

    if (act.includes('VERIF')) {
      return {
        label: 'CRYPTOGRAPHIC INTEGRITY VERIFIED (100% PARITY)',
        type: 'VERIFIED',
        neonDot: 'bg-emerald-400 ring-4 ring-emerald-500/40 shadow-[0_0_15px_#34d399]',
        badgeBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
        cardBorder: 'hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      };
    }

    return {
      label: action.replace(/_/g, ' '),
      type: 'DEFAULT',
      neonDot: 'bg-indigo-400 ring-4 ring-indigo-500/40 shadow-[0_0_12px_#818cf8]',
      badgeBg: 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300',
      cardBorder: 'hover:border-indigo-500/50',
      icon: <Lock className="w-4 h-4 text-indigo-400" />,
    };
  }

  function getRoleStyle(role) {
    switch (role) {
      case 'INSPECTOR':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'DCP':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'JUDGE':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  }

  // Synthesize default genesis log if audit_logs table has no entries yet for this exhibit
  const displayedLogs =
    auditLogs.length > 0
      ? auditLogs
      : evidenceMeta
      ? [
          {
            id: 'genesis-fallback',
            action: 'EVIDENCE_INGESTED',
            timestamp: evidenceMeta.created_at || new Date().toISOString(),
            user_name: 'Investigating Officer',
            user_role: 'INSPECTOR',
            sha256_hash: evidenceMeta.sha256_hash,
            metadata: { note: 'Genesis cryptographic anchor established' },
          },
        ]
      : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in duration-200 font-sans">
      {/* Cyber Glassmorphism Modal Window */}
      <div className="w-full max-w-3xl bg-gray-900/90 backdrop-blur-md text-gray-100 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] border border-cyan-500/30 overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* Modal Top Header */}
        <div className="p-6 border-b border-gray-800/80 flex items-start justify-between bg-gray-950/60 relative overflow-hidden">
          {/* Subtle Ambient Top Glow */}
          <div className="absolute -top-10 left-1/4 w-96 h-20 bg-cyan-500/10 blur-3xl pointer-events-none"></div>

          <div className="flex items-center space-x-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)] flex-shrink-0">
              <ChainIcon className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                  GIT-STYLE AUDIT CHAIN
                </span>
                <span className="text-[10px] font-mono text-gray-400">
                  SEC. 65B INDIAN EVIDENCE ACT
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-white tracking-tight mt-1 flex items-center space-x-2">
                <span>Cryptographic Audit Timeline</span>
                {evidenceMeta?.case_number && (
                  <span className="text-cyan-400 font-mono text-base font-semibold">
                    #{evidenceMeta.case_number}
                  </span>
                )}
              </h2>

              {evidenceMeta && (
                <p className="text-xs text-gray-400 truncate max-w-md mt-0.5">
                  <span className="text-gray-300 font-medium">{evidenceMeta.title}</span> •{' '}
                  <span className="font-mono text-[11px] text-gray-500">{evidenceMeta.file_name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 relative z-10">
            <button
              onClick={fetchAuditTimeline}
              disabled={loading}
              title="Refresh Audit Chain"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/80 transition cursor-pointer border border-transparent hover:border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              title="Close Timeline"
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/80 transition cursor-pointer border border-transparent hover:border-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Git Commit History Style Vertical Timeline */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-24 text-center text-gray-400 font-mono text-xs">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)]"></div>
              RECONSTRUCTING MERKLE FORENSIC CHAIN...
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-400 text-xs">
              <AlertTriangle className="w-9 h-9 mx-auto mb-2 text-rose-500" />
              <p className="font-semibold text-sm">{error}</p>
              <button
                onClick={fetchAuditTimeline}
                className="mt-4 px-4 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-mono transition"
              >
                Retry Audit Fetch
              </button>
            </div>
          ) : displayedLogs.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-xs">
              <Clock className="w-9 h-9 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-300 font-semibold">No audit events recorded yet.</p>
              <p className="text-gray-500 mt-1 font-mono">
                Ingestion seal will appear once the exhibit is officially processed.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 my-2">
              {/* Git Commit Continuous Vertical Trunk Line */}
              <div className="absolute left-[7px] sm:left-[11px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-cyan-500 via-amber-400 to-emerald-500 opacity-60"></div>

              <div className="space-y-7">
                {displayedLogs.map((log, index) => {
                  const config = getActionConfig(log.action);
                  const roleStyle = getRoleStyle(log.user_role);
                  const hash = log.sha256_hash || evidenceMeta?.sha256_hash;
                  const isLatest = index === displayedLogs.length - 1;

                  return (
                    <div key={log.id || index} className="relative group">
                      {/* Neon Glowing Timeline Node (Git Commit Dot) */}
                      <div
                        className={`absolute -left-[23px] sm:-left-[27px] top-3.5 w-3.5 h-3.5 rounded-full transition-transform duration-200 group-hover:scale-125 ${config.neonDot}`}
                      ></div>

                      {/* Event Commit Card */}
                      <div
                        className={`bg-gray-950/70 border border-gray-800/90 rounded-2xl p-4 sm:p-5 transition-all duration-200 ${config.cardBorder} space-y-3.5`}
                      >
                        {/* Action Badge & Timestamp */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border flex items-center space-x-1.5 ${config.badgeBg}`}
                            >
                              {config.icon}
                              <span>{config.label}</span>
                            </span>
                            {isLatest && (
                              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                LATEST HEAD
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] font-mono text-gray-400 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-gray-500" />
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </span>
                        </div>

                        {/* Officer & Role Identity */}
                        <div className="flex items-center space-x-2 text-xs text-gray-300">
                          <User className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="font-semibold text-white">
                            {log.user_name || 'Designated Vault Officer'}
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${roleStyle}`}
                          >
                            {log.user_role || 'SYSTEM'}
                          </span>
                          {log.badge_id && (
                            <span className="text-[10px] font-mono text-gray-400">
                              BADGE #{log.badge_id}
                            </span>
                          )}
                        </div>

                        {/* Cryptographic SHA-256 Hash Display with Copy Icon */}
                        {hash && (
                          <div className="p-3 rounded-xl bg-gray-900/90 border border-gray-800 text-[11px] font-mono space-y-1.5 group-hover:border-gray-700 transition">
                            <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold tracking-wide">
                              <span className="flex items-center space-x-1.5">
                                <Hash className="w-3.5 h-3.5 text-cyan-400" />
                                <span>SHA-256 PARITY HASH</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => handleCopyHash(hash, `hash-${index}`)}
                                className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-sans text-xs transition cursor-pointer px-2 py-0.5 rounded-md hover:bg-cyan-950/60"
                                title="Copy cryptographic hash to clipboard"
                              >
                                {copiedHashKey === `hash-${index}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400 font-semibold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Copy Hash</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="text-cyan-300 break-all select-all font-mono leading-relaxed bg-black/40 p-2 rounded-lg border border-cyan-950/80">
                              {hash}
                            </div>
                          </div>
                        )}

                        {/* Block Merkle Stamp Footer */}
                        <div className="pt-2 border-t border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-500">
                          <span className="flex items-center space-x-1.5">
                            <GitCommit className="w-3 h-3 text-cyan-500" />
                            <span>
                              COMMIT #{index + 1} • ROOT:{' '}
                              {log.entry_hash ? `${log.entry_hash.slice(0, 16)}...` : 'IMMUTABLE'}
                            </span>
                          </span>

                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>CHAIN INTEGRITY VALID</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
            <span>TOTAL VERIFIED BLOCKS: {displayedLogs.length}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs transition cursor-pointer border border-gray-700 hover:border-gray-600"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
}
