"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, FileText, Vote, Plus, MessageSquare, AlertCircle, Send, CheckCircle2 } from "lucide-react";

interface FacultyMember {
  id: number;
  name: string;
  role: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch data");
  return res.json();
};

export default function CrossFacultyCoordination({ courseId }: { courseId: number }) {
  const { data: session } = useSession();
  const role = session?.user?.role as "student" | "teacher" | "admin" | "tutor" | undefined;
  
  // This component is strictly gated
  if (role !== "teacher" && role !== "admin") return null;

  const { data: facultyMembers, isLoading, error } = useSWR<FacultyMember[]>(
    `/api/courses/${courseId}/faculty`, 
    fetcher
  );

  // New SWR fetch for meetings
  const { data: meetings, isLoading: meetingsLoading } = useSWR<any[]>(
    `/api/courses/${courseId}/meetings`,
    fetcher
  );
  
  const [activeTab, setActiveTab] = useState<"meetings" | "resources" | "chat">("meetings");
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<{senderId: string, name: string, text: string, timestamp: string}[]>([
    { senderId: "SC", name: "Dr. Sarah Chen", text: "Have we decided on the rubric for Assignment 2?", timestamp: "10:42 AM" }
  ]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const newMsg = {
      senderId: session?.user?.name ? session.user.name.split(' ').map(n => n[0]).join('') : "ME",
      name: session?.user?.name || "Me",
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput("");
    setIsSending(true);
    // Simulate network delay for sending message
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsSending(false);
  };

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900 h-full flex flex-col overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              Faculty Coordination
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-1 ml-10">
              Module 3.2 - Private orchestration ring
            </CardDescription>
          </div>
          {facultyMembers && (
            <div className="flex -space-x-2 overflow-hidden">
              {facultyMembers.map((member, i) => (
                <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600" title={member.name}>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      
      <div className="flex border-b border-slate-100 bg-white">
        {(["meetings", "resources", "chat"] as const).map((tab) => {
          const icons = {
            meetings: <Calendar className="w-4 h-4 inline-block mr-1.5" />,
            resources: <FileText className="w-4 h-4 inline-block mr-1.5" />,
            chat: <MessageSquare className="w-4 h-4 inline-block mr-1.5" />
          };
          const labels = {
            meetings: "Agendas",
            resources: "Assets",
            chat: "Alignment"
          };
          
          return (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-xs font-bold text-center transition-all relative ${
                activeTab === tab 
                  ? "text-indigo-600" 
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50/50"
              }`}
            >
              {icons[tab]} {labels[tab]}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full shadow-[0_-2px_4px_rgba(79,70,229,0.3)]"></span>
              )}
            </button>
          );
        })}
      </div>

      <CardContent className="flex-1 p-5 overflow-y-auto bg-slate-50/30">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 font-medium border border-red-100">
            <AlertCircle className="w-4 h-4" />
            Failed to sync coordination data.
          </div>
        )}

        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-slate-200 rounded-xl w-full"></div>
            <div className="h-24 bg-slate-200 rounded-xl w-full"></div>
          </div>
        )}

        {!isLoading && !error && activeTab === "meetings" && (
          <div className="space-y-5 flex flex-col h-full">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-sm shadow-sm transition-all font-semibold"
              onClick={() => alert("Coordination Sync Scheduler initiated. Instructors will be notified to vote on timeslots.")}
            >
              <Plus className="w-4 h-4 mr-2" /> Schedule Coordination Sync
            </Button>
            
            <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 text-sm">Midterm Question Moderation</h4>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 shadow-none hover:bg-amber-50">Voting</Badge>
              </div>
              <div className="text-xs font-medium text-slate-500 mb-4 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">SC</div>
                Proposed by Dr. Sarah Chen
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors group">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-700">Mon, 10:00 AM</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-400">2 votes</span>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-3 font-semibold bg-white" onClick={() => alert("Row-level locked transaction executed: Vote cast successfully!")}><Vote className="w-3 h-3 mr-1.5 text-indigo-500" /> Vote</Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tue, 02:00 PM
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-indigo-600">5 votes</span>
                    <Button size="sm" className="h-7 text-[10px] px-3 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={() => alert("Row-level locked transaction executed: Vote cast successfully!")}>Voted</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === "resources" && (
          <div className="space-y-4">
            <Button 
             variant="outline" 
             className="w-full rounded-xl h-12 text-sm border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 font-semibold transition-all"
             onClick={() => alert("File picker engaged. Encrypted Google Drive stream initialized for private faculty asset sharing.")}
           >
             <Plus className="w-4 h-4 mr-2" /> Upload Private Teaching Asset
           </Button>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">Vault Empty</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Securely exchange question banks or grading rubrics here.</p>
            </div>
          </div>
        )}

        {!isLoading && !error && activeTab === "chat" && (
          <div className="flex flex-col h-full min-h-[300px]">
            <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-sm p-4 flex flex-col gap-3 overflow-y-auto mb-3">
              <div className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest my-3 flex items-center gap-2 before:h-px before:flex-1 before:bg-slate-100 after:h-px after:flex-1 after:bg-slate-100">
                Encrypted Alignment Ring
              </div>
              
              {messages.map((msg, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">{msg.senderId}</div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-900">{msg.name}</span>
                      <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-r-xl rounded-bl-xl border border-slate-100 mt-1">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleSendMessage} className="flex gap-2 relative">
              <input 
                type="text" 
                placeholder="Message the faculty ring..." 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isSending}
                className="flex-1 h-10 pl-4 pr-10 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-sm transition-all outline-none disabled:opacity-50 shadow-sm"
              />
              <Button 
                type="submit" 
                disabled={isSending || !chatInput.trim()}
                size="sm" 
                className="absolute right-1 top-1 h-8 w-8 p-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all"
              >
                {isSending ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 ml-0.5" />
                )}
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
