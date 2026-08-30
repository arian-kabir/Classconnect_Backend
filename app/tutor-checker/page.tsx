'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AssignmentCheckerPage() {
  const [activeSubTab, setActiveSubTab] = useState<'checker' | 'audit'>('checker');

  // Module 3 State
  const [submissionId, setSubmissionId] = useState('1');
  const [originalText, setOriginalText] = useState('');
  const [annotatedText, setAnnotatedText] = useState('');
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  // Fetch student submission text and audit receipt
  const loadAuditTrail = async (idToFetch = submissionId) => {
    try {
      const res = await fetch(`/api/tutor-checker?submissionId=${idToFetch}`);
      if (!res.ok) return;
      const data = await res.json();
      
      setReceipt(data);
      if (data.originalText) setOriginalText(data.originalText);
      if (data.correctedHtml) {
        setAnnotatedText(data.correctedHtml);
      } else if (data.originalText) {
        setAnnotatedText(data.originalText);
      }
      if (data.grade) setGrade(data.grade);
      if (data.feedback) setFeedback(data.feedback);
    } catch (err) {
      console.error('Error fetching audit trail:', err);
    }
  };

  const handleOpenScript = async () => {
    try {
      const res = await fetch('/api/tutor-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOG_OPEN',
          submissionId,
          userId: '101',
          userName: 'Lamia (Tutor)',
          userRole: 'STUDENT_TUTOR',
        }),
      });

      const openData = await res.json();
      if (openData.originalText) {
        setOriginalText(openData.originalText);
        setAnnotatedText(openData.originalText);
      }
      await loadAuditTrail();
    } catch (err) {
      console.error('Error opening script:', err);
    }
  };

  const handleSaveEvaluation = async (returnToStudent: boolean) => {
    try {
      await fetch('/api/tutor-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SAVE_REVIEW',
          submissionId,
          userId: '101',
          userName: 'Lamia (Tutor)',
          userRole: 'STUDENT_TUTOR',
          correctedHtml: annotatedText,
          feedback,
          grade,
          returnToStudent,
        }),
      });
      await loadAuditTrail();
    } catch (err) {
      console.error('Error saving review:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#3B3F48] text-white font-sans flex flex-col">
      {/* ClassConnect Header matching your app */}
      <header className="bg-[#1E2330] px-6 py-4 flex items-center justify-between border-b border-[#2C3242]">
        <div className="flex items-center space-x-4">
          <button className="text-[#A0AEC0] hover:text-white text-xl">☰</button>
          <span className="text-xl font-semibold tracking-wide text-white">Class connect</span>
        </div>

        {/* Links pointing directly to your untouched original pages */}
        <nav className="flex items-center space-x-3">
          <Link
            href="/admin/routine"
            className="px-5 py-1.5 rounded-full text-sm font-medium border border-gray-600 text-[#CBD5E0] hover:border-gray-400"
          >
            Routine
          </Link>
          <Link
            href="/admin/materials"
            className="px-5 py-1.5 rounded-full text-sm font-medium border border-gray-600 text-[#CBD5E0] hover:border-gray-400"
          >
            Notes
          </Link>
          <button
            onClick={() => setActiveSubTab('checker')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeSubTab === 'checker'
                ? 'bg-[#3182CE] border-blue-400 text-white'
                : 'border-gray-600 text-[#CBD5E0] hover:border-gray-400'
            }`}
          >
            Assignment Checker
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeSubTab === 'audit'
                ? 'bg-[#3182CE] border-blue-400 text-white'
                : 'border-gray-600 text-[#CBD5E0] hover:border-gray-400'
            }`}
          >
            Audit Guard
          </button>
        </nav>
      </header>

      {/* Sub-Header Title Bar */}
      <div className="bg-[#262A34] py-3 px-6 flex items-center justify-center relative border-b border-[#323745]">
        <h2 className="text-xl font-serif tracking-wide text-[#E2E8F0]">
          {activeSubTab === 'checker' ? ' Assignment Checker (Student Tutors)' : 'Academic Assignment Audit Log & Submission Guard'}
        </h2>
      </div>

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
        {activeSubTab === 'checker' ? (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                placeholder="Submission ID"
                className="bg-[#21242D] px-4 py-2 rounded-lg text-white border border-[#3A3F4B] outline-none text-sm"
              />
              <button
                onClick={handleOpenScript}
                className="bg-[#3182CE] hover:bg-blue-500 px-5 py-2 rounded-lg font-semibold text-white text-sm shadow"
              >
                1. Open Script (Logs Audit Entry)
              </button>
            </div>

            <div className="bg-[#282C35] p-6 rounded-xl border border-[#3A3F4B] space-y-4">
              <p className="text-xs text-gray-400 italic">
                Student Tutors within the class section get access to assignment submissions and use basic document editing features to check and return scripts.
              </p>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Original Student Submission Text</label>
                <textarea
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  placeholder="Click '1. Open Script' above to load submission..."
                  rows={4}
                  className="w-full bg-[#1E2129] p-3.5 rounded-lg text-white border border-[#3A3F4B] text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Annotated / Corrected Script</label>
                <textarea
                  value={annotatedText}
                  onChange={(e) => setAnnotatedText(e.target.value)}
                  placeholder="Type tutor annotations or corrections here..."
                  rows={5}
                  className="w-full bg-[#1E2129] p-3.5 rounded-lg text-white border border-[#3A3F4B] text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">Assign Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. A, 85/100"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-[#1E2129] p-2.5 rounded-lg text-white border border-[#3A3F4B] text-sm outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleSaveEvaluation(true)}
                    className="w-full bg-[#00A86B] hover:bg-[#008F5B] text-white font-semibold py-2.5 rounded-lg text-sm shadow"
                  >
                    Save & Return to Student
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Feedback Notes</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Add feedback for the student..."
                  rows={3}
                  className="w-full bg-[#1E2129] p-3 rounded-lg text-white border border-[#3A3F4B] text-sm outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                placeholder="Submission ID"
                className="bg-[#21242D] px-4 py-2 rounded-lg text-white border border-[#3A3F4B] outline-none text-sm"
              />
              <button
                onClick={() => loadAuditTrail()}
                className="bg-[#4A5568] hover:bg-gray-600 px-5 py-2 rounded-lg font-semibold text-white text-sm shadow"
              >
                2. Refresh Audit Receipt
              </button>
            </div>

            <div className="bg-[#282C35] p-6 rounded-xl border border-[#3A3F4B]">
              <p className="text-xs text-gray-400 italic mb-4">
                Automated logging database monitoring assignment boxes. Records precise timestamp signatures to verify submission integrity and resolve lateness disputes.
              </p>

              {receipt ? (
                <div className="font-mono text-xs space-y-3 bg-[#1E2129] p-4 rounded-lg border border-[#3A3F4B]">
                  <p><strong className="text-gray-400">Receipt Hash:</strong> <span className="text-emerald-400">{receipt.receiptHash}</span></p>
                  <p><strong className="text-gray-400">Student:</strong> {receipt.studentName}</p>
                  <p>
                    <strong className="text-gray-400">Timeliness Integrity:</strong>{' '}
                    <span className={receipt.timeliness === 'LATE SUBMISSION' || receipt.isLate ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {receipt.timeliness || (receipt.isLate ? 'LATE SUBMISSION' : 'ON TIME')}
                    </span>
                  </p>
                  <p><strong className="text-gray-400">Current Status:</strong> {receipt.status}</p>

                  <div className="mt-4 border-t border-[#3A3F4B] pt-4">
                    <h4 className="font-bold text-gray-300 mb-2">Automated Custody Chain Logs:</h4>
                    {receipt.logs?.map((log: any, idx: number) => (
                      <div key={idx} className="bg-[#262A34] p-2.5 rounded mb-2 flex justify-between border border-[#3A3F4B]">
                        <span>{(log.action || '').toUpperCase()} by {log.user_name || log.userName} ({log.user_role || log.userRole})</span>
                        <span className="text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Click "Refresh Audit Receipt" to view transaction history.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}