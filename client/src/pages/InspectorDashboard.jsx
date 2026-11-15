import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import RoleTopBar from '../components/RoleTopBar';
import IngestEvidenceView from '../components/IngestEvidenceView';
import AuditTimelineModal from '../components/AuditTimelineModal';
import { useAuth } from '../context/AuthContext';
import { getThemeForRole } from '../config/themeConfig';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import api from '../api/axios';
import {
  FolderLock,
  PlusCircle,
  History,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  FileText,
  Video,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';

export default function InspectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = getThemeForRole('INSPECTOR');

  // Active View determination based on URL path
  const currentPath = location.pathname;
  const isIngestView = currentPath.includes('/ingest');
  const isActivityView = currentPath.includes('/activity');
  const isEvidenceView = !isIngestView && !isActivityView;

  // Evidence state
  const [evidenceList, setEvidenceList] = useState([]);
  const [loadingEvidence, setLoadingEvidence] = useState(true);
  const [copiedHashId, setCopiedHashId] = useState(null);
  const [selectedTimelineEvidenceId, setSelectedTimelineEvidenceId] = useState(null);
  const [resubmitTarget, setResubmitTarget] = useState(null);

  // Status Filter chips (All / Pending / Approved / Rejected)
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Activity state
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);

  // Access Denied Toast (from ProtectedRoute redirection)
  const [accessDeniedToast, setAccessDeniedToast] = useState(
    location.state?.accessDenied ? 'Access denied. You do not have permissions for that console.' : null
  );

  useEffect(() => {
    fetchMyEvidence();
  }, []);

  useEffect(() => {
    if (isActivityView) {
      fetchMyActivity();
    }
  }, [isActivityView, activityPage]);

  // Clear toast after 5 seconds
  useEffect(() => {
    if (accessDeniedToast) {
      const timer = setTimeout(() => setAccessDeniedToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [accessDeniedToast]);

  async function fetchMyEvidence() {
    try {
      setLoadingEvidence(true);
      const res = await api.get('/evidence/my-evidence');
      if (res.data.success) {
        setEvidenceList(res.data.evidence || []);
      }
    } catch (err) {
      console.error('Failed to load inspector evidence:', err);
    } finally {
      setLoadingEvidence(false);
    }
  }

  async function fetchMyActivity() {
    try {
      setLoadingActivity(true);
      const res = await api.get(`/audit/my-activity?page=${activityPage}&limit=25`);
      if (res.data.success) {
        setActivityLogs(res.data.logs || []);
        setActivityTotal(res.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to load my activity:', err);
    } finally {
      setLoadingActivity(false);
    }
  }

  function handleCopyHash(id, hash) {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2500);
  }

  function handleResubmit(item) {
    setResubmitTarget(item);
    navigate('/inspector/ingest');
  }

  // Filter chips counts
  const allCount = evidenceList.length;
  const pendingCount = evidenceList.filter((e) => e.status === 'PENDING').length;
  const approvedCount = evidenceList.filter((e) => e.status === 'APPROVED').length;
  const rejectedCount = evidenceList.filter((e) => e.status === 'REJECTED').length;

  const filteredEvidence = evidenceList.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      item.case_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="h-screen w-full bg-white text-slate-800 flex overflow-hidden font-sans">
      {/* Role Config-Driven Left Sidebar */}
      <Sidebar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Main Content Area */}
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
                className="text-rose-500 hover:text-rose-700 font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Bar with Role Accent & Badge ID */}
          <RoleTopBar
            title={
              isIngestView
                ? 'Ingest Evidence'
                : isActivityView
                ? 'My Activity Log'
                : 'My Evidence Registry'
            }
            subtitle={
              isIngestView
                ? 'Field seizure capture and cryptographic Section 63 BSA ingestion'
                : isActivityView
                ? 'Tamper-evident audit chain of your authenticated actions'
                : `Sole jurisdiction over evidence submitted under Officer Badge #${user?.badge_id || '—'}`
            }
          />

          {/* VIEW 1: INGEST EVIDENCE */}
          {isIngestView && (
            <div className="pt-2">
              <IngestEvidenceView
                initialData={resubmitTarget}
                onSuccess={(newRecord) => {
                  setEvidenceList((prev) => [newRecord, ...prev]);
                  setResubmitTarget(null);
                }}
                onNavigateRegistry={() => {
                  setResubmitTarget(null);
                  navigate('/inspector/evidence');
                }}
              />
            </div>
          )}

          {/* VIEW 2: MY ACTIVITY (Own audit logs only) */}
          {isActivityView && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500 font-mono">
                  Displaying authenticated forensic actions for user #{user?.id?.slice(0, 8)}... ({activityTotal} total)
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Action Taken</th>
                      <th className="py-3.5 px-4">Evidence / Case Ref</th>
                      <th className="py-3.5 px-4">Network / IP</th>
                      <th className="py-3.5 px-4 text-right">Entry Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingActivity ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-slate-400">
                          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="font-mono text-xs">Loading personal audit trail...</span>
                        </td>
                      </tr>
                    ) : activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-slate-400">
                          <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No activity logged yet under your badge.</p>
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {log.metadata?.case_number ? (
                              <span className="font-bold text-blue-600">#{log.metadata.case_number}</span>
                            ) : log.evidence_id ? (
                              `ID: ${log.evidence_id.slice(0, 8)}...`
                            ) : (
                              'System Session'
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {log.ip_address || '127.0.0.1'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">
                            {log.entry_hash ? `${log.entry_hash.slice(0, 12)}...` : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 3: MY EVIDENCE (Landing Page) */}
          {isEvidenceView && (
            <div className="space-y-4 pt-1">
              {/* Status Filter Chips: All / Pending / Approved / Rejected */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({allCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'PENDING'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Pending Review ({pendingCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('APPROVED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Approved ({approvedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter('REJECTED')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    Rejected ({rejectedCount})
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Showing {filteredEvidence.length} of {evidenceList.length} exhibits
                </div>
              </div>

              {/* Data Table: Case No, Title, File Name, Status, SHA-256 (short + copy), Uploaded At, Actions */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold font-mono text-[11px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Case No</th>
                      <th className="py-3.5 px-4">Title & Details</th>
                      <th className="py-3.5 px-4">File Name</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">SHA-256 Hash</th>
                      <th className="py-3.5 px-4">Uploaded At</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {loadingEvidence ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-slate-400">
                          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="font-mono text-xs">Loading evidence repository...</span>
                        </td>
                      </tr>
                    ) : filteredEvidence.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center text-slate-400">
                          <theme.emptyState.icon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-slate-700 text-sm">{theme.emptyState.title}</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{theme.emptyState.description}</p>
                          <button
                            type="button"
                            onClick={() => navigate('/inspector/ingest')}
                            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                          >
                            + Ingest First Evidence
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredEvidence.map((item) => {
                        const isRejected = item.status === 'REJECTED';
                        const isApproved = item.status === 'APPROVED';

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/70 transition cursor-pointer group ${
                              isRejected ? 'bg-rose-50/20' : ''
                            }`}
                            onClick={() => navigate(`/evidence/${item.id}`)}
                          >
                            {/* Case No */}
                            <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                              #{item.case_number}
                            </td>

                            {/* Title & Category & Rejection Remarks if applicable */}
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5">
                                <span className="font-medium">{item.category}</span>
                              </div>

                              {/* Prominently show DCP remarks if rejected */}
                              {isRejected && item.review_remarks && (
                                <div className="mt-1.5 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                                  <span className="font-bold">DCP Rejection Reason: </span>
                                  <span>{item.review_remarks}</span>
                                </div>
                              )}
                            </td>

                            {/* File Name */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              <div className="flex items-center space-x-1.5">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate max-w-[140px]">{item.file_name}</span>
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isApproved ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>APPROVED</span>
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>REJECTED</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>PENDING REVIEW</span>
                                </span>
                              )}
                            </td>

                            {/* SHA-256 (First 10 chars + Copy button) */}
                            <td
                              className="py-3.5 px-4 font-mono text-xs whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/80">
                                <span className="text-slate-700 font-semibold">
                                  {item.sha256_hash?.slice(0, 10)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyHash(item.id, item.sha256_hash)}
                                  title="Copy Full SHA-256 Hash"
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                >
                                  {copiedHashId === item.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Uploaded At */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                            </td>

                            {/* Actions: View Details + Resubmit (if rejected) */}
                            <td
                              className="py-3.5 px-4 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-end space-x-2">
                                {isRejected && (
                                  <button
                                    type="button"
                                    onClick={() => handleResubmit(item)}
                                    title="Resubmit Corrected Version"
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Resubmit</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => navigate(`/evidence/${item.id}`)}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

      {/* Visual Audit Chain Timeline Modal */}
      <AuditTimelineModal
        evidenceId={selectedTimelineEvidenceId}
        isOpen={Boolean(selectedTimelineEvidenceId)}
        onClose={() => setSelectedTimelineEvidenceId(null)}
      />
    </div>
  );
}
