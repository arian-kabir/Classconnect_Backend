"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, FileArchive, CheckCircle, Clock, Plus, X, AlertCircle, RefreshCw, Download, Lock } from "lucide-react";
import type { Assignment, AuditLogEntry } from "@/types/index";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 border border-slate-100 rounded-lg bg-slate-50/50 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 w-full">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-200 rounded w-1/4"></div>
            </div>
            <div className="h-5 bg-slate-200 rounded w-16"></div>
          </div>
          <div className="h-10 bg-slate-200 rounded w-full mt-2"></div>
        </div>
      ))}
    </div>
  );
}

export default function AssignmentSubmissionHub({ sectionId }: { sectionId: number }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "student";
  const isTutor = role === "tutor" || role === "student_tutor";
  const isStudent = role === "student";

  const { data: assignments, error, mutate, isLoading } = useSWR<Assignment[]>(
    `/api/assignments?sectionId=${sectionId}`,
    fetcher
  );

  // M1.4 to M3.3 Synchronization: Fetch routines to ensure student is actually enrolled
  const { data: routines } = useSWR<any[]>(
    isStudent ? '/api/routines' : null,
    fetcher
  );
  
  const isEnrolled = !isStudent || routines?.some((r: any) => r.section_id.toString() === sectionId.toString());

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<number | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<{id: number, message: string} | null>(null);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!title.trim() || !dueDate) {
      setFormError("Title and Due Date are required.");
      return;
    }

    if (new Date(dueDate) < new Date()) {
      setFormError("Due Date must be in the future.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, title: title.trim(), dueDate })
      });
      
      if (!res.ok) throw new Error("Failed to deploy dropbox");
      
      setTitle("");
      setDueDate("");
      setIsCreating(false);
      mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (assignmentId: number, file: File) => {
    setActiveUploadId(assignmentId);
    try {
      const formData = new FormData();
      formData.append("assignmentId", assignmentId.toString());
      formData.append("file", file);
      
      const res = await fetch("/api/assignments/submissions", {
        method: "POST",
        body: formData
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setUploadError({ id: assignmentId, message: errorData.error || `Upload failed (HTTP ${res.status})` });
        return;
      }
      
      const responseData = await res.json();
      
      // INTEGRATION HOOK — Lamia's M3.6 (Academic Assignment Audit Log)
      // Emit a structured audit event for Lamia's logging infrastructure using real crypto hash.
      const auditPayload: AuditLogEntry = {
        logId: `${Date.now()}`,
        eventType: 'SUBMISSION_UPLOADED',
        assignmentId,
        sectionId,
        userId: session?.user?.email ?? 'unknown',
        fileName: responseData.metadata.fileName,
        fileHash: responseData.metadata.hash,
        timestamp: responseData.metadata.timestamp,
        status: 'success',
      };
      console.log('[AuditLog M3.6] Emission payload:', auditPayload);
      // TODO: await fetch('/api/audit', { method: 'POST', body: JSON.stringify(auditPayload) });

      // Artificial delay to simulate Drive Sync and give visual feedback
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSubmittedIds(prev => new Set(prev).add(assignmentId));
      mutate();
    } catch (err) {
      console.error(err);
      // Would ideally trigger a toast here
    } finally {
      setActiveUploadId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-indigo-500" />
              Digital Dropboxes
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1">
              Secure collection hub synced with Google Drive
            </CardDescription>
          </div>
          {(role === "teacher" || role === "admin") && (
            <Button 
              onClick={() => { setIsCreating(!isCreating); setFormError(null); }} 
              variant={isCreating ? "outline" : "default"} 
              size="sm"
              className={!isCreating ? "bg-slate-900 hover:bg-slate-800 text-white shadow-sm" : ""}
            >
              {isCreating ? <><X className="w-4 h-4 mr-1.5" /> Cancel</> : <><Plus className="w-4 h-4 mr-1.5" /> New Assignment</>}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        {isCreating && (
          <form onSubmit={handleCreateAssignment} className="mb-6 p-5 bg-white border border-indigo-100 rounded-xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              Deploy New Dropbox
            </h4>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 font-medium border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {formError}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. System Architecture Diagram"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm transition-all outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {/* 
                   * INTEGRATION HOOK — Faria's M3.4 (Contextual Study Scheduler):
                   * When a new assignment dropbox is deployed, the `dueDate` must be forwarded
                   * to Faria's BullMQ job scheduler to fire reminder notifications
                   * 24h and 1h before the deadline. TODO: Emit event to /api/notifications/schedule.
                   */}
                  Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm transition-all outline-none"
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 shadow-sm font-semibold rounded-lg">
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deploying...
                  </span>
                ) : "Create Dropbox"}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {error && (
            <div className="p-6 text-center border border-red-100 bg-red-50 rounded-xl">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-600">Failed to load dropboxes</p>
              <Button onClick={() => mutate()} variant="outline" size="sm" className="mt-3 bg-white text-red-600 border-red-200 hover:bg-red-50">
                <RefreshCw className="w-3 h-3 mr-2" /> Retry
              </Button>
            </div>
          )}

          {isLoading ? (
            <SkeletonLoader />
          ) : !assignments || assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                <FileArchive className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Active Dropboxes</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[250px]">
                {role === "teacher" 
                  ? "Create a new assignment dropbox to start collecting submissions."
                  : "There are no pending assignments for this section."}
              </p>
            </div>
          ) : (
            assignments.map((assignment) => {
              // The isClosed calculation compares the deadline with the current local time.
              // NOTE: API ISO strings should ideally be UTC and compared consistently to avoid timezone edge cases.
              const isClosed = new Date(assignment.dueDate) < new Date();
              const uploadActive = activeUploadId === assignment.id;
              const hasSubmitted = submittedIds.has(assignment.id);
              
              return (
                <div key={assignment.id} className="p-4 border border-slate-200 rounded-xl flex flex-col gap-3 bg-white hover:border-indigo-100 transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">{assignment.title}</h4>
                      <p className={`text-xs flex items-center gap-1.5 mt-1.5 font-medium ${isClosed ? 'text-red-500' : 'text-slate-500'}`}>
                        <Clock className="w-3.5 h-3.5" /> 
                        {isClosed ? "Deadline Passed:" : "Due:"} {new Date(assignment.dueDate).toLocaleString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge className={isClosed ? "bg-red-50 text-red-700 hover:bg-red-50 border-red-100 shadow-none" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 shadow-none"}>
                      {isClosed ? "Closed" : "Active"}
                    </Badge>
                  </div>

                  {role === "student" && (
                    <div className="mt-2">
                      {!isEnrolled ? (
                        <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-amber-200 bg-amber-50 rounded-lg text-center gap-1.5">
                          <Lock className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-semibold text-amber-700 leading-tight">
                            You must enroll in this section via the Routine Builder to submit assignments.
                          </span>
                        </div>
                      ) : hasSubmitted ? (
                        <div className="flex items-center justify-center w-full h-12 border-2 border-emerald-400 bg-emerald-50 rounded-lg text-emerald-700 font-bold text-xs gap-2">
                          <CheckCircle className="w-4 h-4" /> Submitted ✓
                        </div>
                      ) : (
                        <label className={`flex items-center justify-center w-full h-12 border-2 border-dashed rounded-lg transition-all ${
                          isClosed ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed" : 
                          uploadActive ? "border-indigo-400 bg-indigo-50/50" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"
                        }`}>
                          {uploadActive ? (
                            <span className="text-xs font-bold text-indigo-600 flex items-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" /> 
                              Syncing to Google Drive...
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                              <UploadCloud className={`w-4 h-4 ${isClosed ? 'text-slate-400' : 'text-indigo-500'}`} /> 
                              {isClosed ? "Submissions Closed" : "Upload Submission (Drive Sync)"}
                            </span>
                          )}
                          <input 
                            type="file" 
                            className="hidden" 
                            disabled={isClosed || uploadActive}
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(assignment.id, e.target.files[0]);
                            }} 
                          />
                        </label>
                      )}
                      
                      {/* Render Graceful Error Overlay */}
                      {uploadError?.id === assignment.id && (
                        <div className="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-semibold flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {uploadError.message}
                        </div>
                      )}
                    </div>
                  )}

                  {(role === "teacher" || role === "tutor" || role === "admin") && (
                    <div className="mt-3 flex gap-2 pt-3 border-t border-slate-100">
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-8 bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-semibold shadow-sm">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Review ({assignment.submissionCount})
                      </Button>
                      {role === "tutor" ? (
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-8 bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-700 font-semibold shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Review & Return
                        </Button>
                      ) : (
                        (role === "teacher" || role === "admin") && (
                          <Button variant="outline" size="sm" className="flex-1 text-xs h-8 bg-indigo-50 hover:bg-indigo-100 border-indigo-100 text-indigo-700 font-semibold shadow-sm">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Export (.zip)
                          </Button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
