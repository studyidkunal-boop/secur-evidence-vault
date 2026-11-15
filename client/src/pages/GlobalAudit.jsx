import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AuditTimelineModal from '../components/AuditTimelineModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Clock,
  User,
  Database,
  Link as ChainIcon,
  ChevronRight,
  ExternalLink,
  Laptop,
  Globe,
  Lock,
  X,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
} from 'lucide-react';

export default function GlobalAudit() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL'); // ALL, ALERTS, UPLOADS, APPROVALS
  
  // Chain Verification State
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainVerification, setChainVerification] = useState(null);

  // Modals & Clipboard
  const [copiedKey, setCopiedKey] = useState(null);
  const [inspectEntry, setInspectEntry] = useState(null);
  const [selectedTimelineEvidenceId, setSelectedTimelineEvidenceId] = useState(null);

  useEffect(() => {
    fetchGlobalLogs();
  }, []);

  async function fetchGlobalLogs() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/audit-logs/global?limit=100');
      if (res.data.success) {
        setLogs(res.data.logs || []);
      } else {
        throw new Error(res.data.error || 'Failed to retrieve global audit records');
      }
    } catch (err) {
      console.error('[Global Audit Fetch Error]:', err);
      setError(err.response?.data?.error || err.message || 'Unable to connect to audit database');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyChain() {
    try {
      setVerifyingChain(true);
      setChainVerification(null);
      const res = await api.get('/audit/verify-chain');
      setChainVerification(res.data);
    } catch (err) {
      console.error('[Audit Chain Verification Error]:', err);
      setChainVerification({
        verified: false,
        message: err.response?.data?.error || 'Chain integrity verification failed.',
        details: err.response?.data?.details || {},
      });
    } finally {
      setVerifyingChain(false);
    }
  }

  function handleCopy(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  // Device & OS Parser for user-agent
  function parseClientDevice(userAgent, ipAddress) {
    if (!userAgent) {
      return {
        label: 'Node Daemon (Background)',
        ip: ipAddress || '127.0.0.1',
      };
    }

    const ua = userAgent.toLowerCase();
    let os = 'Unknown OS';
    let browser = 'Unknown Client';

    if (ua.includes('windows')) os = 'Windows Workstation';
    else if (ua.includes('mac')) os = 'macOS Official';
    else if (ua.includes('linux')) os = 'Linux Terminal';
    else if (ua.includes('android')) os = 'Android GovNet';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS GovNet';

    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';

    const ip = ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1'
      ? ipAddress
      : '10.240.18.4'; // Institutional Intranet Mock

    return {
      label: `${os} • ${browser}`,
      ip,
    };
  }

  // Action Classification
  function isAlertAction(action) {
    const a = (action || '').toUpperCase();
    return (
      a.includes('TAMPER') ||
      a.includes('ALERT') ||
      a.includes('REJECT') ||
      a.includes('FAIL') ||
      a.includes('SUSPICIOUS')
    );
  }

  function isUploadAction(action) {
    const a = (action || '').toUpperCase();
    return a.includes('INGEST') || a.includes('UPLOAD') || a.includes('CREATE');
  }

  function isApprovalAction(action) {
    const a = (action || '').toUpperCase();
    return a.includes('APPROV') || a.includes('VERIF') || a.includes('CERTIF');
  }

  // Filtered List calculation
  const filteredLogs = logs.filter((log) => {
    // 1. Action Filter
    if (actionFilter === 'ALERTS' && !isAlertAction(log.action)) return false;
    if (actionFilter === 'UPLOADS' && !isUploadAction(log.action)) return false;
    if (actionFilter === 'APPROVALS' && !isApprovalAction(log.action)) return false;

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const officer = (log.officer_name || '').toLowerCase();
      const badge = (log.officer_badge || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const evidenceId = (log.evidence_id || '').toLowerCase();
      const caseNumber = (log.case_number || '').toLowerCase();
      const ip = (log.ip_address || '').toLowerCase();

      return (
        officer.includes(q) ||
        badge.includes(q) ||
        action.includes(q) ||
        evidenceId.includes(q) ||
        caseNumber.includes(q) ||
        ip.includes(q)
      );
    }

    return true;
  });

  const alertsCount = logs.filter((l) => isAlertAction(l.action)).length;
  const uploadsCount = logs.filter((l) => isUploadAction(l.action)).length;
  const approvalsCount = logs.filter((l) => isApprovalAction(l.action)).length;

  return (
    /* Edge-to-Edge Full Screen Layout matching rest of application */
    <div className="flex h-screen bg-white text-slate-800 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Console Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-white pt-14 md:pt-0">
        {/* Top Header Bar */}
        <header className="px-6 sm:px-8 pt-5 pb-4 border-b border-slate-200/90 bg-white sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900">
                <Activity className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
                Global System Audit Registry
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                LIVE TRAIL
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Tamper-evident, hash-chained Section 65B forensic audit chain across all state nodes.
            </p>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Verify Cryptographic Chain Button */}
            <button
              type="button"
              onClick={handleVerifyChain}
              disabled={verifyingChain}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer ${
                chainVerification?.verified
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-black text-white hover:bg-slate-800'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
              <span>
                {verifyingChain
                  ? 'Verifying Chain...'
                  : chainVerification?.verified
                  ? 'Chain Intact (Verified)'
                  : 'Verify Hash Chain'}
              </span>
            </button>

            {/* Reload Button */}
            <button
              type="button"
              onClick={fetchGlobalLogs}
              disabled={loading}
              title="Refresh Logs"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-black transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Verification Status Banner (If clicked) */}
        {chainVerification && (
          <div className="mx-6 sm:mx-8 mt-4">
            <div
              className={`p-4 rounded-2xl border flex items-start justify-between text-xs ${
                chainVerification.verified
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-start space-x-3">
                {chainVerification.verified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold tracking-tight text-sm">
                    {chainVerification.verified
                      ? 'Chain intact — Cryptographic integrity confirmed'
                      : `Chain broken at entry #${chainVerification.details?.brokenAtId || 'N'}`}
                  </div>
                  {chainVerification.details && (
                    <div className="mt-1 font-mono text-[11px] text-slate-600">
                      Total Blocks Verified: {chainVerification.details.totalChecked ?? logs.length} • Latest Root Hash: {chainVerification.details.latestEntryHash?.slice(0, 16)}...
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChainVerification(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <section className="px-6 sm:px-8 pt-5 pb-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Search Bar */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Officer Name, Evidence ID, Case #, or Action..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter by Action Dropdown */}
            <div className="flex items-center space-x-2">
              <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 absolute left-3 pointer-events-none text-slate-400" />
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none"
                >
                  <option value="ALL">All Actions ({logs.length})</option>
                  <option value="ALERTS">Alerts ({alertsCount})</option>
                  <option value="UPLOADS">Uploads ({uploadsCount})</option>
                  <option value="APPROVALS">Approvals ({approvalsCount})</option>
                </select>
                <div className="absolute right-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
              </div>

              {/* Quick Status Pill Counter */}
              <div className="hidden lg:flex items-center space-x-1.5 pl-2 text-xs font-mono text-slate-500">
                <span className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                  Showing <strong className="text-slate-900">{filteredLogs.length}</strong> of {logs.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Global Audit Data Table */}
        <section className="px-6 sm:px-8 py-2 flex-1 pb-8">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-mono text-slate-500">LOADING CRYPTOGRAPHIC AUDIT LOGS...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center px-4">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-rose-600">{error}</p>
                <button
                  onClick={fetchGlobalLogs}
                  className="mt-3 px-4 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs hover:bg-rose-100 font-semibold"
                >
                  Retry Loading
                </button>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center px-4">
                <Database className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-60" />
                <h3 className="text-sm font-bold text-slate-700">No Matching Audit Entries</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No cryptographic logs match your current search query or action filter.
                </p>
                {(searchQuery || actionFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActionFilter('ALL');
                    }}
                    className="mt-3 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  {/* Table Header */}
                  <thead className="bg-[#f8f9fa] text-slate-700 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100 select-none">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Timestamp</th>
                      <th className="py-3 px-4 font-semibold">Officer</th>
                      <th className="py-3 px-3 font-semibold">Role</th>
                      <th className="py-3 px-4 font-semibold">Action Taken</th>
                      <th className="py-3 px-4 font-semibold">Evidence Ref</th>
                      <th className="py-3 px-4 font-semibold">IP & Device</th>
                      <th className="py-3 px-3 font-semibold text-right">Chain Proof</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredLogs.map((log) => {
                      const device = parseClientDevice(log.user_agent, log.ip_address);
                      const isAlert = isAlertAction(log.action);
                      const isUpload = isUploadAction(log.action);
                      const isApprove = isApprovalAction(log.action);

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          onClick={() => setInspectEntry(log)}
                        >
                          {/* 1. Timestamp */}
                          <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-black transition-colors" />
                              <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(log.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>

                          {/* 2. Officer Name & Badge */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700 flex-shrink-0">
                                {(log.officer_name || 'S')[0]}
                              </div>
                              <div className="truncate max-w-[140px]">
                                <div className="font-semibold text-slate-900 group-hover:text-black truncate">
                                  {log.officer_name || 'System Daemon'}
                                </div>
                                {log.officer_badge && (
                                  <div className="font-mono text-[10px] text-slate-400 truncate">
                                    {log.officer_badge}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Role */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border whitespace-nowrap ${
                                log.role === 'INSPECTOR'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : log.role === 'DCP'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : log.role === 'JUDGE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {log.role || 'SYSTEM'}
                            </span>
                          </td>

                          {/* 4. Action Taken */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  isAlert
                                    ? 'bg-rose-500'
                                    : isUpload
                                    ? 'bg-blue-500'
                                    : isApprove
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-400'
                                }`}
                              />
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border tracking-wide whitespace-nowrap ${
                                  isAlert
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isUpload
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : isApprove
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {log.action}
                              </span>
                            </div>
                          </td>

                          {/* 5. Evidence Reference */}
                          <td className="py-3.5 px-4">
                            {log.evidence_id ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono text-blue-600 font-bold">
                                    {log.case_number || 'CASE-ITEM'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTimelineEvidenceId(log.evidence_id);
                                    }}
                                    title="View Audit Timeline"
                                    className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    <ChainIcon className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {log.evidence_id.slice(0, 8)}...{log.evidence_id.slice(-4)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Auth / System</span>
                            )}
                          </td>

                          {/* 6. IP Address / Device */}
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-800 font-semibold">{device.ip}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {device.label}
                            </div>
                          </td>

                          {/* 7. Chain Proof / Truncated Entry Hash */}
                          <td className="py-3.5 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <span className="text-slate-600 group-hover:text-black transition-colors">
                                {log.entry_hash ? `${log.entry_hash.slice(0, 6)}...${log.entry_hash.slice(-4)}` : 'HASH_PENDING'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopy(log.entry_hash, log.id);
                                }}
                                title="Copy Entry Hash"
                                className="p-1 rounded text-slate-400 hover:text-black hover:bg-slate-100 transition cursor-pointer"
                              >
                                {copiedKey === log.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Forensic Log Inspection Modal (Clean Light Theme) */}
      {inspectEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl text-slate-800 relative overflow-hidden">
            <button
              onClick={() => setInspectEntry(null)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-900">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Cryptographic Audit Block Inspection
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  BLOCK-ID: {inspectEntry.id}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Action Executed</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{inspectEntry.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Acting Officer</span>
                  <span className="font-semibold text-slate-900">{inspectEntry.officer_name || 'System Daemon'} ({inspectEntry.role})</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Timestamp</span>
                  <span className="font-mono text-slate-700">{new Date(inspectEntry.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">Associated Case</span>
                  <span className="font-mono text-blue-600 font-bold">{inspectEntry.case_number || 'N/A (Global Event)'}</span>
                </div>
              </div>

              {/* Cryptographic Hash Chaining */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>PREVIOUS BLOCK HASH (prev_hash)</span>
                    <button
                      onClick={() => handleCopy(inspectEntry.prev_hash, 'modal_prev')}
                      className="text-blue-600 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'modal_prev' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-white font-mono text-[11px] text-slate-700 break-all select-all border border-slate-200">
                    {inspectEntry.prev_hash || '0'.repeat(64)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                    <span>CURRENT BLOCK ENTRY HASH (entry_hash)</span>
                    <button
                      onClick={() => handleCopy(inspectEntry.entry_hash, 'modal_entry')}
                      className="text-blue-600 hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      {copiedKey === 'modal_entry' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-white font-mono text-[11px] text-slate-900 font-bold break-all select-all border border-slate-300">
                    {inspectEntry.entry_hash}
                  </div>
                </div>
              </div>

              {/* JSON Metadata */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Entry Forensic Metadata</span>
                <pre className="p-3 bg-slate-950 text-slate-100 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-40">
                  {JSON.stringify(inspectEntry.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectEntry(null)}
                className="px-5 py-2.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Timeline Modal for specific evidence */}
      {selectedTimelineEvidenceId && (
        <AuditTimelineModal
          evidenceId={selectedTimelineEvidenceId}
          isOpen={Boolean(selectedTimelineEvidenceId)}
          onClose={() => setSelectedTimelineEvidenceId(null)}
        />
      )}
    </div>
  );
}
