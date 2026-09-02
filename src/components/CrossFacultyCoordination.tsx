"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, FileText, Vote, Plus, MessageSquare } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CrossFacultyCoordination({ courseId }: { courseId: number }) {
  const { data: session } = useSession();
  const role = session?.user?.role as "student" | "teacher" | "admin" | "tutor";
  
  // This component is only accessible to lecturers
  if (role !== "teacher" && role !== "admin") return null;

  const { data: facultyMembers } = useSWR(`/api/courses/${courseId}/faculty`, fetcher);
  
  const [activeTab, setActiveTab] = useState<"meetings" | "resources" | "chat">("meetings");

  return (
    <Card className="border-slate-200 shadow-sm bg-white dark:bg-slate-900 h-full flex flex-col">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Cross-Faculty Coordination
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Module 3.2 - Private space for lecturers teaching this course
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab("meetings")}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${activeTab === "meetings" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Calendar className="w-4 h-4 inline-block mr-1.5" /> Meetings
        </button>
        <button 
          onClick={() => setActiveTab("resources")}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${activeTab === "resources" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
        >
          <FileText className="w-4 h-4 inline-block mr-1.5" /> Resources
        </button>
        <button 
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 text-xs font-semibold text-center transition-colors ${activeTab === "chat" ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500 hover:text-slate-700"}`}
        >
          <MessageSquare className="w-4 h-4 inline-block mr-1.5" /> Discussion
        </button>
      </div>

      <CardContent className="flex-1 p-4 overflow-y-auto">
        {activeTab === "meetings" && (
          <div className="space-y-4">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-sm">
              <Plus className="w-4 h-4 mr-2" /> Propose New Meeting
            </Button>
            
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
              <h4 className="font-semibold text-slate-900 text-sm">Midterm Question Moderation</h4>
              <p className="text-xs text-slate-500 mt-1">Proposed by Dr. Smith</p>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
                  <span className="text-xs text-slate-700">Mon, 10:00 AM</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">2 votes</span>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2"><Vote className="w-3 h-3 mr-1" /> Vote</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-100">
                  <span className="text-xs text-slate-700">Tue, 02:00 PM</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">5 votes</span>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] px-2"><Vote className="w-3 h-3 mr-1" /> Vote</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="space-y-4">
            <Button variant="outline" className="w-full rounded-xl h-10 text-sm border-dashed border-2">
              <Plus className="w-4 h-4 mr-2" /> Share Teaching Resource
            </Button>
            <div className="text-center py-8 text-slate-400 text-sm italic">
              No private resources shared yet.
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 min-h-[150px] border border-slate-100 rounded-lg bg-slate-50 p-3 flex flex-col gap-3">
              <div className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-wider my-2">
                Faculty Discussion Started
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input 
                type="text" 
                placeholder="Type a message to other lecturers..." 
                className="flex-1 h-9 px-3 border border-slate-200 rounded-md text-sm"
              />
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4">Send</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
