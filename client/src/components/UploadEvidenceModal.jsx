import React, { useState, useRef } from 'react';
import api from '../api/axios';
import {
  X,
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
} from 'lucide-react';

export default function UploadEvidenceModal({ isOpen, onClose, onSuccess }) {
  const [caseNumber, setCaseNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Digital Device');
  const [serialNumber, setSerialNumber] = useState('');
  const [seizureAddress, setSeizureAddress] = useState('');
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Live Location State
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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

      // Create preview for images
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

      // Append GPS coordinates if captured
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
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setLocationError('');
    setErrorMessage('');
    setSuccessInfo(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-sans">
      <div className="relative w-full max-w-2xl sm:max-w-3xl rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-5 sm:p-7 text-slate-900 animate-in fade-in duration-200 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Police Seizure & Evidence Ingestion (Field PWA)
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                STATUTORY CHAIN OF CUSTODY • SECTION 65B FORENSIC ARCHIVAL
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start space-x-2 text-xs flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span className="font-medium leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Success Confirmation View */}
        {successInfo ? (
          <div className="p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-4 overflow-y-auto">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full w-fit mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Evidence Sealed & Anchored Successfully</h3>
            <p className="text-xs text-slate-600">
              Evidence exhibit for case <strong className="text-slate-900">{successInfo.case_number}</strong> has been cryptographically sealed with Section 65B custody protocol.
            </p>

            {/* Geotag Confirmation */}
            {successInfo.latitude && successInfo.longitude && (
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs font-mono flex items-center justify-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>GPS GEOTAG: {Number(successInfo.latitude).toFixed(6)}°, {Number(successInfo.longitude).toFixed(6)}°</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-white border border-emerald-200 font-mono text-[11px] text-slate-800 text-left break-all select-all shadow-inner">
              <span className="text-slate-400 block text-[9px] font-bold">SEALED SHA-256 ENTRY HASH:</span>
              <span className="text-emerald-700 font-semibold">{successInfo.sha256_hash}</span>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
            >
              Done • Return to Workspace
            </button>
          </div>
        ) : (
          /* Evidence Ingest Form (Scrollable, Enterprise Grouped Sections) */
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1.5 flex-1">
            {/* SECTION 1: Case & Category (Mandatory) */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">1</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Case & Category
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/70">
                  MANDATORY
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Case Number / FIR ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Case Number / FIR ID <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="e.g. CR-2026-9402"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono transition"
                  />
                </div>

                {/* Evidence Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Evidence Category <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="Digital Device">Digital Device</option>
                    <option value="Weapon">Weapon</option>
                    <option value="Narcotics">Narcotics</option>
                    <option value="Documents">Documents</option>
                    <option value="Physical Contraband">Physical Contraband</option>
                  </select>
                </div>
              </div>

              {/* Evidence Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Evidence Title <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Confiscated Mobile Phone with Extortion SMS / 9mm Beretta Pistol"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                />
              </div>
            </div>

            {/* SECTION 2: Seizure Specifications (Mandatory) */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">2</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Seizure Specifications
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/70">
                  MANDATORY
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Item Serial Number / IMEI */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Serial Number / IMEI
                  </label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. 864920194829104"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional hardware ID</p>
                </div>

                {/* Seizure Context & Condition */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Seizure Context & Condition <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Document physical recovery state, tamper seal ID, packaging integrity, power state..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none transition"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Chain of Custody & Protocol (Mandatory) */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">3</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Chain of Custody & Protocol
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/70">
                  MANDATORY
                </span>
              </div>

              {/* Physical Seizure Location / Landmark */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Seizure Location / Landmark <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={seizureAddress}
                  onChange={(e) => setSeizureAddress(e.target.value)}
                  placeholder="e.g. Flat 402, Shanti Heights, Near AIIMS Metro Gate 3, South Delhi"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Independent Witness Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Independent Witness Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Statutory requirement under Bharatiya Sakshya Adhiniyam / Indian Evidence Act.
                  </p>
                  <input
                    type="text"
                    required
                    value={witnessName}
                    onChange={(e) => setWitnessName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra (Local Resident)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                  />
                </div>

                {/* Witness Contact Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Witness Contact Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <p className="text-[10px] text-slate-500 mb-1">
                    Direct phone number for judicial summons verification.
                  </p>
                  <input
                    type="text"
                    required
                    value={witnessContact}
                    onChange={(e) => setWitnessContact(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono transition"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Cryptographic Anchoring */}
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">4</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Cryptographic Anchoring
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/70">
                  SEC. 65B
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Field Evidence Capture (Mobile Camera) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Field Evidence Capture (Mobile Camera) <span className="text-red-500 font-bold">*</span>
                  </label>

                  <input
                    type="file"
                    accept="image/*,video/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3.5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition min-h-[105px] flex items-center justify-center ${
                      selectedFile
                        ? 'border-blue-500 bg-blue-50/40'
                        : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-blue-400'
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex items-center space-x-3 text-left w-full">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Captured Preview"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                            {selectedFile.type.startsWith('video/') ? (
                              <Video className="w-5 h-5" />
                            ) : (
                              <Camera className="w-5 h-5" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {selectedFile.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'Field Media'}
                          </div>
                          <span className="text-[10px] text-blue-600 font-semibold underline mt-0.5 inline-block">
                            Tap to Retake Photo/Video
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="py-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                          <Camera className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          Launch Field Camera
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Rear Camera Capture Active (Photo / Video)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* LIVE GPS GEOLOCATION MODULE */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Live GPS Seizure Geotag</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleFetchLocation}
                        disabled={fetchingLocation}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-semibold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Navigation className={`w-2.5 h-2.5 ${fetchingLocation ? 'animate-spin' : ''}`} />
                        <span>{fetchingLocation ? 'Acquiring...' : latitude ? 'Re-acquire' : 'Acquire GPS'}</span>
                      </button>
                    </div>

                    {locationError && (
                      <div className="text-[10px] text-rose-600 font-medium mb-1.5">
                        {locationError}
                      </div>
                    )}

                    {latitude !== null && longitude !== null ? (
                      <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200 font-mono text-[11px] text-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-800">
                            {Number(latitude).toFixed(6)}°, {Number(longitude).toFixed(6)}°
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            LOCKED
                          </span>
                        </div>
                        {accuracy && (
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            Accuracy: ±{accuracy}m • Satellite Triangulated
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Stamps live cryptographic GPS coordinates for Section 65B statutory seizure admissibility.
                      </p>
                    )}
                  </div>

                  <div className="mt-2 text-[9px] font-mono text-slate-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>GEO-CRYPTOGRAPHIC ATTESTATION</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons & Ingestion Validation State */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isFormValid ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span>
                  {isFormValid
                    ? 'All mandatory fields verified'
                    : 'Complete mandatory (*) fields & capture media to seal'}
                </span>
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={uploading || !isFormValid}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Anchoring SHA-256...</span>
                    </>
                  ) : (
                    <span>Seal & Ingest Evidence</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
