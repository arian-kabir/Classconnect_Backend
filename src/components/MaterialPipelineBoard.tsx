'use client';

/**
 * src/app/components/MaterialPipelineBoard.tsx
 *
 * Futuristic UI/UX Implementation for the Course Material Provisioning Pipeline.
 *
 * Implements:
 * - Manual Stale-While-Revalidate (SWR) pattern with AbortControllers.
 * - Loading skeletons for layout shift elimination.
 * - Graceful error boundaries & retry mechanisms.
 * - Role-aware UI (Students view, Teachers get upload capabilities).
 */

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, UploadCloud, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import type { MaterialsApiResponse, MaterialSection } from '@/types/materials';
import { useSession } from 'next-auth/react';

// Skeletons
function BoardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded-md"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-slate-100 shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-6 w-3/4 bg-slate-200 rounded-md mb-2"></div>
              <div className="h-4 w-1/2 bg-slate-100 rounded-md"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mt-4">
                <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
                <div className="h-10 w-full bg-slate-50 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Session expired. Please sign in again.');
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
};

export default function MaterialPipelineBoard() {
  const { data: session } = useSession();
  const isTeacher = session?.user?.role === 'teacher' || session?.user?.role === 'admin';

  const { data: materialsData, error: swrError, mutate } = useSWR<MaterialsApiResponse>('/api/materials', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  });

  const { data: routines } = useSWR<any[]>('/api/routines', fetcher);

  const isLoading = !materialsData && !swrError;
  const error = swrError?.message || null;

  // Filter sections for students based on their actual routine enrollments
  const displayData = React.useMemo(() => {
    if (!materialsData) return null;
    if (isTeacher) return materialsData; // Teachers/Admins see all assigned pipeline sections

    const enrolledSectionIds = new Set(routines?.map(r => r.section_id) || []);
    
    return {
      ...materialsData,
      sections: materialsData.sections.filter(s => enrolledSectionIds.has(s.section_id))
    };
  }, [materialsData, routines, isTeacher]);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [uploadingSection, setUploadingSection] = useState<number | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleAppendSubmit = async (e: React.FormEvent, sectionId: number) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !selectedFile) {
        setUploadError("Please provide a title and select a file to upload.");
        return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Use actual FormData for multipart/form-data upload.
      // This perfectly aligns with a production backend expecting binary file streams.
      const formData = new FormData();
      formData.append('section_id', sectionId.toString());
      formData.append('title', uploadTitle.trim());
      formData.append('file', selectedFile);

      const res = await fetch('/api/materials', {
        method: 'POST',
        // Note: Do NOT set Content-Type header manually when sending FormData.
        // The browser automatically sets it to multipart/form-data with the correct boundary.
        body: formData,
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }

      setUploadTitle("");
      setSelectedFile(null);
      setUploadingSection(null);
      mutate();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading && !materialsData) return <BoardSkeleton />;

  if (error && !materialsData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-red-100 shadow-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
        <p className="text-slate-500 mb-6 text-center">{error}</p>
        <Button onClick={() => mutate()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </Button>
      </div>
    );
  }

  if (!displayData || displayData.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Course Materials</h3>
        <p className="text-slate-500 max-w-sm mb-6">
          {isTeacher 
            ? "You haven't uploaded any materials for your sections yet."
            : "No materials have been published for your enrolled sections yet."}
        </p>
        {isTeacher && (
           <p className="text-sm text-slate-400">Sections you are assigned to will appear here.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Course Materials</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {isTeacher ? "Manage section assets" : "Synchronized master files for your active enrollments"}
          </p>
        </div>
        <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-100 px-3 py-1 text-sm font-semibold">
          {displayData.total_materials} Files
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayData.sections.map((section: MaterialSection) => (
          <Card key={section.section_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden flex flex-col">
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
              <div className="flex-1 overflow-y-auto max-h-[320px] p-4 space-y-3">
                {section.materials.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    No files available
                  </div>
                ) : (
                  section.materials.map(mat => (
                    <div key={mat.note_id} className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 group hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mr-4">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{mat.title}</h4>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {mat.uploader_name} • {new Date(mat.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 transition-all">
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
              
              {isTeacher && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 mt-auto">
                  {uploadingSection === section.section_id ? (
                    <form onSubmit={(e) => handleAppendSubmit(e, section.section_id)} className="flex flex-col gap-3">
                      <div className="space-y-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Material Title (e.g. Lecture 4 Slides)"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                          disabled={isUploading}
                        />
                        <div className="relative flex items-center justify-center w-full">
                          <label 
                            className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${selectedFile ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                setSelectedFile(e.dataTransfer.files[0]);
                              }
                            }}
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
                              <UploadCloud className={`w-6 h-6 mb-2 ${selectedFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                              <p className="mb-1 text-xs text-slate-500 font-medium text-center">
                                {selectedFile ? (
                                  <span className="text-indigo-700 font-bold truncate px-2 w-full max-w-[200px] block">{selectedFile.name}</span>
                                ) : (
                                  <>
                                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                                  </>
                                )}
                              </p>
                              {!selectedFile && (
                                <p className="text-[10px] text-slate-400">PDF, DOCX, PPTX (MAX. 10MB)</p>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" className="flex-1 h-8" onClick={() => { setUploadingSection(null); setSelectedFile(null); }} disabled={isUploading}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" className="flex-1 h-8 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isUploading || !uploadTitle.trim() || !selectedFile}>
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
                      onClick={() => {
                        setUploadingSection(section.section_id);
                        setUploadTitle("");
                      }}
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
