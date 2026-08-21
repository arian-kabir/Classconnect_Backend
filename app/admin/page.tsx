"use client";

/**
 * app/admin/page.tsx  — System Administrator Portal
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible only to admin-role users (enforced by session check + redirect).
 * Houses the Spreadsheet Routine Intake panel and other admin tools.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import SpreadsheetIntakePanel from "@/components/SpreadsheetIntakePanel";
import StaffingLedger from "@/components/StaffingLedger";

type AdminTab = "intake" | "staffing" | "overview";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("staffing");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading Admin Portal…</p>
      </div>
    );
  }

  const user = session?.user as any;

  return (
    <div style={styles.root}>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        {/* Logo */}
        <div style={styles.sidebarLogo}>
          <span style={styles.logoIcon}>🎓</span>
          <span style={styles.logoText}>ClassConnect</span>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          <p style={styles.navLabel}>Admin Tools</p>
          <NavItem
            icon="📋"
            label="Staffing Ledger"
            active={activeTab === "staffing"}
            onClick={() => setActiveTab("staffing")}
            id="nav-staffing"
          />
          <NavItem
            icon="📊"
            label="Routine Intake"
            active={activeTab === "intake"}
            onClick={() => setActiveTab("intake")}
            id="nav-intake"
          />
          <NavItem
            icon="🗂️"
            label="Overview"
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            id="nav-overview"
          />
        </nav>

        {/* User */}
        <div style={styles.sidebarUser}>
          <div style={styles.userAvatar}>
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={styles.userName}>{user?.name ?? "Admin"}</p>
            <p style={styles.userRole}>System Administrator</p>
          </div>
          <button
            id="admin-logout-btn"
            style={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
          >
            ↩
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={styles.main}>
        {/* Top bar */}
        <header style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>
              {activeTab === "staffing"
                ? "📋 Cross-Role Section Staffing & Allocation Ledger"
                : activeTab === "intake"
                ? "📊 Spreadsheet Routine Intake"
                : "🗂️ Overview"}
            </h1>
            <p style={styles.pageBreadcrumb}>
              Admin Portal / {activeTab === "staffing" ? "Staffing Ledger" : activeTab === "intake" ? "Routine Intake" : "Overview"}
            </p>
          </div>
          <button
            style={styles.dashboardBtn}
            onClick={() => router.push("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </header>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === "staffing" && <StaffingLedger />}
          {activeTab === "intake" && <SpreadsheetIntakePanel />}
          {activeTab === "overview" && <OverviewPlaceholder />}
        </div>
      </main>
    </div>
  );
}

// ── Placeholder for future overview tab ───────────────────────────────────────
function OverviewPlaceholder() {
  return (
    <div style={styles.placeholder}>
      <span style={{ fontSize: "3rem" }}>🔧</span>
      <p style={styles.placeholderText}>More admin tools coming soon.</p>
    </div>
  );
}

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({
  icon,
  label,
  active,
  onClick,
  id,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  id: string;
}) {
  return (
    <button
      id={id}
      style={{
        ...styles.navItem,
        ...(active ? styles.navItemActive : styles.navItemInactive),
      }}
      onClick={onClick}
    >
      <span style={styles.navIcon}>{icon}</span>
      {label}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background: "#0d1117",
    fontFamily: "'Hanken Grotesk', 'Inter', sans-serif",
  },
  loading: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    background: "#0d1117",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid rgba(0,180,150,0.2)",
    borderTopColor: "#00b496",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    color: "#64748b",
    fontSize: "0.9rem",
    margin: 0,
  },

  // Sidebar
  sidebar: {
    width: 240,
    background: "#0a0f14",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 1rem",
    flexShrink: 0,
    position: "sticky" as const,
    top: 0,
    height: "100vh",
  },
  sidebarLogo: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "2rem",
    padding: "0 0.5rem",
  },
  logoIcon: { fontSize: "1.4rem" },
  logoText: {
    fontWeight: 800,
    fontSize: "1rem",
    color: "#e2f8f5",
    letterSpacing: "-0.03em",
  },
  nav: { flex: 1 },
  navLabel: {
    fontSize: "0.68rem",
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    margin: "0 0 0.5rem 0.5rem",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    width: "100%",
    padding: "0.55rem 0.75rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.88rem",
    fontWeight: 600,
    marginBottom: "0.25rem",
    transition: "all 0.15s",
    textAlign: "left" as const,
  },
  navItemActive: {
    background: "rgba(0,38,38,0.8)",
    color: "#94e2c8",
    outline: "1px solid rgba(0,180,150,0.2)",
  },
  navItemInactive: {
    background: "transparent",
    color: "#64748b",
  },
  navIcon: { fontSize: "1rem" },
  sidebarUser: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    marginTop: "auto",
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #002626, #004040)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#94e2c8",
    fontWeight: 700,
    fontSize: "0.85rem",
    flexShrink: 0,
  },
  userName: {
    margin: 0,
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "#cbd5e1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  userRole: {
    margin: 0,
    fontSize: "0.7rem",
    color: "#475569",
  },
  logoutBtn: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0.2rem 0.4rem",
    borderRadius: "0.25rem",
    flexShrink: 0,
    transition: "color 0.15s",
  },

  // Main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 2rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
    backdropFilter: "blur(8px)",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },
  pageTitle: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "-0.02em",
  },
  pageBreadcrumb: {
    margin: "0.15rem 0 0",
    fontSize: "0.75rem",
    color: "#475569",
  },
  dashboardBtn: {
    padding: "0.5rem 1rem",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.5rem",
    color: "#94a3b8",
    fontSize: "0.82rem",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.15s",
  },
  content: {
    flex: 1,
    padding: "1.5rem 2rem",
    overflowY: "auto" as const,
  },

  // Placeholder
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "4rem",
    color: "#475569",
  },
  placeholderText: {
    margin: 0,
    fontSize: "1rem",
    color: "#475569",
  },
};
