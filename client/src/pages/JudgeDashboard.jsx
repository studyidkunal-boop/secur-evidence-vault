import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import RoleTopBar from '../components/RoleTopBar';
import AuditTimelineModal from '../components/AuditTimelineModal';
import { useAuth } from '../context/AuthContext';
import { getThemeForRole } from '../config/themeConfig';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import api from '../api/axios';
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Search,
  FileText,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Video,
  FileCheck,
  GitBranch,
  Upload,
  ArrowRight,
  Clock,
  Eye,
} from 'lucide-react';

export default function JudgeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = getThemeForRole('JUDGE');

  const currentPath = location.pathname;
  const isVerifyExternalView = currentPath.includes('/verify-external');
  const isCustodyTrailView = currentPath.includes('/custody-trail');
  const isExhibitsView = !isVerifyExternalView && !isCustodyTrailView;

  const [approvedList, setApprovedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Per-row verification results & timestamp tracking
  const [verificationHistory, setVerificationHistory] = useState({}); // { [id]: { status, timestamp, originalHash, currentHash } }
  const [verifyingId, setVerifyingId] = useState(null);
  const [activeResultCard, setActiveResultCard] = useState(null);
  const [copiedHashKey, setCopiedHashKey] = useState(null);

  // View-Only Watermarked Viewer Modal State
  const [viewingExhibit, setViewingExhibit] = useState(null);

  // Verify External Copy State
  const [selectedExternalExhibitId, setSelectedExternalExhibitId] = useState('');
  const [externalFile, setExternalFile] = useState(null);
  const [verifyingExternal, setVerifyingExternal] = useState(false);
  const [externalResult, setExternalResult] = useState(null);
  const [externalError, setExternalError] = useState('');

  // Custody Trail Dedicated State
  const [selectedTrailExhibitId, setSelectedTrailExhibitId] = useState('');
  const [trailLogs, setTrailLogs] = useState([]);
  const [loadingTrail, setLoadingTrail] = useState(false);

  // Access Denied Toast Warning
  const [accessDeniedToast, setAccessDeniedToast] = useState(
    location.state?.accessDenied ? 'Access denied. You do not have permissions for that console.' : null
  );

  const token = localStorage.getItem('evidence_vault_token') || '';

  useEffect(() => {
    fetchApprovedExhibits();
  }, []);

  useEffect(() => {
    if (accessDeniedToast) {
      const timer = setTimeout(() => setAccessDeniedToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [accessDeniedToast]);

  useEffect(() => {
    if (isCustodyTrailView && selectedTrailExhibitId) {
      fetchExhibitTrail(selectedTrailExhibitId);
    }
  }, [isCustodyTrailView, selectedTrailExhibitId]);

  async function fetchApprovedExhibits() {
    try {
      setLoading(true);
      const res = await api.get('/evidence');
      if (res.data.success) {
        // Backend already filters by status = APPROVED for JUDGE
        const approved = res.data.evidence.filter((e) => e.status === 'APPROVED');
        setApprovedList(approved);
        if (approved.length > 0) {
          if (!selectedExternalExhibitId) setSelectedExternalExhibitId(approved[0].id);
          if (!selectedTrailExhibitId) setSelectedTrailExhibitId(approved[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load approved exhibits:', err);
    } finally {
      setLoading(false);
    }
  }

  // Cryptographic In-Vault Verification
  async function handleVerifyEvidence(e, item) {
    e.stopPropagation();
    setVerifyingId(item.id);

    try {
      const res = await api.get(`/evidence/${item.id}/verify`);
      const resultData = {
        status: res.data.status, // 'VERIFIED' or 'TAMPERED'
        match: res.data.match,
        originalHash: res.data.originalHash || res.data.sealed_db_hash,
        currentHash: res.data.currentHash || res.data.recomputed_storage_hash,
        timestamp: new Date().toISOString(),
        item,
      };

      setVerificationHistory((prev) => ({
        ...prev,
        [item.id]: resultData,
      }));

      setActiveResultCard(resultData);
    } catch (err) {
      const errorResult = {
        status: 'TAMPERED',
        match: false,
        originalHash: item.sha256_hash,
        currentHash: 'ERROR: STORAGE RE-HASH MISMATCH',
        timestamp: new Date().toISOString(),
        item,
      };

      setVerificationHistory((prev) => ({
        ...prev,
        [item.id]: errorResult,
      }));

      setActiveResultCard(errorResult);
    } finally {
      setVerifyingId(null);
    }
  }

  // Verify External Copy File against Vault Sealed Hash
  async function handleVerifyExternalSubmit(e) {
    e.preventDefault();
    if (!selectedExternalExhibitId || !externalFile) {
      setExternalError('Please select an approved exhibit and choose a local file to compare.');
      return;
    }

    try {
      setVerifyingExternal(true);
      setExternalError('');
      setExternalResult(null);

      const formData = new FormData();
      formData.append('file', externalFile);

      const res = await api.post(`/evidence/${selectedExternalExhibitId}/verify-external`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setExternalResult(res.data);
    } catch (err) {
      setExternalError(err.response?.data?.error || err.message || 'Verification of external file failed.');
    } finally {
      setVerifyingExternal(false);
    }
  }

  // Fetch Chronological Custody Trail for selected exhibit
  async function fetchExhibitTrail(evidenceId) {
    if (!evidenceId) return;
    try {
      setLoadingTrail(true);
      const res = await api.get(`/evidence/${evidenceId}/audit-logs`);
      if (res.data.success) {
        setTrailLogs(res.data.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load custody trail:', err);
    } finally {
      setLoadingTrail(false);
    }
  }

  function handleCopyText(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedHashKey(key);
    setTimeout(() => setCopiedHashKey(null), 2000);
  }

  // Filtered Approved Exhibits
  const filteredExhibits = approvedList.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.case_number?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.file_name?.toLowerCase().includes(q) ||
      item.review_remarks?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen w-full bg-white text-slate-800 flex overflow-hidden font-sans select-none">
      {/* Sidebar (Judicial view: No upload or reports items) */}
      <Sidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Judicial Chamber */}
      <main className="flex-1 h-screen overflow-y-auto flex flex-col justify-between px-4 sm:px-6 md:px-8 pt-16 md:pt-6 pb-6 bg-white">
        <div>
          {/* Access Denied Toast Warning */}
          {accessDeniedToast && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{accessDeniedToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setAccessDeniedToast(null)}
                className="font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Bar with Role Accent & Badge ID */}
          <RoleTopBar
            title={
              isVerifyExternalView
                ? 'Verify External Copy'
                : isCustodyTrailView
                ? 'Custody Trail & Ledger'
                : 'Approved Judicial Exhibits'
            }
            subtitle={
              isVerifyExternalView
                ? 'Compare a physical or external defense copy against the vault sealed hash'
                : isCustodyTrailView
                ? 'Chronological cryptographic chain of custody for admitted court exhibits'
                : `Section 63 BSA certified bench examination console • ${approvedList.length} admitted exhibits`
            }
          />

          {/* ACTIVE VERIFICATION RESULT CARD (GREEN / RED) */}
          {activeResultCard && (
            <div
              className={`mb-5 p-5 rounded-2xl border-2 transition-all shadow-md animate-in fade-in ${
                activeResultCard.status === 'VERIFIED'
                  ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-400 text-rose-950'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  {activeResultCard.status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-7 h-7 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        activeResultCard.status === 'VERIFIED'
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {activeResultCard.status === 'VERIFIED'
                        ? 'VERIFIED - INTEGRITY INTACT'
                        : 'CRITICAL WARNING - TAMPERING DETECTED'}
                    </span>
                    <h3 className="text-base font-black mt-1">
                      Case #{activeResultCard.item?.case_number}: {activeResultCard.item?.title}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5 font-medium">
                      {activeResultCard.status === 'VERIFIED'
                        ? 'Cryptographic match confirmed: Cloud storage buffer byte-for-byte identical to sealed vault record.'
                        : 'Hash mismatch detected! Storage payload does not match the sealed database hash.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveResultCard(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {/* Hashes comparison box */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 bg-white/90 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Original Sealed DB Hash</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeResultCard.originalHash, 'orig')}
                      className="text-slate-400 hover:text-emerald-700 transition"
                    >
                      {copiedHashKey === 'orig' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-slate-900 font-bold break-all mt-1">
                    {activeResultCard.originalHash}
                  </div>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Recomputed Storage Hash</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(activeResultCard.currentHash, 'curr')}
                      className="text-slate-400 hover:text-emerald-700 transition"
                    >
                      {copiedHashKey === 'curr' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div
                    className={`font-bold break-all mt-1 ${
                      activeResultCard.status === 'VERIFIED' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {activeResultCard.currentHash}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-500 font-mono text-right">
                Verified at: {new Date(activeResultCard.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* VIEW 1: VERIFY EXTERNAL COPY */}
          {isVerifyExternalView && (
            <div className="max-w-2xl mx-auto space-y-5 pt-2">
              <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      External Evidence Verification Chamber
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload any copy tendered by defense or prosecution to test hash authenticity.
                    </p>
                  </div>
                </div>

                {externalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{externalError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyExternalSubmit} className="space-y-4">
                  {/* Select Exhibit */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Select Approved Exhibit Docket:
                    </label>
                    <select
                      value={selectedExternalExhibitId}
                      onChange={(e) => setSelectedExternalExhibitId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-emerald-600"
                    >
                      {approvedList.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          Case #{ex.case_number} — {ex.title} ({ex.file_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upload external copy file */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Tendered External File to Examine:
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setExternalFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingExternal || !externalFile}
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{verifyingExternal ? 'Computing SHA-256...' : 'Run Cryptographic Cross-Check'}</span>
                  </button>
                </form>
              </div>

              {/* External Result Card */}
              {externalResult && (
                <div
                  className={`p-5 rounded-2xl border-2 shadow-md animate-in fade-in ${
                    externalResult.match
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : 'bg-rose-50 border-rose-400 text-rose-950'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    {externalResult.match ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-rose-600" />
                    )}
                    <h3 className="text-sm font-black">{externalResult.message}</h3>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Sealed Vault Hash</span>
                      <p className="font-bold text-slate-800 break-all mt-0.5">{externalResult.sealed_db_hash}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">External Copy Hash</span>
                      <p className="font-bold text-slate-800 break-all mt-0.5">{externalResult.external_file_hash}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: CUSTODY TRAIL (Read-only audit entries for selected exhibit) */}
          {isCustodyTrailView && (
            <div className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500 font-mono">
                  Select an approved case to view its complete statutory chain of custody:
                </div>

                <select
                  value={selectedTrailExhibitId}
                  onChange={(e) => setSelectedTrailExhibitId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-1 focus:ring-emerald-600"
                >
                  {approvedList.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      Case #{ex.case_number} — {ex.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Officer / Bench</th>
                      <th className="py-3 px-4">Forensic Details</th>
                      <th className="py-3 px-4 text-right">Entry Hash</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-normal">
                    {loadingTrail ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-slate-400">
                          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="font-mono text-xs">Loading custody trail...</span>
                        </td>
                      </tr>
                    ) : trailLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-slate-400">
                          <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No trail events recorded for this exhibit.</p>
                        </td>
                      </tr>
                    ) : (
                      trailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {log.user_name || 'System'} ({log.badge_id || log.log_role})
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                            {log.metadata?.review_remarks || log.metadata?.title || 'Audit event anchored'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                            {log.entry_hash ? `${log.entry_hash.slice(0, 10)}...` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: APPROVED EXHIBITS (Landing Page) */}
          {isExhibitsView && (
            <div className="space-y-3 pt-1">
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Case No</th>
                      <th className="py-3.5 px-4">Exhibit</th>
                      <th className="py-3.5 px-4">DCP Remarks</th>
                      <th className="py-3.5 px-4">Approved At</th>
                      <th className="py-3.5 px-4">Integrity Status</th>
                      <th className="py-3.5 px-4 text-right">Bench Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-normal">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-slate-400">
                          <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="font-mono text-xs">Loading approved court docket...</span>
                        </td>
                      </tr>
                    ) : filteredExhibits.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-slate-400">
                          <theme.emptyState.icon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-700 text-sm">{theme.emptyState.title}</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {theme.emptyState.description}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredExhibits.map((item) => {
                        const verifiedRecord = verificationHistory[item.id];
                        const isVerifying = verifyingId === item.id;

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setViewingExhibit(item)}
                            className="hover:bg-slate-50/70 transition cursor-pointer group"
                          >
                            {/* Case No */}
                            <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                              #{item.case_number}
                            </td>

                            {/* Exhibit Title & Thumbnail */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-9 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center flex-shrink-0">
                                  {item.mime_type?.startsWith('image/') ? (
                                    <img
                                      src={`/api/evidence/${item.id}/stream?token=${encodeURIComponent(token)}`}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : item.mime_type?.startsWith('video/') ? (
                                    <Video className="w-4 h-4 text-cyan-400" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition truncate max-w-[200px]">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                    {item.file_name}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* DCP Remarks */}
                            <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                              <p className="truncate text-xs">{item.review_remarks || 'Certified Section 63 BSA compliant.'}</p>
                              <span className="text-[10px] text-slate-400 font-mono">DCP #{item.reviewed_by?.slice(0, 6) || 'SUPERVISOR'}</span>
                            </td>

                            {/* Approved At */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {item.reviewed_at ? new Date(item.reviewed_at).toLocaleDateString() : '-'}
                            </td>

                            {/* Integrity Badge & Last Verified Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {verifiedRecord ? (
                                <div className="space-y-1">
                                  <span
                                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                      verifiedRecord.status === 'VERIFIED'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    {verifiedRecord.status === 'VERIFIED' ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <ShieldAlert className="w-3 h-3 text-rose-600" />
                                    )}
                                    <span>{verifiedRecord.status}</span>
                                  </span>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Checked: {new Date(verifiedRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200">
                                  Vault Sealed
                                </span>
                              )}
                            </td>

                            {/* Verify Button */}
                            <td
                              className="py-3.5 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={isVerifying}
                                onClick={(e) => handleVerifyEvidence(e, item)}
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                              >
                                <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                                <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* VIEW-ONLY WATERMARKED VIEWER MODAL (No download, no edit, right-click & print disabled) */}
      {viewingExhibit && (
        <div
          onContextMenu={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none print:hidden"
        >
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full p-6 text-white border border-slate-700 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-900/60 border border-emerald-500/40 text-emerald-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                    Judicial View-Only Examination Chamber
                  </span>
                  <h2 className="text-base font-bold text-slate-100">
                    Case #{viewingExhibit.case_number}: {viewingExhibit.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingExhibit(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Security Disclaimer Banner */}
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-[11px] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>
                  Notice: Cryptographically watermarked stream for Judge {user?.name} (Badge: {user?.badge_id}). Direct download and printing are disabled to preserve custody.
                </span>
              </div>
            </div>

            {/* Watermarked Media Stream Viewer */}
            <div className="relative rounded-2xl bg-black border border-slate-800 overflow-hidden flex items-center justify-center min-h-[300px] max-h-[460px]">
              {/* Visible dynamic watermark overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 opacity-30 select-none z-20">
                <div className="flex justify-between font-mono text-xs text-white">
                  <span>SECURA JUDICIAL VAULT</span>
                  <span>{new Date().toISOString()}</span>
                </div>
                <div className="text-center font-mono text-xs sm:text-sm font-bold text-white tracking-widest uppercase rotate-[-12deg]">
                  CONFIDENTIAL • {user?.name} ({user?.badge_id}) • CASE #{viewingExhibit.case_number}
                </div>
                <div className="flex justify-between font-mono text-[10px] text-white">
                  <span>SHA-256: {viewingExhibit.sha256_hash?.slice(0, 16)}...</span>
                  <span>{LEGAL_SHORT_LABEL}</span>
                </div>
              </div>

              {viewingExhibit.mime_type?.startsWith('image/') ? (
                <img
                  src={`/api/evidence/${viewingExhibit.id}/stream?token=${encodeURIComponent(token)}`}
                  alt={viewingExhibit.title}
                  className="max-h-[450px] w-auto object-contain pointer-events-none"
                />
              ) : viewingExhibit.mime_type?.startsWith('video/') ? (
                <video
                  src={`/api/evidence/${viewingExhibit.id}/stream?token=${encodeURIComponent(token)}`}
                  controls
                  controlsList="nodownload"
                  className="max-h-[450px] w-full"
                />
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-500" />
                  <p className="font-mono text-xs text-slate-300">{viewingExhibit.file_name}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Read-only document examination stream active.</p>
                </div>
              )}
            </div>

            {/* Footer with hash and close action */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400 font-mono">
              <span className="truncate max-w-md">SHA-256: {viewingExhibit.sha256_hash}</span>
              <button
                type="button"
                onClick={() => setViewingExhibit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
