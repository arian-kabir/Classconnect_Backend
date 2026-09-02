"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, UploadCloud, Download, CheckCircle, Clock } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AssignmentSubmissionHub({ sectionId }: { sectionId: number }) {
  const { data: session } = useSession();
  const role = session?.user?.role as "student" | "teacher" | "admin" | "tutor";
  
  const { data: assignments, mutate } = useSWR(`/api/assignments?sectionId=${sectionId}`, fetcher);
  
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;
    
    await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, title, dueDate })
    });
    
    setTitle("");
    setDueDate("");
    setIsCreating(false);
    mutate();
  };

  const handleFileUpload = async (assignmentId: number, file: File) => {
    // In a real implementation, this would integrate with Google Drive API
    // and store the submission record in the database.
    const formData = new FormData();
    formData.append("assignmentId", assignmentId.toString());
    formData.append("file", file);
    
    await fetch("/api/assignments/submissions", {
      method: "POST",
      body: formData
    });
    mutate();
  };

  return (
    <Card className="border-slate-200 shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Assignment Dropboxes
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Module 3.3 - Assignment Submission Form Formulator & Collection Hub
          </CardDescription>
        </div>
        {role === "teacher" && (
          <Button onClick={() => setIsCreating(!isCreating)} variant="outline" size="sm">
            {isCreating ? "Cancel" : "New Assignment"}
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {isCreating && (
          <form onSubmit={handleCreateAssignment} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100">
            <h4 className="text-sm font-semibold mb-3">Create Digital Dropbox</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Assignment Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm"
                required
              />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-9 px-3 border border-slate-200 rounded-md text-sm"
                required
              />
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm">
                Deploy Dropbox
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {!assignments ? (
            <p className="text-sm text-slate-500 text-center py-4">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No assignments active.</p>
          ) : (
            assignments.map((assignment: any) => (
              <div key={assignment.id} className="p-4 border border-slate-200 rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-900">{assignment.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" /> Due: {new Date(assignment.dueDate).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={new Date(assignment.dueDate) < new Date() ? "destructive" : "secondary"}>
                    {new Date(assignment.dueDate) < new Date() ? "Closed" : "Active"}
                  </Badge>
                </div>

                {role === "student" && (
                  <div className="mt-2">
                    <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                      <span className="text-xs font-medium text-slate-600 flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Upload Submission (Drive Sync)
                      </span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileUpload(assignment.id, e.target.files[0]);
                        }} 
                      />
                    </label>
                  </div>
                )}

                {(role === "teacher" || role === "tutor") && (
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
                      <CheckCircle className="w-3 h-3 mr-2" /> Review Submissions ({assignment.submissionCount || 0})
                    </Button>
                    {role === "teacher" && (
                      <Button variant="secondary" size="sm" className="flex-1 text-xs h-8">
                        <Download className="w-3 h-3 mr-2" /> Download All (.zip)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
