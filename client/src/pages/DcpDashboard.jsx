import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import RoleTopBar from '../components/RoleTopBar';
import AuditTimelineModal from '../components/AuditTimelineModal';
import GlobalAudit from './GlobalAudit';
import { useAuth } from '../context/AuthContext';
import { getThemeForRole } from '../config/themeConfig';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import api from '../api/axios';
import {
  Clock,
  Layers,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Video,
  Copy,
  Check,
  Search,
  ExternalLink,
  RefreshCw,
  Eye,
  FileDown,
  ShieldAlert,
} from 'lucide-react';

export default function DcpDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = getThemeForRole('DCP');

  const currentPath = location.pathname;
  const isAllEvidenceView = currentPath.includes('/all-evidence');
  const isAuditView = currentPath.includes('/audit');
  const isReviewQueueView = !isAllEvidenceView && !isAuditView;

  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHashId, setCopiedHashId] = useState(null);

  // Review Modal State
  const [reviewModalItem, setReviewModalItem] = useState(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Audit Chain Verification State
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainStatus, setChainStatus] = useState(null); // 'INTACT' | 'BROKEN'
  const [chainDetails, setChainDetails] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState(
    location.state?.accessDenied
      ? { type: 'error', text: 'Access denied. You do not have permissions for that console.' }
      : null
  );

  // Timeline Modal State
  const [selectedTimelineEvidenceId, setSelectedTimelineEvidenceId] = useState(null);

  const token = localStorage.getItem('evidence_vault_token') || '';

  useEffect(() => {
    fetchDcpEvidence();
    checkChainStatus();
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  async function fetchDcpEvidence() {
    try {
      setLoading(true);
      const res = await api.get('/evidence');
      if (res.data.success) {
        setEvidenceList(res.data.evidence || []);
      }
    } catch (err) {
      console.error('Failed to load evidence registry:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkChainStatus() {
    try {
      setVerifyingChain(true);
      const res = await api.get('/audit/verify');
      if (res.data.status === 'VERIFIED' || res.data.success) {
        setChainStatus('INTACT');
        setChainDetails(res.data.details || res.data);
      } else {
        setChainStatus('BROKEN');
        setChainDetails(res.data.details || res.data);
      }
    } catch (err) {
      setChainStatus('BROKEN');
      setChainDetails({ error: err.response?.data?.error || err.message });
    } finally {
      setVerifyingChain(false);
    }
  }

  function handleCopyHash(id, hash) {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2500);
  }

  function openReviewModal(item) {
    setReviewModalItem(item);
    setReviewRemarks(item.review_remarks || '');
    setReviewError('');
  }

  function closeReviewModal() {
    setReviewModalItem(null);
    setReviewRemarks('');
    setReviewError('');
  }

  async function handleSubmitReview(decisionStatus) {
    if (!reviewModalItem) return;

    // Separation of Duties check in UI
    if (reviewModalItem.uploaded_by === user?.id) {
      setReviewError('Separation of duties: You cannot review evidence that you uploaded yourself.');
      return;
    }

    // Require remarks on REJECTED
    if (decisionStatus === 'REJECTED' && !reviewRemarks.trim()) {
      setReviewError('Review remarks are strictly mandatory when rejecting evidence.');
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError('');

      const res = await api.patch(`/evidence/${reviewModalItem.id}/review`, {
        status: decisionStatus,
        remarks: reviewRemarks.trim() || `Certified ${LEGAL_SHORT_LABEL} compliant by reviewing authority.`,
      });

      if (res.data.success) {
        setToastMessage({
          type: 'success',
          text: `Case #${reviewModalItem.case_number} ${decisionStatus.toLowerCase()} successfully.`,
        });

        // Update local list
        setEvidenceList((prev) =>
          prev.map((e) => (e.id === reviewModalItem.id ? res.data.evidence : e))
        );
        closeReviewModal();
      } else {
        throw new Error(res.data.error || 'Failed to record review decision.');
      }
    } catch (err) {
      setReviewError(err.response?.data?.error || err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  }

  // Counts for Stats Cards
  const pendingItems = evidenceList.filter((e) => e.status === 'PENDING');
  const approvedItems = evidenceList.filter((e) => e.status === 'APPROVED');
  const rejectedItems = evidenceList.filter((e) => e.status === 'REJECTED');

  // Filtered evidence based on active view and search
  const displayedList = (isReviewQueueView ? pendingItems : evidenceList).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.case_number?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.uploader_name?.toLowerCase().includes(q) ||
      item.uploader_badge?.toLowerCase().includes(q) ||
      item.file_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen w-full bg-white text-slate-800 flex overflow-hidden font-sans">
      {/* Sidebar with pending review count passed */}
      <Sidebar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        pendingReviewCount={pendingItems.length}
        onTriggerChainVerify={checkChainStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto flex flex-col justify-between px-4 sm:px-6 md:px-8 pt-16 md:pt-6 pb-6 bg-white">
        <div>
          {/* Toast Notification */}
          {toastMessage && (
            <div
              className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in ${
                toastMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {toastMessage.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="font-bold ml-4"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Bar with Role Accent & Badge ID */}
          <RoleTopBar
            title={
              isAuditView
                ? 'Global System Audit Ledger'
                : isAllEvidenceView
                ? 'Complete Evidence Vault'
                : 'Supervisory Review Queue'
            }
            subtitle={
              isAuditView
                ? 'Hash-chained, tamper-evident cryptographic log of all system actions'
                : isAllEvidenceView
                ? 'All admitted, pending, and rejected electronic records across all districts'
                : `Section 63 BSA custody review console • ${pendingItems.length} records awaiting judicial certification`
            }
            actions={
              <button
                type="button"
                onClick={checkChainStatus}
                disabled={verifyingChain}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
                <span>{verifyingChain ? 'Recomputing Hashes...' : 'Verify Audit Chain'}</span>
              </button>
            }
          />

          {/* If Audit View is selected, render Global Audit component */}
          {isAuditView ? (
            <GlobalAudit />
          ) : (
            <>
              {/* TOP STATS CARDS: Pending, Approved, Rejected, Audit Chain Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">
                {/* Pending Card */}
                <div
                  onClick={() => navigate('/dcp/review-queue')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isReviewQueueView
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-amber-700 uppercase tracking-wider">
                      Pending Review
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {pendingItems.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Awaiting DCP signature</div>
                </div>

                {/* Approved Card */}
                <div
                  onClick={() => navigate('/dcp/all-evidence')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-emerald-700 uppercase tracking-wider">
                      Approved
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {approvedItems.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Court admissible exhibits</div>
                </div>

                {/* Rejected Card */}
                <div
                  onClick={() => navigate('/dcp/all-evidence')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono text-rose-700 uppercase tracking-wider">
                      Rejected
                    </span>
                    <XCircle className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {rejectedItems.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Custody defects returned</div>
                </div>

                {/* Cryptographic Audit Chain Status Card */}
                <div
                  onClick={checkChainStatus}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    chainStatus === 'INTACT'
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : chainStatus === 'BROKEN'
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-700">
                      Audit Chain
                    </span>
                    {chainStatus === 'INTACT' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : chainStatus === 'BROKEN' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="text-sm font-black mt-2 font-mono flex items-center space-x-1.5">
                    {chainStatus === 'INTACT' ? (
                      <span className="text-emerald-700">CHAIN INTACT</span>
                    ) : chainStatus === 'BROKEN' ? (
                      <span className="text-rose-700">
                        {chainDetails?.brokenAtId
                          ? `BROKEN @ #${chainDetails.brokenAtId}`
                          : 'TAMPER DETECTED'}
                      </span>
                    ) : (
                      <span className="text-slate-500">VERIFYING...</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {chainStatus === 'INTACT'
                      ? `${chainDetails?.totalChecked ?? 0} blocks validated`
                      : 'Click to re-verify hashes'}
                  </div>
                </div>
              </div>

              {/* SECTION: Evidence Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">
                    {isReviewQueueView ? 'Pending Supervisory Queue' : 'All System Evidence'} (
                    {displayedList.length})
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold font-mono text-[11px] uppercase tracking-wider">
                        <th className="py-3.5 px-4">Case No</th>
                        <th className="py-3.5 px-4">Exhibit</th>
                        <th className="py-3.5 px-4">Seizing Officer</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Ingested At</th>
                        <th className="py-3.5 px-4">SHA-256</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="7" className="py-16 text-center text-slate-400">
                            <div className="w-7 h-7 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <span className="font-mono text-xs">Loading review docket...</span>
                          </td>
                        </tr>
                      ) : displayedList.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-16 text-center text-slate-400">
                            <theme.emptyState.icon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-bold text-slate-700 text-sm">{theme.emptyState.title}</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                              {theme.emptyState.description}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        displayedList.map((item) => {
                          const isSelfUploaded = item.uploaded_by === user?.id;
                          const isPending = item.status === 'PENDING';
                          const isApproved = item.status === 'APPROVED';
                          const isRejected = item.status === 'REJECTED';

                          return (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/70 transition cursor-pointer group"
                              onClick={() => openReviewModal(item)}
                            >
                              {/* Case No */}
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-600 whitespace-nowrap">
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
                                    <div className="font-bold text-slate-900 group-hover:text-amber-600 transition truncate max-w-[200px]">
                                      {item.title}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                      {item.file_name}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Seizing Officer */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {item.uploader_name || item.uploaded_by_name || 'Officer'}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  Badge: {item.uploader_badge || item.uploaded_by_badge || 'N/A'}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isApproved ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    APPROVED
                                  </span>
                                ) : isRejected ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    REJECTED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    PENDING
                                  </span>
                                )}
                              </td>

                              {/* Ingested At */}
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                              </td>

                              {/* SHA-256 Short + Copy */}
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
                                    title="Copy SHA-256"
                                    className="p-1 rounded text-slate-400 hover:text-amber-600 transition"
                                  >
                                    {copiedHashId === item.id ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              {/* Action */}
                              <td
                                className="py-3.5 px-4 text-right whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSelfUploaded ? (
                                  <span
                                    title="Separation of duties: Review disabled for self-uploaded exhibits"
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-400 text-[10px] font-mono font-bold border border-slate-200 cursor-not-allowed"
                                  >
                                    Self-Uploaded
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(item)}
                                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                                  >
                                    {isPending ? 'Review & Sign' : 'View Docket'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* REVIEW MODAL (File preview, full hash, uploader details, Approve/Reject, remarks on reject) */}
      {reviewModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {LEGAL_SHORT_LABEL} Supervisory Review
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  Case #{reviewModalItem.case_number}: {reviewModalItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Error banner in modal */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* File Preview Container */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 flex items-center justify-center min-h-[180px] max-h-[260px]">
              {reviewModalItem.mime_type?.startsWith('image/') ? (
                <img
                  src={`/api/evidence/${reviewModalItem.id}/stream?token=${encodeURIComponent(token)}`}
                  alt={reviewModalItem.title}
                  className="max-h-[250px] w-auto object-contain"
                />
              ) : reviewModalItem.mime_type?.startsWith('video/') ? (
                <video
                  src={`/api/evidence/${reviewModalItem.id}/stream?token=${encodeURIComponent(token)}`}
                  controls
                  className="max-h-[250px] w-full"
                />
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-mono">{reviewModalItem.file_name}</p>
                </div>
              )}
            </div>

            {/* Full Cryptographic Hash Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Sealed SHA-256 Hash</div>
              <div className="text-slate-800 break-all select-all font-semibold mt-0.5">
                {reviewModalItem.sha256_hash}
              </div>
            </div>

            {/* Seizure Specifications & Uploader Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Seizing Officer:</span>
                <p className="font-bold text-slate-800">
                  {reviewModalItem.uploader_name || reviewModalItem.uploaded_by_name || 'Inspector'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Badge ID:</span>
                <p className="font-mono text-slate-800">
                  {reviewModalItem.uploader_badge || reviewModalItem.uploaded_by_badge || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Category:</span>
                <p className="font-medium text-slate-800">{reviewModalItem.category || 'Digital Device'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Seizure Landmark:</span>
                <p className="font-medium text-slate-800 truncate">{reviewModalItem.seizure_address || 'On file'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Independent Witness:</span>
                <p className="font-medium text-slate-800">{reviewModalItem.witness_name || 'Witness verified'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Witness Contact:</span>
                <p className="font-mono text-slate-800">{reviewModalItem.witness_contact || 'Archived'}</p>
              </div>
            </div>

            {/* Supervisory Review Remarks Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>DCP Custody Remarks:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Strictly mandatory on Reject)
                </span>
              </label>
              <textarea
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Enter review findings, chain defects, or Section 63 BSA compliance remarks..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Separation of Duties Warning if self-uploaded */}
            {reviewModalItem.uploaded_by === user?.id && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Separation of Duties Restriction: You uploaded this evidence record. In accordance with forensic protocol, review decisions must be issued by another supervisory officer.
                </span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={closeReviewModal}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>

              <div className="flex items-center space-x-2">
                {/* Reject Button */}
                <button
                  type="button"
                  disabled={reviewSubmitting || reviewModalItem.uploaded_by === user?.id}
                  onClick={() => handleSubmitReview('REJECTED')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {reviewSubmitting ? 'Recording...' : 'Reject Exhibit'}
                </button>

                {/* Approve Button */}
                <button
                  type="button"
                  disabled={reviewSubmitting || reviewModalItem.uploaded_by === user?.id}
                  onClick={() => handleSubmitReview('APPROVED')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  {reviewSubmitting ? 'Recording...' : 'Approve for Court (Sec 63 BSA)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Timeline Modal */}
      <AuditTimelineModal
        evidenceId={selectedTimelineEvidenceId}
        isOpen={Boolean(selectedTimelineEvidenceId)}
        onClose={() => setSelectedTimelineEvidenceId(null)}
      />
    </div>
  );
}
