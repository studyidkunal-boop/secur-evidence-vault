import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import VerificationResultCard from '../components/VerificationResultCard';
import AuditTimelineModal from '../components/AuditTimelineModal';
import { useAuth } from '../context/AuthContext';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import api from '../api/axios';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Copy,
  Check,
  FileText,
  Clock,
  User,
  Mail,
  Phone,
  Eye,
  FileCheck2,
  AlertTriangle,
  Upload,
  Calendar,
  MapPin,
  Lock,
  Download,
  Search,
  CheckCircle2,
  Scale,
  RefreshCw,
  Link as ChainIcon,
  FileDown,
  Maximize2,
  CheckCheck,
} from 'lucide-react';

export default function EvidenceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getRoleHomePath } = useAuth();

  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Verification state
  const [verifyingInternal, setVerifyingInternal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  // External Verification file upload
  const [externalFile, setExternalFile] = useState(null);
  const [verifyingExternal, setVerifyingExternal] = useState(false);
  const externalFileRef = useRef(null);

  // DCP Review state
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Structured Content & Readable Viewer state
  const [contentData, setContentData] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState('');
  const [showFullViewer, setShowFullViewer] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [selectedMediaPreview, setSelectedMediaPreview] = useState(0);

  // Visual Audit Chain Timeline Modal State
  const [showTimelineModal, setShowTimelineModal] = useState(false);

  const token = localStorage.getItem('evidence_vault_token') || '';
  const isDcp = user?.role === 'DCP';
  const isJudge = user?.role === 'JUDGE';

  useEffect(() => {
    fetchEvidence();
    fetchContent();
  }, [id]);

  async function fetchEvidence() {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/evidence/${id}`);
      if (res.data.success) {
        setEvidence(res.data.evidence);
      } else {
        throw new Error(res.data.error || 'Failed to fetch evidence record');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error loading evidence');
    } finally {
      setLoading(false);
    }
  }

  async function fetchContent() {
    try {
      setLoadingContent(true);
      setContentError('');
      const res = await api.get(`/evidence/${id}/content`);
      if (res.data.success) {
        setContentData(res.data);
      }
    } catch (err) {
      setContentError(err.response?.data?.error || 'Preview stream unavailable.');
    } finally {
      setLoadingContent(false);
    }
  }

  function handleCopyHash() {
    if (evidence?.sha256_hash) {
      navigator.clipboard.writeText(evidence.sha256_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDownloadReport() {
    try {
      setDownloadingReport(true);
      const res = await api.get(`/evidence/${id}/report`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Court_Report_Case_${evidence?.case_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download court report error:', err);
      alert('Failed to generate Section 65B Court Report. Please try again.');
    } finally {
      setDownloadingReport(false);
    }
  }

  // 1. Verify Stored File (Internal Re-hash)
  async function handleVerifyStoredFile() {
    setVerifyingInternal(true);
    setVerificationResult(null);

    try {
      const res = await api.post(`/evidence/${id}/verify`);
      if (res.data) {
        setVerificationResult({
          ...res.data,
          type: 'INTERNAL',
        });
      }
    } catch (err) {
      setVerificationResult({
        match: false,
        status: 'TAMPERED',
        message: err.response?.data?.error || 'Verification process encountered a critical error.',
        sealed_db_hash: evidence.sha256_hash,
        recomputed_storage_hash: 'UNAVAILABLE / CORRUPT',
        verified_at: new Date().toISOString(),
        type: 'INTERNAL',
      });
    } finally {
      setVerifyingInternal(false);
    }
  }

  // 2. Verify External Copy
  async function handleVerifyExternalFile(e) {
    e.preventDefault();
    if (!externalFile) return;

    setVerifyingExternal(true);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('file', externalFile);

      const res = await api.post(`/evidence/${id}/verify-external`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data) {
        setVerificationResult({
          ...res.data,
          type: 'EXTERNAL',
        });
      }
    } catch (err) {
      setVerificationResult({
        match: false,
        status: 'TAMPERED',
        message: err.response?.data?.error || 'External copy verification failed.',
        sealed_db_hash: evidence.sha256_hash,
        recomputed_storage_hash: 'INVALID FILE STREAM',
        verified_at: new Date().toISOString(),
        type: 'EXTERNAL',
      });
    } finally {
      setVerifyingExternal(false);
    }
  }

  // 3. Quick Certify & Approve for DCP
  async function handleQuickCertify(customRemarks) {
    setSubmittingReview(true);
    setReviewSuccess('');

    try {
      const remarks =
        customRemarks ||
        'Section 65B forensic verification completed. Cryptographic parity verified by DCP. Sealed for judicial examination.';

      const res = await api.patch(`/evidence/${id}/review`, {
        status: 'APPROVED',
        remarks,
      });

      if (res.data.success) {
        setEvidence(res.data.evidence);
        setReviewSuccess(
          '✅ Exhibit certified & approved! It is now live and readable in Court Admissible Exhibits for the Judge.'
        );
        setReviewRemarks('');
        fetchContent();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve exhibit');
    } finally {
      setSubmittingReview(false);
    }
  }

  // 4. Submit Standard DCP Review
  async function handleSubmitReview(e) {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewSuccess('');

    try {
      const res = await api.patch(`/evidence/${id}/review`, {
        status: reviewStatus,
        remarks: reviewRemarks,
      });

      if (res.data.success) {
        setEvidence(res.data.evidence);
        setReviewSuccess(`Decision recorded: Evidence marked as ${reviewStatus}.`);
        setReviewRemarks('');
        fetchContent();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }

  const streamUrl = `/api/evidence/${id}/stream?token=${encodeURIComponent(token)}`;

  // Formatted date string
  const formattedDate = evidence?.created_at
    ? new Date(evidence.created_at).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '09-11-2024 11:00 AM';

  if (loading) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-slate-500">ACCESSING CRYPTOGRAPHIC VAULT...</p>
        </div>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="h-screen w-full bg-white flex items-center justify-center font-sans">
        <div className="text-center max-w-md p-8">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Evidence Exhibit Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'Record does not exist in custody vault.'}</p>
          <button
            onClick={() => navigate(getRoleHomePath(user?.role))}
            className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            ← Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    /* Edge-to-Edge Full Screen Layout (No outer grey borders) */
    <div className="h-screen w-full bg-white text-slate-800 flex overflow-hidden font-sans">
      {/* Left Sidebar (Matching Reference Pure White with Black Active Pill) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto bg-white flex flex-col justify-between pt-14 md:pt-0">
          <div className="p-4 sm:p-6 md:p-8">
            {/* Top Header Bar matching Reference Image 1: "← Tip #123444 [Score: 89/100]" */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-3.5">
                <button
                  onClick={() => navigate(getRoleHomePath(user?.role))}
                  className="p-1.5 rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition cursor-pointer"
                  title="Back to Evidence Registry"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Evidence #{evidence.case_number || evidence.id}
                  </h1>

                  {/* Black Status / Score Pill */}
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-black text-white text-xs font-semibold tracking-wide shadow-xs">
                    {evidence.status === 'APPROVED' ? (
                      `${LEGAL_SHORT_LABEL} Certified • 100/100`
                    ) : evidence.status === 'PENDING' ? (
                      'Under Review • 89/100'
                    ) : (
                      'Rejected'
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Visual Audit Chain & Cryptographic Verification */}
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={() => setShowTimelineModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <ChainIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Audit Chain</span>
                </button>

                {/* Report Download (Disallowed for JUDGE role to preserve strict view-only bench custody) */}
                {user?.role !== 'JUDGE' && (
                  <button
                    onClick={handleDownloadReport}
                    disabled={downloadingReport}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <FileDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>{downloadingReport ? 'Generating...' : 'Court Report (PDF)'}</span>
                  </button>
                )}

                <button
                  onClick={handleVerifyStoredFile}
                  disabled={verifyingInternal}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{verifyingInternal ? 'Hashing...' : 'Verify Parity'}</span>
                </button>
              </div>
            </div>

            {/* Verification Result Feedback Modal / Card */}
            {verificationResult && (
              <div className="mb-6">
                <VerificationResultCard
                  result={verificationResult}
                  onClose={() => setVerificationResult(null)}
                />

                {/* Quick 1-Click Approve Banner for DCP when verification matches */}
                {verificationResult.match && isDcp && evidence.status === 'PENDING' && (
                  <div className="mt-3 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-900">
                          Cryptographic Parity Verified: Storage Buffer matches Sealed DB Hash!
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          Ready for official certification under {LEGAL_LABEL}.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickCertify()}
                      disabled={submittingReview || evidence.uploaded_by === user?.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {submittingReview ? 'Certifying...' : `Certify & Approve for Court (${LEGAL_SHORT_LABEL}) →`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Success Alert */}
            {reviewSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-300 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{reviewSuccess}</span>
                </div>
                <button onClick={() => setReviewSuccess('')} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
              </div>
            )}

            {/* MAIN 2-COLUMN INCIDENT DETAIL LAYOUT MATCHING REFERENCE IMAGE 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: Metadata cards, Subject, Description narrative, Digital evidence thumbnails */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* 1. Officer / Submitter Card: [User icon] Jonathan Smith */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900">
                      {evidence.uploaded_by_name || evidence.uploader_name || 'Jonathan Smith'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                    BADGE: {evidence.uploaded_by_badge || evidence.uploader_badge || 'INSP-104'}
                  </span>
                </div>

                {/* 2. Contact Cards Row: [Mail] officer@... and [Phone] +123 456 7890 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
                    <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-xs text-slate-700 truncate font-medium">
                      {evidence.uploaded_by_email || 'amanda@example.com'}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="text-xs text-slate-700 font-medium">
                        {evidence.witness_contact || '+123 456 7890'}
                      </span>
                    </div>
                    {evidence.witness_name && (
                      <span className="text-[10px] text-slate-400 font-sans">
                        Witness: {evidence.witness_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Seizure Location Card: [MapPin] 1234 Market St, San Francisco, CA 94103 */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center space-x-3 shadow-2xs">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="text-xs text-slate-800 font-medium">
                    {evidence.seizure_address || '1234 Market St, San Francisco, CA 94103'}
                  </span>
                </div>

                {/* 4. Timestamp Card: [Calendar] 09-11-2024 11:00 AM (Occurred) */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-start space-x-3 shadow-2xs">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{formattedDate}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Occurred / Ingested</div>
                  </div>
                </div>

                {/* 5. Subject Card: Category pill + Title + Legal code */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center space-x-2.5 mb-2">
                    <span className="text-xs font-bold text-slate-900">Subject</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100/80 text-blue-700">
                      {evidence.category || 'Property Damage/Vandalism'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {evidence.title || 'Suspicious Activity'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Penal Code - 484 ({evidence.category || 'Suspicious Activity'}) • Case #{evidence.case_number || 'NIBRS-23H'}
                  </p>
                </div>

                {/* 6. Description Narrative Card */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Description</h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {evidence.description ||
                      'At October 9, 2024, I witnessed a car theft from the parking lot around 12:30 PM. I was in the parking lot of the shopping center when I saw an unknown man approach a black Toyota Camry sedan (license plate ABC123) parked next to my vehicle. The man appeared to be around 30-35 years old, of average build, wearing a black hoodie jacket and dark jeans. He looked around cautiously before using some kind of tool, which looked like a lock pick, to open the car door.\nHe quickly got into the car, started it, and drove away.'}
                  </p>

                  {(evidence.witness_name || evidence.serial_number) && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
                      {evidence.witness_name && (
                        <div>
                          <span className="font-semibold text-slate-700">Witness: </span>
                          <span>{evidence.witness_name}</span>
                        </div>
                      )}
                      {evidence.serial_number && (
                        <div>
                          <span className="font-semibold text-slate-700">Serial/IMEI: </span>
                          <span className="font-mono text-slate-600">{evidence.serial_number}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Digital Evidence Thumbnails Section matching Reference Image 1 */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-900">Digital evidence</h3>
                    <button
                      onClick={() => setShowFullViewer(!showFullViewer)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showFullViewer ? 'Collapse Viewer' : 'Forensic Stream Viewer'}</span>
                    </button>
                  </div>

                  {/* Horizontal Scrollable Thumbnails matching the 4-card preview in Reference Image 1 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Media item 1: Primary Evidence */}
                    <div
                      onClick={() => setSelectedMediaPreview(0)}
                      className={`relative group rounded-2xl overflow-hidden border aspect-[4/3] bg-slate-950 cursor-pointer transition ${
                        selectedMediaPreview === 0
                          ? 'ring-2 ring-black border-transparent shadow-sm'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {evidence.mime_type?.startsWith('image/') || contentData?.type === 'IMAGE' ? (
                        <img
                          src={streamUrl}
                          alt="Seizure Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-400">
                          <FileText className="w-8 h-8 text-slate-300 mb-1" />
                          <span className="text-[10px] font-mono text-center text-slate-400 truncate max-w-full">
                            {evidence.file_name}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <span className="text-[10px] font-mono text-white">Seizure Photo #1</span>
                      </div>
                    </div>

                    {/* Media item 2: Seizure Context / Panchanama */}
                    <div
                      onClick={() => setSelectedMediaPreview(1)}
                      className={`relative group rounded-2xl overflow-hidden border aspect-[4/3] bg-slate-900 cursor-pointer transition ${
                        selectedMediaPreview === 1
                          ? 'ring-2 ring-black border-transparent shadow-sm'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-slate-400 bg-slate-800">
                        <Scale className="w-7 h-7 text-cyan-400 mb-1" />
                        <span className="text-[10px] font-medium text-slate-200 text-center">
                          Panchanama Seizure
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">Section 65B</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                        <span className="text-[10px] font-mono text-white">Field Seal</span>
                      </div>
                    </div>

                    {/* Media item 3: Cryptographic Geotag Anchor */}
                    <div
                      onClick={() => setSelectedMediaPreview(2)}
                      className={`relative group rounded-2xl overflow-hidden border aspect-[4/3] bg-slate-900 cursor-pointer transition ${
                        selectedMediaPreview === 2
                          ? 'ring-2 ring-black border-transparent shadow-sm'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-900">
                        <MapPin className="w-7 h-7 text-emerald-400 mb-1" />
                        <span className="text-[10px] font-medium text-slate-200 text-center">
                          GPS Coordinate Seal
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">Anchor #882</span>
                      </div>
                    </div>

                    {/* Media item 4: Forensic Buffer Stream */}
                    <div
                      onClick={() => {
                        setSelectedMediaPreview(3);
                        setShowFullViewer(true);
                      }}
                      className={`relative group rounded-2xl overflow-hidden border aspect-[4/3] bg-slate-900 cursor-pointer transition ${
                        selectedMediaPreview === 3
                          ? 'ring-2 ring-black border-transparent shadow-sm'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-slate-950">
                        <Eye className="w-7 h-7 text-blue-400 mb-1" />
                        <span className="text-[10px] font-medium text-slate-200 text-center">
                          Forensic Stream
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">Inspect Buffer</span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Forensic Exhibit Reader View */}
                  {showFullViewer && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between pb-3">
                        <div className="text-xs font-mono font-bold text-slate-800">
                          {evidence.file_name} • {(evidence.file_size / 1024).toFixed(1)} KB • {evidence.mime_type}
                        </div>
                        {contentData?.type === 'TEXT' && (
                          <button
                            onClick={() => setShowLineNumbers(!showLineNumbers)}
                            className="text-[11px] font-mono text-slate-600 hover:text-black underline cursor-pointer"
                          >
                            {showLineNumbers ? 'Hide Line Numbers' : 'Show Line Numbers'}
                          </button>
                        )}
                      </div>

                      {contentData?.type === 'TEXT' ? (
                        <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-slate-100 max-h-72 overflow-y-auto">
                          {contentData.textContent ? (
                            contentData.textContent.split('\n').map((line, idx) => (
                              <div key={idx} className="flex py-0.5 hover:bg-slate-900/60">
                                {showLineNumbers && (
                                  <span className="w-8 text-slate-600 select-none text-[10px] text-right pr-2 flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                )}
                                <span className="break-all whitespace-pre-wrap">{line}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-slate-500 italic py-4 text-center">Empty text exhibit</div>
                          )}
                        </div>
                      ) : evidence.mime_type?.startsWith('image/') || contentData?.type === 'IMAGE' ? (
                        <div className="rounded-xl overflow-hidden bg-black flex justify-center p-2">
                          <img
                            src={streamUrl}
                            alt="Forensic Evidence Stream"
                            className="max-h-80 w-auto object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <iframe
                          src={streamUrl}
                          title="Forensic Document Viewer"
                          className="w-full h-80 rounded-xl border border-slate-200 bg-white"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Incident Summary card & Forensic Custody / Chat Card */}
              <div className="lg:col-span-4 space-y-4">
                
                {/* 1. TOP SUMMARY CARD MATCHING REFERENCE IMAGE 1 (Right Panel) */}
                <div className="bg-[#f8f9fa] border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Subject</div>
                    <div className="text-xs text-slate-600 font-medium">
                      {evidence.title || 'Suspicious Activity'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Location</div>
                    <div className="text-xs text-slate-600">
                      {evidence.seizure_address || '1234 Market St, San Francisco, CA 94103'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-1">Description</div>
                    <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed">
                      {evidence.description ||
                        'At October 9, 2024, I witnessed a car theft from the parking lot around 12:30 PM. I was in the parking lot of the shopping center when I saw an unknown man approach a black Toyota Camry sedan...'}
                    </p>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-900 mb-2">Digital evidence</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden border border-slate-200 flex-shrink-0">
                        {evidence.mime_type?.startsWith('image/') ? (
                          <img src={streamUrl} alt="Thumbnail 1" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-200 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-200 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] font-mono flex-shrink-0">
                        +1
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. COMMUNICATION & STATUTORY CUSTODY CARD (Matches the conversation card in Image 1) */}
                <div className="bg-[#f8f9fa] border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-2xs">
                  {/* Avatar + Heading row matching Reference Image 1 */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      S
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Secura Forensic Custody Protocol
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {LEGAL_LABEL}
                      </p>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Hash Box */}
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-500 flex items-center space-x-1">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>Sealed SHA-256 Hash</span>
                      </span>
                      <button
                        onClick={handleCopyHash}
                        className="text-slate-600 hover:text-black flex items-center space-x-1 text-[11px] font-semibold cursor-pointer"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-[11px] font-mono text-slate-800 break-all leading-tight bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {evidence.sha256_hash}
                    </div>
                  </div>

                  {/* Review / Certification Status Callout */}
                  {evidence.status === 'APPROVED' ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span>Court Admissible Certification</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 italic">
                        "{evidence.review_remarks || `Certified ${LEGAL_SHORT_LABEL} compliant by DCP.`}"
                      </p>
                      <div className="text-[10px] font-mono text-emerald-800 pt-1">
                        Reviewed by {evidence.reviewer_name || 'DCP'} • {evidence.reviewed_at ? new Date(evidence.reviewed_at).toLocaleDateString() : 'Active'}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                      <div className="text-xs font-bold text-amber-900">
                        Awaiting Supervisory Judicial Approval
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Examine integrity before formal {LEGAL_SHORT_LABEL} court submission.
                      </p>
                    </div>
                  )}

                  {/* DCP Supervisory Action Console (If User is DCP) */}
                  {isDcp && (
                    <div className="pt-2 border-t border-slate-200 space-y-3">
                      <div className="text-xs font-bold text-slate-900">
                        DCP Evidentiary Review
                      </div>
                      <form onSubmit={handleSubmitReview} className="space-y-3">
                        <div className="flex items-center space-x-4 text-xs font-semibold">
                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="reviewStatus"
                              value="APPROVED"
                              checked={reviewStatus === 'APPROVED'}
                              onChange={() => setReviewStatus('APPROVED')}
                              className="text-black focus:ring-black"
                            />
                            <span className="text-emerald-700">Approve</span>
                          </label>

                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="reviewStatus"
                              value="REJECTED"
                              checked={reviewStatus === 'REJECTED'}
                              onChange={() => setReviewStatus('REJECTED')}
                              className="text-red-600 focus:ring-red-500"
                            />
                            <span className="text-red-700">Reject</span>
                          </label>
                        </div>

                        <textarea
                          rows={2}
                          value={reviewRemarks}
                          onChange={(e) => setReviewRemarks(e.target.value)}
                          placeholder="Section 65B certification remarks..."
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-black"
                        ></textarea>

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="w-full py-2.5 px-3 rounded-xl bg-black hover:bg-slate-800 text-white font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
                        >
                          {submittingReview ? 'Submitting...' : 'Record Supervisory Review'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* External Defense File Parity Check Form */}
                  <div className="pt-2 border-t border-slate-200 space-y-2.5">
                    <div className="text-xs font-bold text-slate-900">
                      Verify External Defense Copy
                    </div>
                    <form onSubmit={handleVerifyExternalFile} className="space-y-2">
                      <input
                        type="file"
                        ref={externalFileRef}
                        onChange={(e) => setExternalFile(e.target.files[0])}
                        className="block w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                      />
                      <button
                        type="submit"
                        disabled={!externalFile || verifyingExternal}
                        className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-medium transition cursor-pointer disabled:opacity-40"
                      >
                        {verifyingExternal ? 'Computing...' : 'Run External Hash Check'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

      {/* Visual Audit Chain Timeline Modal */}
      <AuditTimelineModal
        evidenceId={id}
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
      />
    </div>
  );
}
