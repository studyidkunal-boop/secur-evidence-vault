import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { LEGAL_LABEL, LEGAL_SHORT_LABEL } from '../config/legalConfig';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Camera,
  MapPin,
  Navigation,
  RefreshCw,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  Hash,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';

export default function IngestEvidenceView({
  onSuccess,
  onNavigateRegistry,
  initialData = null,
}) {
  const navigate = useNavigate();

  const [caseNumber, setCaseNumber] = useState(initialData?.case_number || '');
  const [title, setTitle] = useState(initialData?.title ? `${initialData.title} (Resubmitted)` : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Digital Device');
  const [serialNumber, setSerialNumber] = useState(initialData?.serial_number || '');
  const [seizureAddress, setSeizureAddress] = useState(initialData?.seizure_address || '');
  const [witnessName, setWitnessName] = useState(initialData?.witness_name || '');
  const [witnessContact, setWitnessContact] = useState(initialData?.witness_contact || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [receiptCopied, setReceiptCopied] = useState(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.case_number) setCaseNumber(initialData.case_number);
      if (initialData.title) setTitle(`${initialData.title} (v2 Resubmission)`);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.seizure_address) setSeizureAddress(initialData.seizure_address);
      if (initialData.witness_name) setWitnessName(initialData.witness_name);
      if (initialData.witness_contact) setWitnessContact(initialData.witness_contact);
    }
  }, [initialData]);

  // Live Location State
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const fileInputRef = useRef(null);

  // Validation: Ensure all statutory mandatory fields are non-empty
  const isFormValid =
    caseNumber.trim() !== '' &&
    category.trim() !== '' &&
    title.trim() !== '' &&
    description.trim() !== '' &&
    seizureAddress.trim() !== '' &&
    witnessName.trim() !== '' &&
    witnessContact.trim() !== '' &&
    selectedFile !== null;

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMessage('');

      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  }

  function handleFetchLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser or device.');
      return;
    }

    setFetchingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAccuracy(position.coords.accuracy ? Math.round(position.coords.accuracy) : null);
        setFetchingLocation(false);
      },
      (err) => {
        console.warn('Geolocation capture error:', err.message);
        let errorMsg = 'Failed to fetch GPS location.';
        if (err.code === 1) {
          errorMsg = 'Location permission denied. Please allow GPS access in your browser settings.';
        } else if (err.code === 2) {
          errorMsg = 'GPS signal position unavailable. Please ensure GPS is active on your device.';
        } else if (err.code === 3) {
          errorMsg = 'GPS request timed out. Please try again.';
        }
        setLocationError(errorMsg);
        setFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please capture or select forensic evidence (photo or video).');
      return;
    }

    setErrorMessage('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('case_number', caseNumber.trim());
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category.trim());
      if (serialNumber.trim()) {
        formData.append('serial_number', serialNumber.trim());
      }
      formData.append('seizure_address', seizureAddress.trim());
      formData.append('witness_name', witnessName.trim());
      if (witnessContact.trim()) {
        formData.append('witness_contact', witnessContact.trim());
      }
      formData.append('file', selectedFile);

      if (latitude !== null && longitude !== null) {
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
      }

      const res = await api.post('/evidence/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        setSuccessInfo(res.data.evidence);
        if (onSuccess) {
          onSuccess(res.data.evidence);
        }
      } else {
        throw new Error(res.data.error || 'Upload failed');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to ingest evidence file.';
      setErrorMessage(msg);
    } finally {
      setUploading(false);
    }
  }

  function handleReset() {
    setCaseNumber('');
    setTitle('');
    setDescription('');
    setCategory('Digital Device');
    setSerialNumber('');
    setSeizureAddress('');
    setWitnessName('');
    setWitnessContact('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setSuccessInfo(null);
    setErrorMessage('');
  }

  return (
    <div className="w-full max-w-5xl mx-auto font-sans pb-16 px-1 sm:px-4">
      {/* Top Header with Generous Spacing */}
      <div className="pb-6 mb-7 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Police Seizure & Evidence Ingestion
              </h1>
              <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-0.5">
                Statutory Chain of Custody • {LEGAL_LABEL}
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-mono font-semibold border border-blue-200">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>{LEGAL_SHORT_LABEL}</span>
        </div>
      </div>

      {/* Resubmission Mode Banner if applicable */}
      {initialData && !successInfo && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-amber-700" />
            <span>Resubmission Protocol Active</span>
          </div>
          <p className="text-amber-800">
            You are registering a newly corrected version for Case <strong>#{initialData.case_number}</strong>. This creates a new immutable evidence row and audit log entry. The previous rejected exhibit remains permanently recorded in the ledger.
          </p>
        </div>
      )}

      {/* Hash Receipt Card on Successful Ingestion */}
      {successInfo ? (
        <div className="p-7 rounded-2xl bg-blue-50/70 border-2 border-blue-400 space-y-5 animate-in fade-in duration-200 shadow-md">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-start space-x-3.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Cryptographically Anchored
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  OFFICIAL HASH RECEIPT
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Case #{successInfo.case_number} has been sealed into the immutable vault. Keep this receipt for court filing under {LEGAL_SHORT_LABEL}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const receiptText = `=== SECURA EVIDENCE VAULT HASH RECEIPT ===\nCASE NO: ${successInfo.case_number}\nEVIDENCE ID: ${successInfo.id}\nTITLE: ${successInfo.title}\nFILE: ${successInfo.file_name}\nSHA-256 HASH: ${successInfo.sha256_hash}\nINGESTED AT: ${successInfo.created_at || new Date().toISOString()}\nLEGAL REF: ${LEGAL_LABEL}\n===========================================`;
                navigator.clipboard.writeText(receiptText);
                setReceiptCopied(true);
                setTimeout(() => setReceiptCopied(false), 3000);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {receiptCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Receipt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Hash Receipt</span>
                </>
              )}
            </button>
          </div>

          {/* Receipt Particulars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white rounded-xl border border-blue-200 text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Evidence ID</span>
              <p className="font-mono text-slate-900 font-bold break-all select-all">{successInfo.id}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono">Timestamp</span>
              <p className="font-mono text-slate-800">{new Date(successInfo.created_at || Date.now()).toLocaleString()}</p>
            </div>
            <div className="sm:col-span-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 uppercase font-mono flex items-center space-x-1">
                <Hash className="w-3.5 h-3.5 text-blue-600" />
                <span>Full SHA-256 Cryptographic Hash</span>
              </span>
              <p className="font-mono text-blue-900 font-bold break-all select-all text-xs sm:text-sm bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 mt-1">
                {successInfo.sha256_hash}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateRegistry) onNavigateRegistry();
                else navigate('/inspector/evidence');
              }}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <span>Go to My Evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 transition cursor-pointer"
            >
              + Ingest Another Exhibit
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Case & Category */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                  Case & Category
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">MANDATORY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Case Number / FIR ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. CR-2026-9402"
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Evidence Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black cursor-pointer transition"
                >
                  <option value="Digital Device">Digital Device</option>
                  <option value="Weapon">Weapon</option>
                  <option value="Narcotics">Narcotics</option>
                  <option value="Documents">Documents</option>
                  <option value="Physical Contraband">Physical Contraband</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Evidence Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Confiscated Mobile Phone with Extortion SMS / 9mm Beretta Pistol"
                className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
              />
            </div>
          </div>

          {/* Section 2: Seizure Specifications */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                  Seizure Specifications
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">MANDATORY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Item Serial Number / IMEI <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. 864920194829104"
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Optional hardware identifier</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Seizure Context & Condition <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Document physical recovery state, tamper seal ID, packaging integrity, power state..."
                  className="w-full px-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Chain of Custody & Protocol */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                  Chain of Custody & Protocol
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">MANDATORY</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Physical Seizure Location / Landmark <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={seizureAddress}
                onChange={(e) => setSeizureAddress(e.target.value)}
                placeholder="e.g. Flat 402, Shanti Heights, Near AIIMS Metro Gate 3, South Delhi"
                className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Independent Witness Name <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 block mb-1.5">
                  Statutory requirement under Bharatiya Sakshya Adhiniyam / Evidence Act.
                </span>
                <input
                  type="text"
                  required
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra (Local Resident)"
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Witness Contact Number <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500 block mb-1.5">
                  Direct phone number for judicial summons verification.
                </span>
                <input
                  type="text"
                  required
                  value={witnessContact}
                  onChange={(e) => setWitnessContact(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-black transition"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Cryptographic Anchoring & Field Media */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <span className="w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <h2 className="text-xs sm:text-[13px] font-bold text-slate-900 uppercase tracking-wider">
                  Cryptographic Anchoring & Media Capture
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                SEC. 65B
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Media Selection / Camera */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Field Evidence Capture (Photo / Video / File) <span className="text-rose-500">*</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*,application/pdf,text/*"
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition ${
                    selectedFile
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Seizure preview"
                          className="h-32 w-auto object-cover rounded-xl mb-2.5 border border-slate-200 shadow-2xs"
                        />
                      ) : (
                        <FileText className="w-12 h-12 text-emerald-600 mb-2.5" />
                      )}
                      <p className="text-xs font-bold text-slate-900 truncate max-w-xs">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3 shadow-2xs">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        Capture with Camera or Browse Files
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Images (JPG, PNG), Videos (MP4), PDFs, Documents
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Live GPS Geotag */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Live GPS Seizure Geotag
                </label>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-800">
                        {latitude !== null ? 'Coordinates Anchored' : 'GPS Unacquired'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleFetchLocation}
                      disabled={fetchingLocation}
                      className="px-3.5 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${fetchingLocation ? 'animate-spin' : ''}`} />
                      <span>{fetchingLocation ? 'Acquiring...' : 'Acquire GPS'}</span>
                    </button>
                  </div>

                  {latitude !== null ? (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                      <div>LAT: {latitude.toFixed(6)}°</div>
                      <div>LON: {longitude.toFixed(6)}°</div>
                      {accuracy && <div className="text-[10px] text-slate-400">Accuracy: ±{accuracy}m</div>}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Acquire satellite coordinates to bind physical seizure landmark into cryptographic hash.
                    </p>
                  )}

                  {locationError && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      {locationError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Ingest Action Button */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={!isFormValid || uploading}
              className="px-10 py-4 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-sm transition shadow-md flex items-center space-x-2.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{uploading ? 'Cryptographically Sealing...' : 'Seal & Ingest Evidence'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
