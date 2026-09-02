'use client';

/**
 * src/components/MaterialPipelineBoard.tsx
 *
 * Module 2.3 — Course Material Provisioning Pipeline
 *
 * Architecture decisions:
 * - Uses SWR for cache-aware, revalidation-on-focus data fetching (consistent
 *   with all other components in this codebase).
 * - Sessions are resolved server-side; client role is read from NextAuth session.
 * - Students see only materials for their enrolled sections (cross-referenced
 *   against Module 1 routines on the server — never passed via URL param).
 * - Tag filter is appended as a query param to the SWR key, so switching tags
 *   triggers a fresh fetch and independent cache entry per tag.
 *
 * INTEGRATION HOOK — Lamia's M1.2 (Course Material Category Classifier):
 * The category_tag ENUM ('Syllabus', 'Lecture Slides', 'Lab Manuals',
 * 'Reference Books') is the binding point between this pipeline and Lamia's
 * structural metadata system. The filter UI below is the user-facing surface
 * of that classification contract.
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import {
  FileText, UploadCloud, RefreshCw, AlertCircle, Plus,
  BookOpen, Layers, FlaskConical, LibraryBig, ExternalLink, X,
} from 'lucide-react';
import type { MaterialsApiResponse, MaterialSection, MaterialCategoryTag } from '@/types/materials';
import { ALL_CATEGORY_TAGS } from '@/types/materials';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAG_META: Record<MaterialCategoryTag, { icon: React.ReactNode; color: string }> = {
  'Syllabus':        { icon: <BookOpen    className="w-3 h-3" />, color: 'bg-violet-50 text-violet-700 border-violet-100' },
  'Lecture Slides':  { icon: <Layers      className="w-3 h-3" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
  'Lab Manuals':     { icon: <FlaskConical className="w-3 h-3" />, color: 'bg-amber-50 text-amber-700 border-amber-100' },
  'Reference Books': { icon: <LibraryBig  className="w-3 h-3" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
];

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function BoardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-slate-200 rounded-md" />
        <div className="h-6 w-16 bg-slate-100 rounded-full" />
      </div>
      {/* Tag filter skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-7 w-24 bg-slate-100 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-6 w-3/4 bg-slate-200 rounded-md mb-2" />
              <div className="h-4 w-1/2 bg-slate-100 rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-4">
                <div className="h-10 w-full bg-slate-50 rounded-lg" />
                <div className="h-10 w-full bg-slate-50 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = async (url: string): Promise<MaterialsApiResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Session expired. Please sign in again.');
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json() as Promise<MaterialsApiResponse>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MaterialPipelineBoard() {
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'teacher' || session?.user?.role === 'admin';

  // ── Tag filter state ────────────────────────────────────────────────────
  const [activeTag, setActiveTag] = useState<MaterialCategoryTag | 'All'>('All');

  // Build SWR key — including the tag makes each filter a separate cache entry
  const swrKey = activeTag === 'All'
    ? '/api/materials'
    : `/api/materials?tag=${encodeURIComponent(activeTag)}`;

  const {
    data: materialsData,
    error: swrError,
    mutate,
    isLoading,
  } = useSWR<MaterialsApiResponse>(swrKey, fetcher, {
    revalidateOnFocus:  true,
    dedupingInterval:   5000,
  });

  const error = swrError?.message ?? null;

  // ── Upload state ────────────────────────────────────────────────────────
  const [uploadingSection,  setUploadingSection]  = useState<number | null>(null);
  const [uploadTitle,       setUploadTitle]        = useState('');
  const [selectedFile,      setSelectedFile]       = useState<File | null>(null);
  const [uploadTag,         setUploadTag]          = useState<MaterialCategoryTag>('Lecture Slides');
  const [isUploading,       setIsUploading]        = useState(false);
  const [uploadError,       setUploadError]        = useState<string | null>(null);

  const handleAppendSubmit = async (e: React.FormEvent, sectionId: number) => {
    e.preventDefault();

    if (!uploadTitle.trim() || !selectedFile) {
      setUploadError('Please provide a title and select a file to upload.');
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      setUploadError(`Unsupported file type. Allowed: PDF, DOC, DOCX, PPTX, JPEG, PNG.`);
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setUploadError('File exceeds the 10 MB size limit.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('section_id',    sectionId.toString());
      formData.append('title',         uploadTitle.trim());
      formData.append('file',          selectedFile);
      formData.append('category_tag',  uploadTag);

      const res = await fetch('/api/materials', { method: 'POST', body: formData });

      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Upload failed');
      }

      setUploadTitle('');
      setSelectedFile(null);
      setUploadingSection(null);

      // Revalidate ALL material cache keys so the new file appears regardless of active tag
      mutate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (isLoading && !materialsData) return <BoardSkeleton />;

  if (error && !materialsData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-red-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
        <p className="text-slate-500 mb-6 text-center text-sm">{error}</p>
        <Button onClick={() => mutate()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry Connection
        </Button>
      </div>
    );
  }

  const sections = materialsData?.sections ?? [];
  const totalMaterials = materialsData?.total_materials ?? 0;

  if (sections.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        {/* Tag filter bar — still show so users can change filter */}
        <TagFilterBar activeTag={activeTag} onSelect={setActiveTag} />
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Course Materials</h3>
          <p className="text-slate-500 max-w-sm mb-2 text-sm">
            {isTeacher
              ? 'No materials have been provisioned to your sections yet.'
              : activeTag !== 'All'
                ? `No materials tagged "${activeTag}" found for your enrolled courses.`
                : 'No materials have been published for your enrolled sections yet.'}
          </p>
          {activeTag !== 'All' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTag('All')}
              className="text-indigo-600 hover:text-indigo-700 mt-1 gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear filter
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Course Materials</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {isTeacher
              ? 'Manage section assets — filter by Lamia\'s structural tags'
              : 'Synchronized master files for your active enrollments'}
          </p>
        </div>
        <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-100 px-3 py-1 text-sm font-semibold">
          {totalMaterials} {totalMaterials === 1 ? 'File' : 'Files'}
        </Badge>
      </div>

      {/* ── Tag Filter Bar ───────────────────────────────────────────── */}
      <TagFilterBar activeTag={activeTag} onSelect={setActiveTag} />

      {/* ── Section Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sections.map((section: MaterialSection) => (
          <Card
            key={section.section_id}
            className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col"
          >
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="secondary" className="mb-2 bg-slate-200/50 text-slate-700 hover:bg-slate-200/70">
                    Section {section.section_code}
                  </Badge>
                  <CardTitle className="text-lg text-slate-900">{section.course_name}</CardTitle>
                  <CardDescription className="font-medium text-slate-500 mt-1">
                    {section.course_code} • {section.semester} {section.year}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 flex flex-col relative">
              {/* Material list */}
              <div className="flex-1 overflow-y-auto max-h-[340px] p-4 space-y-3">
                {section.materials.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    No files for this filter
                  </div>
                ) : (
                  section.materials.map(mat => {
                    const tagMeta = mat.category_tag ? TAG_META[mat.category_tag] : null;
                    return (
                      <div
                        key={mat.note_id}
                        className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mr-4">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">{mat.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {tagMeta && (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${tagMeta.color}`}>
                                {tagMeta.icon}
                                {mat.category_tag}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 truncate">
                              {mat.uploader_name} • {new Date(mat.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {mat.file_url ? (
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-8 px-2 text-slate-400 cursor-not-allowed"
                            disabled
                          >
                            No URL
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Teacher upload panel */}
              {isTeacher && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
                  {uploadingSection === section.section_id ? (
                    <form onSubmit={e => handleAppendSubmit(e, section.section_id)} className="flex flex-col gap-3">
                      <div className="space-y-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Material title (e.g. Lecture 4 Slides)"
                          value={uploadTitle}
                          onChange={e => setUploadTitle(e.target.value)}
                          disabled={isUploading}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        />

                        {/* ── Category tag selector (Lamia M1.2) ── */}
                        <select
                          value={uploadTag}
                          onChange={e => setUploadTag(e.target.value as MaterialCategoryTag)}
                          disabled={isUploading}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                          aria-label="Select category tag"
                        >
                          {ALL_CATEGORY_TAGS.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>

                        <div className="relative flex items-center justify-center w-full">
                          <label
                            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                              selectedFile
                                ? 'border-indigo-400 bg-indigo-50/50'
                                : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                            }`}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault();
                              if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                            }}
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                              <UploadCloud className={`w-6 h-6 mb-2 ${selectedFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                              <p className="mb-1 text-xs text-slate-500 font-medium text-center">
                                {selectedFile ? (
                                  <span className="text-indigo-700 font-bold truncate px-2 max-w-[200px] block">{selectedFile.name}</span>
                                ) : (
                                  <><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</>
                                )}
                              </p>
                              {!selectedFile && (
                                <p className="text-[10px] text-slate-400">PDF, DOCX, PPTX, JPEG, PNG (max 10 MB)</p>
                              )}
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.pptx,.jpg,.jpeg,.png"
                              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8"
                          disabled={isUploading}
                          onClick={() => { setUploadingSection(null); setSelectedFile(null); setUploadError(null); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                          disabled={isUploading || !uploadTitle.trim() || !selectedFile}
                        >
                          {isUploading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Uploading...
                            </span>
                          ) : 'Confirm Upload'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      onClick={() => { setUploadingSection(section.section_id); setUploadTitle(''); setUploadError(null); }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Append Material
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag Filter Bar — Lamia M1.2 Structural Category UI
// ---------------------------------------------------------------------------

interface TagFilterBarProps {
  activeTag: MaterialCategoryTag | 'All';
  onSelect:  (tag: MaterialCategoryTag | 'All') => void;
}

function TagFilterBar({ activeTag, onSelect }: TagFilterBarProps) {
  const pills: Array<{ label: MaterialCategoryTag | 'All'; icon?: React.ReactNode }> = [
    { label: 'All' },
    { label: 'Syllabus',        icon: <BookOpen     className="w-3 h-3" /> },
    { label: 'Lecture Slides',  icon: <Layers       className="w-3 h-3" /> },
    { label: 'Lab Manuals',     icon: <FlaskConical  className="w-3 h-3" /> },
    { label: 'Reference Books', icon: <LibraryBig   className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by material category">
      {pills.map(({ label, icon }) => {
        const isActive = activeTag === label;
        return (
          <button
            key={label}
            onClick={() => onSelect(label)}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isActive
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
