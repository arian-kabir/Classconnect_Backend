"use client";

/**
 * SpreadsheetIntakePanel.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin UI panel for the Automated External Spreadsheet Routine Intake feature.
 * Triggers POST /api/routines/intake and shows a live result log.
 *
 * Styled with the Academic Nexus design system:
 *   - Deep Teal  #002626  (primary)
 *   - Muted Sage #51625b  (secondary)
 *   - Hanken Grotesk font
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedRow {
  sheetRowRef: number;
  courseCode: string;
  sectionCode: string;
  sectionId: number | null;
  teacherInitials: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface Warning {
  sheetRowRef: number;
  rawRow: string[];
  reason: string;
}

interface IntakeResult {
  success?: boolean;
  dryRun?: boolean;
  totalRawRows?: number;
  parsed?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  parsedRows?: ParsedRow[]; // dry-run only
  warnings?: Warning[];
  errors?: Array<{ sheetRowRef: number; error: string }>;
  error?: string;
  hint?: string;
}

interface LastRun {
  log_id: number;
  spreadsheet_id: string;
  sheet_range: string;
  total_raw_rows: number;
  inserted: number;
  updated: number;
  skipped: number;
  warnings_count: number;
  errors_count: number;
  ran_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSheetId(input: string): string {
  // Accept full URL or bare ID
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : input.trim();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SpreadsheetIntakePanel() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [range, setRange] = useState("Sheet1!A2:F1000");
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "log">("preview");
  const logRef = useRef<HTMLDivElement>(null);

  // ── Load last run on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/routines/intake")
      .then((r) => r.json())
      .then((d) => setLastRun(d.lastRun ?? null))
      .catch(() => {});
  }, []);

  // Scroll log to bottom whenever result changes
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [result]);

  // ── Run intake ──────────────────────────────────────────────────────────
  async function handleRun() {
    const spreadsheetId = extractSheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setResult({ error: "Please enter a valid Google Sheets URL or Spreadsheet ID." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/routines/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, range, dryRun }),
      });
      const data: IntakeResult = await res.json();
      setResult(data);
      if (!dryRun && data.success) {
        // Refresh last-run metadata
        fetch("/api/routines/intake")
          .then((r) => r.json())
          .then((d) => setLastRun(d.lastRun ?? null))
          .catch(() => {});
      }
      setActiveTab(dryRun ? "preview" : "log");
    } catch (err) {
      setResult({ error: "Network error — could not reach the API." });
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>📊</div>
        <div>
          <h2 style={styles.title}>Spreadsheet Routine Intake</h2>
          <p style={styles.subtitle}>
            Pull the university scheduling spreadsheet and pre-populate the routine calendar.
          </p>
        </div>
      </div>

      {/* ── Last Run Badge ──────────────────────────────────────────────── */}
      {lastRun && (
        <div style={styles.lastRunBadge}>
          <span style={styles.dot} />
          Last synced {fmtTime(lastRun.ran_at)} — {lastRun.inserted} inserted,{" "}
          {lastRun.updated} updated, {lastRun.skipped} skipped
        </div>
      )}

      {/* ── Config Form ─────────────────────────────────────────────────── */}
      <div style={styles.card}>
        <label style={styles.label}>Google Sheets URL or Spreadsheet ID</label>
        <input
          id="intake-spreadsheet-url"
          style={styles.input}
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/... or bare ID"
          value={spreadsheetUrl}
          onChange={(e) => setSpreadsheetUrl(e.target.value)}
        />

        <label style={{ ...styles.label, marginTop: "1rem" }}>
          Sheet Range
        </label>
        <input
          id="intake-sheet-range"
          style={styles.input}
          type="text"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          placeholder="e.g. Sheet1!A2:F1000"
        />

        {/* Dry-run toggle */}
        <div style={styles.toggleRow}>
          <button
            id="intake-dryrun-toggle"
            style={{
              ...styles.toggle,
              ...(dryRun ? styles.toggleActive : styles.toggleInactive),
            }}
            onClick={() => setDryRun((v) => !v)}
          >
            {dryRun ? "🔍 Preview Mode (no DB writes)" : "✅ Live Mode (writes to DB)"}
          </button>
          <span style={styles.toggleHint}>
            {dryRun
              ? "Safe — shows parsed rows without touching the database."
              : "Will UPSERT into section_schedules & routines tables."}
          </span>
        </div>

        <button
          id="intake-run-btn"
          style={{
            ...styles.runBtn,
            ...(loading ? styles.runBtnDisabled : {}),
          }}
          onClick={handleRun}
          disabled={loading}
        >
          {loading ? (
            <>
              <span style={styles.spinner} /> Running…
            </>
          ) : dryRun ? (
            "🔍 Preview Rows"
          ) : (
            "⚡ Run Intake Now"
          )}
        </button>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {result && (
        <div style={styles.card}>
          {/* Error state */}
          {result.error && (
            <div style={styles.errorBox}>
              <strong>❌ Error:</strong> {result.error}
              {result.hint && <p style={styles.hint}>{result.hint}</p>}
            </div>
          )}

          {/* Success stats */}
          {(result.success || result.dryRun) && (
            <>
              <div style={styles.statsRow}>
                <StatChip label="Raw Rows" value={result.totalRawRows ?? 0} color="#002626" />
                <StatChip label="Parsed" value={result.parsed ?? result.parsedRows?.length ?? 0} color="#51625b" />
                {!result.dryRun && (
                  <>
                    <StatChip label="Inserted" value={result.inserted ?? 0} color="#1a7a4a" />
                    <StatChip label="Updated" value={result.updated ?? 0} color="#0f4c81" />
                    <StatChip label="Skipped" value={result.skipped ?? 0} color="#7a5c1a" />
                  </>
                )}
                {(result.warnings?.length ?? 0) > 0 && (
                  <StatChip label="Warnings" value={result.warnings!.length} color="#b45309" />
                )}
                {(result.errors?.length ?? 0) > 0 && (
                  <StatChip label="Errors" value={result.errors!.length} color="#991b1b" />
                )}
              </div>

              {/* Tabs */}
              <div style={styles.tabRow}>
                {result.dryRun && (
                  <TabBtn
                    label="📋 Preview Table"
                    active={activeTab === "preview"}
                    onClick={() => setActiveTab("preview")}
                  />
                )}
                <TabBtn
                  label="📜 Log"
                  active={activeTab === "log"}
                  onClick={() => setActiveTab("log")}
                />
              </div>

              {/* Preview table (dry-run only) */}
              {activeTab === "preview" && result.parsedRows && (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {["Row", "Course", "Sec", "Section ID", "Day", "Start", "End", "Room", "Teacher", "Status"].map(
                          (h) => (
                            <th key={h} style={styles.th}>
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {result.parsedRows.map((row) => (
                        <tr key={row.sheetRowRef} style={styles.tr}>
                          <td style={styles.td}>{row.sheetRowRef}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{row.courseCode}</td>
                          <td style={styles.td}>{row.sectionCode}</td>
                          <td style={styles.td}>
                            {row.sectionId !== null ? (
                              <span style={styles.pillGreen}>#{row.sectionId}</span>
                            ) : (
                              <span style={styles.pillRed}>Not found</span>
                            )}
                          </td>
                          <td style={styles.td}>{row.dayOfWeek}</td>
                          <td style={styles.td}>{row.startTime}</td>
                          <td style={styles.td}>{row.endTime}</td>
                          <td style={styles.td}>{row.room}</td>
                          <td style={styles.td}>{row.teacherInitials || "—"}</td>
                          <td style={styles.td}>
                            {row.sectionId !== null ? (
                              <span style={styles.pillGreen}>✓ Ready</span>
                            ) : (
                              <span style={styles.pillRed}>⚠ Unmatched</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Log tab */}
              {activeTab === "log" && (
                <div ref={logRef} style={styles.logBox}>
                  {/* Warnings */}
                  {result.warnings && result.warnings.length > 0 && (
                    <>
                      <p style={styles.logSection}>⚠ Warnings ({result.warnings.length})</p>
                      {result.warnings.map((w, i) => (
                        <div key={i} style={styles.logEntry}>
                          <span style={styles.logRowTag}>Row {w.sheetRowRef}</span>{" "}
                          <span style={{ color: "#fbbf24" }}>{w.reason}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Errors */}
                  {result.errors && result.errors.length > 0 && (
                    <>
                      <p style={{ ...styles.logSection, color: "#f87171" }}>
                        ❌ Errors ({result.errors.length})
                      </p>
                      {result.errors.map((e, i) => (
                        <div key={i} style={styles.logEntry}>
                          <span style={styles.logRowTag}>Row {e.sheetRowRef}</span>{" "}
                          <span style={{ color: "#f87171" }}>{e.error}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {/* Success summary */}
                  {result.success && (
                    <div style={{ ...styles.logEntry, color: "#34d399" }}>
                      ✅ Intake complete — {result.inserted} inserted, {result.updated} updated, {result.skipped} skipped.
                    </div>
                  )}
                  {result.warnings?.length === 0 &&
                    result.errors?.length === 0 &&
                    !result.success && (
                      <div style={{ ...styles.logEntry, color: "#94a3b8" }}>
                        No warnings or errors to display.
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{ ...styles.chip, background: color }}>
      <span style={styles.chipValue}>{value}</span>
      <span style={styles.chipLabel}>{label}</span>
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : styles.tabInactive),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
    maxWidth: 900,
    margin: "0 auto",
    padding: "1.5rem",
    color: "#e2e8f0",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  headerIcon: {
    fontSize: "2.5rem",
    lineHeight: 1,
    filter: "drop-shadow(0 0 8px rgba(0,180,150,0.4))",
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#e2f8f5",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    fontSize: "0.85rem",
    color: "#94a3b8",
  },
  lastRunBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.8rem",
    color: "#34d399",
    background: "rgba(52,211,153,0.08)",
    border: "1px solid rgba(52,211,153,0.2)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    marginBottom: "1rem",
  },
  dot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#34d399",
    boxShadow: "0 0 6px #34d399",
    flexShrink: 0,
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1rem",
    padding: "1.5rem",
    marginBottom: "1rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
  },
  label: {
    display: "block",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "0.4rem",
  },
  input: {
    width: "100%",
    padding: "0.65rem 0.9rem",
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(81,98,91,0.5)",
    borderRadius: "0.5rem",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    margin: "1.25rem 0",
  },
  toggle: {
    padding: "0.5rem 1rem",
    borderRadius: "2rem",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.82rem",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  toggleActive: {
    background: "rgba(81,98,91,0.3)",
    color: "#94e2c8",
    outline: "1px solid rgba(81,98,91,0.6)",
  },
  toggleInactive: {
    background: "rgba(26,122,74,0.25)",
    color: "#34d399",
    outline: "1px solid rgba(26,122,74,0.5)",
  },
  toggleHint: {
    fontSize: "0.78rem",
    color: "#64748b",
  },
  runBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.8rem",
    background: "linear-gradient(135deg, #002626 0%, #004040 100%)",
    border: "1px solid rgba(0,180,150,0.3)",
    borderRadius: "0.625rem",
    color: "#e2f8f5",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    letterSpacing: "0.02em",
    transition: "all 0.2s",
    boxShadow: "0 2px 12px rgba(0,100,80,0.3)",
  },
  runBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  spinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  statsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.6rem",
    marginBottom: "1rem",
  },
  chip: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0.4rem 0.8rem",
    borderRadius: "0.5rem",
    minWidth: 72,
  },
  chipValue: {
    fontSize: "1.4rem",
    fontWeight: 700,
    color: "#fff",
    lineHeight: 1,
  },
  chipLabel: {
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginTop: 2,
  },
  tabRow: {
    display: "flex",
    gap: "0.4rem",
    marginBottom: "0.75rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: "0.5rem",
  },
  tab: {
    padding: "0.35rem 0.9rem",
    border: "none",
    borderRadius: "0.4rem",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 600,
    transition: "all 0.15s",
  },
  tabActive: {
    background: "rgba(0,38,38,0.9)",
    color: "#94e2c8",
    outline: "1px solid rgba(0,180,150,0.3)",
  },
  tabInactive: {
    background: "transparent",
    color: "#64748b",
  },
  tableWrap: {
    overflowX: "auto",
    borderRadius: "0.5rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.82rem",
  },
  th: {
    padding: "0.5rem 0.75rem",
    background: "rgba(0,38,38,0.6)",
    color: "#94a3b8",
    fontWeight: 600,
    textAlign: "left",
    whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  tr: {
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  td: {
    padding: "0.45rem 0.75rem",
    color: "#cbd5e1",
    whiteSpace: "nowrap",
  },
  pillGreen: {
    background: "rgba(26,122,74,0.25)",
    color: "#34d399",
    padding: "0.15rem 0.5rem",
    borderRadius: "2rem",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  pillRed: {
    background: "rgba(153,27,27,0.25)",
    color: "#f87171",
    padding: "0.15rem 0.5rem",
    borderRadius: "2rem",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  logBox: {
    background: "rgba(0,0,0,0.35)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    maxHeight: 300,
    overflowY: "auto",
    fontFamily: "'Fira Code', 'Courier New', monospace",
    fontSize: "0.8rem",
    lineHeight: 1.6,
  },
  logSection: {
    color: "#94a3b8",
    fontWeight: 700,
    margin: "0.5rem 0 0.25rem",
    fontFamily: "inherit",
  },
  logEntry: {
    margin: "0.15rem 0",
    color: "#cbd5e1",
  },
  logRowTag: {
    background: "rgba(81,98,91,0.3)",
    color: "#94e2c8",
    padding: "0.05rem 0.4rem",
    borderRadius: "0.25rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    marginRight: "0.25rem",
  },
  errorBox: {
    background: "rgba(153,27,27,0.15)",
    border: "1px solid rgba(248,113,113,0.25)",
    borderRadius: "0.5rem",
    padding: "0.75rem 1rem",
    color: "#f87171",
    fontSize: "0.88rem",
  },
  hint: {
    color: "#94a3b8",
    marginTop: "0.4rem",
    marginBottom: 0,
    fontSize: "0.82rem",
  },
};
