import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Calendar,
  FileText,
  Link as ChainIcon,
  FileDown,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  List,
  Eye,
  Camera,
  Video,
  ShieldCheck,
  MapPin,
  Clock,
} from 'lucide-react';

/**
 * Calculates priority from evidence crime type or statutory severity
 */
export function getEvidencePriority(item) {
  if (item.priority) {
    const p = String(item.priority).toUpperCase();
    if (p.includes('HIGH')) return 'High';
    if (p.includes('MED')) return 'Medium';
    if (p.includes('LOW')) return 'Low';
  }

  const category = (item.category || '').toLowerCase();
  if (
    category.includes('weapon') ||
    category.includes('narcotic') ||
    category.includes('drug') ||
    category.includes('biological') ||
    category.includes('firearm')
  ) {
    return 'High';
  }
  if (
    category.includes('digital') ||
    category.includes('device') ||
    category.includes('contraband')
  ) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Soft pill color styling matching Reference Image 2
 */
export function getCrimeTypePill(category = '') {
  const cat = category.toLowerCase();
  if (cat.includes('narcotic') || cat.includes('drug') || cat.includes('weapon')) {
    return 'bg-rose-50 text-rose-700 border-rose-100';
  }
  if (cat.includes('contraband') || cat.includes('suspicious') || cat.includes('physical')) {
    return 'bg-amber-50 text-amber-800 border-amber-100';
  }
  if (cat.includes('property') || cat.includes('damage') || cat.includes('digital')) {
    return 'bg-blue-50 text-blue-700 border-blue-100';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export default function EvidenceRegistry({
  evidenceList = [],
  loading = false,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'ALL',
  onStatusChange,
  categoryFilter = 'ALL',
  onCategoryChange,
  selectedDate = '',
  onDateChange,
  onDownloadReport,
  downloadingId = null,
  onOpenTimeline,
  isReportsView = false,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalCount = 0,
}) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' or 'GALLERY'
  const token = localStorage.getItem('evidence_vault_token') || '';

  return (
    <div className="flex-1 flex flex-col justify-between font-sans">
      <div>
        {/* Top Header Row matching Reference Image 2: "Tips, 300" / "Reports, 300" with View Mode Toggles */}
        <div className="flex flex-wrap items-center justify-between pb-4 mb-3 gap-3">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isReportsView
                ? `Generated Section 65B Reports, ${totalCount || evidenceList.length}`
                : `Evidence Registry, ${totalCount || evidenceList.length}`}
            </h1>
            {isReportsView && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                COURT ADMISSIBLE
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isReportsView && (
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Table View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GALLERY')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer ${
                    viewMode === 'GALLERY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Evidence Photo Gallery"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Photos & Media</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar Row matching Reference Image 2: 3 Dropdown Pills in a Single Row */}
        <div className="flex flex-wrap items-center gap-3 pb-5">
          {/* Dropdown 1: All districts / Categories */}
          <div className="relative min-w-[170px]">
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-slate-400 cursor-pointer"
            >
              <option value="ALL">All districts / Categories</option>
              <option value="Digital Device">Digital Device</option>
              <option value="Weapon">Weapon</option>
              <option value="Narcotics">Narcotics</option>
              <option value="Documents">Documents</option>
              <option value="Physical Contraband">Physical Contraband</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Dropdown 2: Select date */}
          <div className="relative min-w-[160px]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange && onDateChange(e.target.value)}
              className="w-full pl-3.5 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs focus:outline-none focus:border-slate-400 cursor-pointer"
              placeholder="Select date"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => onDateChange && onDateChange('')}
                className="absolute right-3 top-2 text-[10px] text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dropdown 3: Subject / Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Subject / FIR ID search..."
              className="w-full pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-slate-400 transition"
            />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DATA TABLE WITH EVIDENCE PHOTO & VIDEO THUMBNAILS                 */}
        {/* ========================================================================= */}
        {viewMode === 'TABLE' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f9fa] border-b border-slate-100 text-slate-700 font-medium text-[11px]">
                  <th className="py-3 px-4 font-semibold">ID</th>
                  <th className="py-3 px-4 font-semibold">Evidence Media</th>
                  <th className="py-3 px-4 font-semibold">Crime Type</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">
                    {isReportsView ? 'Section 65B Report' : 'Date & Time'}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-400">
                      <div className="w-7 h-7 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <span className="font-mono text-xs text-slate-500">Loading vault records...</span>
                    </td>
                  </tr>
                ) : evidenceList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center text-slate-400">
                      <FileText className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700 text-xs">No evidence records found</p>
                    </td>
                  </tr>
                ) : (
                  evidenceList.map((item, idx) => {
                    const priority = getEvidencePriority(item);
                    const crimeTypeClass = getCrimeTypePill(item.category || item.title);
                    const dateObj = new Date(item.created_at || Date.now());
                    const dateStr = dateObj.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    }).replace(/\//g, '-');
                    const timeStr = dateObj.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const streamUrl = `/api/evidence/${item.id}/stream?token=${encodeURIComponent(token)}`;

                    return (
                      <tr
                        key={item.id || idx}
                        onClick={() => navigate(`/evidence/${item.id}`)}
                        className="hover:bg-slate-50/70 transition-colors duration-100 cursor-pointer group"
                      >
                        {/* 1. ID: e.g. #123438 / #CR-2026-9402 */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 font-semibold text-xs whitespace-nowrap">
                          #{item.case_number}
                        </td>

                        {/* 2. Seized Photo / Video Thumbnail */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="w-14 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            {item.mime_type?.startsWith('image/') ? (
                              <img
                                src={streamUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : item.mime_type?.startsWith('video/') ? (
                              <div className="flex flex-col items-center justify-center text-cyan-400">
                                <Video className="w-4 h-4" />
                                <span className="text-[8px] font-mono">VIDEO</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-4 h-4" />
                                <span className="text-[8px] font-mono">DOC</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Crime Type: Soft rounded colored pill matching Image 2 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${crimeTypeClass}`}
                          >
                            {item.category || 'Suspicious Activity'}
                          </span>
                        </td>

                        {/* 4. Description: Title + narrative snippet */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="font-semibold text-slate-900 truncate">
                            {item.title}
                          </div>
                          <p className="text-slate-500 text-[11px] truncate mt-0.5">
                            {item.description || item.file_name}
                          </p>
                        </td>

                        {/* 5. Priority: Dot + text matching Reference Image 2 */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-700 font-medium">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                priority === 'High'
                                  ? 'bg-rose-600'
                                  : priority === 'Medium'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                            />
                            <span>{priority}</span>
                          </div>
                        </td>

                        {/* 6. Date & Time or 65B Report Download */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                          {isReportsView ? (
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={(e) => onDownloadReport && onDownloadReport(e, item)}
                                disabled={downloadingId === item.id}
                                className="px-3 py-1.5 rounded-xl bg-black hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>{downloadingId === item.id ? 'Generating...' : 'Download 65B PDF'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <div>{dateStr}</div>
                                <div className="text-[11px] text-slate-400">{timeStr}</div>
                              </div>

                              <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-3">
                                {onOpenTimeline && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenTimeline(item.id);
                                    }}
                                    title="Audit Chain"
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
                                  >
                                    <ChainIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onDownloadReport && (
                                  <button
                                    type="button"
                                    onClick={(e) => onDownloadReport(e, item)}
                                    disabled={downloadingId === item.id}
                                    title="Download 65B PDF"
                                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: EVIDENCE PHOTO & VIDEO GALLERY (CARDS FOR EVERY CASE)             */
          /* ========================================================================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {evidenceList.map((item, idx) => {
              const priority = getEvidencePriority(item);
              const crimeTypeClass = getCrimeTypePill(item.category || item.title);
              const streamUrl = `/api/evidence/${item.id}/stream?token=${encodeURIComponent(token)}`;

              return (
                <div
                  key={item.id || idx}
                  onClick={() => navigate(`/evidence/${item.id}`)}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden hover:border-slate-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
                >
                  {/* Photo / Media Header */}
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    {item.mime_type?.startsWith('image/') ? (
                      <img
                        src={streamUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : item.mime_type?.startsWith('video/') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-cyan-400 bg-slate-900">
                        <Video className="w-10 h-10 mb-1" />
                        <span className="text-xs font-mono">Video Evidence Exhibit</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                        <FileText className="w-10 h-10 mb-1" />
                        <span className="text-xs font-mono truncate px-4">{item.file_name}</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                        #{item.case_number}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${crimeTypeClass} bg-white/95 backdrop-blur-xs`}>
                        {item.category || 'Digital'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {item.description || 'Forensic exhibit recorded and sealed under Section 65B.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            priority === 'High'
                              ? 'bg-rose-600'
                              : priority === 'Medium'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span>{priority}</span>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer matching Reference Image 2: < 1 2 3 ... 8 > */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-1.5 pt-6 text-xs text-slate-600 select-none">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
            className="p-1.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-black hover:bg-slate-50 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
            <button
              key={pg}
              type="button"
              onClick={() => onPageChange && onPageChange(pg)}
              className={`w-7 h-7 rounded-lg text-xs transition cursor-pointer ${
                currentPage === pg
                  ? 'bg-black text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              {pg}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
            className="p-1.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-black hover:bg-slate-50 shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
