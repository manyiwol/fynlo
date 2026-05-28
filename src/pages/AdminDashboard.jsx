import { useEffect, useState } from "react";

import { supabase } from "../supabaseClient";

// ─── Disburse Modal ────────────────────────────────────────────────────────────
function DisburseModal({ loan, onClose, onSend }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSend(loan, phone);
    setLoading(false);
  };

  return (
    <div style={m.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...m.modal, maxWidth: "420px" }}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Send Loan via PayNow</h2>
            <p style={m.sub}>Disbursing ${parseFloat(loan.principal).toLocaleString()} to client</p>
          </div>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>
        <form onSubmit={handleSend} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
              Client EcoCash / OneMoney Number
            </label>
            <input
              style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "0.75rem 1rem", color: "#fff", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" }}
              type="tel" placeholder="e.g. 0771234567"
              value={phone} onChange={(e) => setPhone(e.target.value)} required
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" disabled={loading}
              style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", padding: "0.75rem", fontWeight: "700", cursor: "pointer" }}>
              {loading ? "Sending..." : "Send via PayNow"}
            </button>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: "#7f1d1d22", color: "#f87171", border: "1px solid #7f1d1d44", borderRadius: "8px", padding: "0.75rem", fontWeight: "700", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── File Review Modal ─────────────────────────────────────────────────────────
function FileReviewModal({ loan, users, onClose, onApprove, onReject, onDelete, onDisburse }) {
  // ✅ Pull applicant details from loan record first, fall back to profile
  const profile = users.find((u) => u.user_id === loan.user_id) || {};
  const [actionLoading, setActionLoading] = useState(null);
  const [showDisburse, setShowDisburse] = useState(false);

  const documents = [
    { url: loan.payslip_url, label: "Payslip / Proof of Income", icon: "💼" },
    { url: loan.id_proof_url, label: "National ID / Passport", icon: "🪪" },
    { url: loan.proof_of_residence_url, label: "Proof of Residence", icon: "🏠" },
    { url: loan.collateral_url, label: "Collateral Document", icon: "📋" },
    { url: loan.student_id_url, label: "Student ID", icon: "🎓" },
  ].filter((d) => d.url);

  const handleApprove = async () => {
    setActionLoading("approve");
    await onApprove(loan.id);
    setActionLoading(null);
  };

  const handleReject = async () => {
    setActionLoading("reject");
    await onReject(loan.id);
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this loan application?")) return;
    setActionLoading("delete");
    await onDelete(loan.id);
    setActionLoading(null);
    // onClose is called inside onDelete handler in the parent
  };

  if (showDisburse) {
    return <DisburseModal loan={loan} onClose={() => setShowDisburse(false)} onSend={async (l, phone) => {
      await onDisburse(l, phone);
      setShowDisburse(false);
      onClose();
    }} />;
  }

  return (
    <div style={m.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        <div style={m.header}>
          <div>
            <h2 style={m.title}>Application Review</h2>
            <p style={m.sub}>Loan #{loan.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>

        <div style={m.scrollBody}>
          {/* ✅ Applicant Info — reads from loan columns directly (saved at apply time) */}
          <section style={m.section}>
            <p style={m.sectionLabel}>Applicant Details</p>
            <div style={m.grid2}>
              <InfoItem label="Full Name" value={loan.full_name || profile.full_name || "—"} />
              <InfoItem label="Phone" value={loan.phone || profile.phone || "—"} />
              <InfoItem label="Gender" value={loan.gender || profile.gender || "—"} />
              <InfoItem label="National ID" value={loan.national_id || "—"} />
              <InfoItem label="Date of Birth" value={loan.date_of_birth || "—"} />
              <InfoItem label="Home Address" value={loan.home_address || "—"} />
              <InfoItem label="Employment Status" value={loan.employment_status || "—"} />
              <InfoItem label="Monthly Income" value={loan.monthly_income != null ? `$${parseFloat(loan.monthly_income).toLocaleString()}` : "—"} />
              <InfoItem label="Trust Score" value={profile.trust_score ?? "—"} />
              <InfoItem label="Account Status" value={profile.account_status || "—"} />
            </div>
          </section>

          {/* ✅ Next of Kin — reads from loan columns */}
          <section style={m.section}>
            <p style={m.sectionLabel}>Next of Kin</p>
            <div style={m.grid2}>
              <InfoItem label="Full Name" value={loan.next_of_kin_name || "—"} />
              <InfoItem label="Relationship" value={loan.next_of_kin_relationship || "—"} />
              <InfoItem label="Contact Number" value={loan.next_of_kin_phone || "—"} />
            </div>
          </section>

          {/* ✅ Student Info — only shown if institution_name was saved */}
          {loan.institution_name && (
            <section style={m.section}>
              <p style={m.sectionLabel}>Student Information</p>
              <div style={m.grid2}>
                <InfoItem label="Institution" value={loan.institution_name} />
                <InfoItem label="Year of Study" value={loan.year_of_study || "—"} />
              </div>
            </section>
          )}

          {/* Loan Details */}
          <section style={m.section}>
            <p style={m.sectionLabel}>Loan Details</p>
            <div style={m.grid2}>
              <InfoItem label="Principal" value={`$${parseFloat(loan.principal).toLocaleString()}`} />
              <InfoItem label="Term" value={`${loan.term_months} months`} />
              <InfoItem label="Interest Rate" value={`${(parseFloat(loan.interest_rate || 0) * 100).toFixed(1)}%`} />
              <InfoItem label="Monthly Payment" value={`$${((parseFloat(loan.principal) * (1 + parseFloat(loan.interest_rate || 0.05))) / loan.term_months).toFixed(2)}`} />
              <InfoItem label="Total Repayment" value={`$${(parseFloat(loan.principal) * (1 + parseFloat(loan.interest_rate || 0.05))).toFixed(2)}`} />
              <InfoItem label="Purpose" value={loan.purpose || "Not specified"} />
              <InfoItem label="Collateral" value={loan.collateral || "None"} />
              <InfoItem label="Applied On" value={new Date(loan.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
            </div>
          </section>

          {/* Documents */}
          <section style={m.section}>
            <p style={m.sectionLabel}>Supporting Documents</p>
            {documents.length === 0 ? (
              <div style={m.noDocsBox}>
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.875rem" }}>No documents uploaded with this application.</p>
              </div>
            ) : (
              <div style={m.docsGrid}>
                {documents.map((doc) => (
                  <a key={doc.label} href={doc.url} target="_blank" rel="noreferrer" style={m.docCard}>
                    <span style={m.docIcon}>{doc.icon}</span>
                    <div>
                      <p style={m.docLabel}>{doc.label}</p>
                      <p style={m.docAction}>Click to open ↗</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Actions */}
        <div style={m.actions}>
          {loan.status === "PENDING" && (
            <>
              <button style={{ ...m.btn, background: "#16a34a", color: "#fff", opacity: actionLoading ? 0.7 : 1 }}
                onClick={handleApprove} disabled={!!actionLoading}>
                {actionLoading === "approve" ? "Approving…" : "✓ Approve"}
              </button>
              <button style={{ ...m.btn, background: "#e53e3e22", color: "#f87171", border: "1px solid #e53e3e44", opacity: actionLoading ? 0.7 : 1 }}
                onClick={handleReject} disabled={!!actionLoading}>
                {actionLoading === "reject" ? "Rejecting…" : "✕ Reject"}
              </button>
            </>
          )}
          {loan.status === "REJECTED" && (
            <button style={{ ...m.btn, background: "#16a34a", color: "#fff" }}
              onClick={handleApprove}>
              ↺ Re-approve Loan
            </button>
          )}
          {loan.status === "ACTIVE" && loan.disbursement_status === "pending" && (
            <button style={{ ...m.btn, background: "#2563eb", color: "#fff" }}
              onClick={() => setShowDisburse(true)}>
              Send Money via PayNow
            </button>
          )}
          <button style={{ ...m.btn, background: "#7f1d1d22", color: "#f87171", border: "1px solid #7f1d1d44", opacity: actionLoading ? 0.7 : 1 }}
            onClick={handleDelete} disabled={!!actionLoading}>
            {actionLoading === "delete" ? "Deleting…" : "🗑 Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={m.infoItem}>
      <p style={m.infoLabel}>{label}</p>
      <p style={m.infoValue}>{String(value)}</p>
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard({ userEmail, onLogout }) {
  const [activePage, setActivePage] = useState("Overview");
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({ default_interest_rate: "0.05", late_fee_amount: "25.00", grace_period_days: "3" });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchLoans(), fetchUsers(), fetchSettings()]);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  const fetchLoans = async () => {
    const { data, error } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
    if (data) setLoans(data);
    else console.error(error);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*").order("updated_at", { ascending: false });
    if (data) setUsers(data);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("global_settings").select("*");
    if (data) {
      const map = {};
      data.forEach((s) => (map[s.key] = s.value));
      setSettings({ default_interest_rate: map.default_interest_rate || "0.05", late_fee_amount: map.late_fee_amount || "25.00", grace_period_days: map.grace_period_days || "3" });
    }
  };

  const approveLoan = async (loanId) => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    const due_date = today.toISOString().split("T")[0];
    const { error } = await supabase.from("loans").update({ status: "ACTIVE", due_date, rejected_at: null }).eq("id", loanId);
    if (error) { showToast("Failed to approve: " + error.message, "error"); return; }
    const loan = loans.find((l) => l.id === loanId);
    await supabase.from("notifications").insert({ user_id: loan.user_id, title: "Loan Approved ✓", message: `Your loan of $${parseFloat(loan.principal).toLocaleString()} has been approved. Due date: ${due_date}. The admin will send your funds shortly.`, type: "success" });
    await logAudit(`Approved loan ${loanId.slice(0, 8)}`);
    showToast("Loan approved.");
    setSelectedLoan(null);
    fetchLoans();
  };

  const rejectLoan = async (loanId) => {
    const { error } = await supabase.from("loans").update({ status: "REJECTED", rejected_at: new Date().toISOString() }).eq("id", loanId);
    if (error) { showToast("Failed to reject: " + error.message, "error"); return; }
    const loan = loans.find((l) => l.id === loanId);
    await supabase.from("notifications").insert({ user_id: loan.user_id, title: "Loan Application Rejected", message: `Your loan application of $${parseFloat(loan.principal).toLocaleString()} was not approved. Please contact us for more information.`, type: "error" });
    await logAudit(`Rejected loan ${loanId.slice(0, 8)}`);
    showToast("Loan rejected.", "error");
    setSelectedLoan(null);
    fetchLoans();
  };

  const deleteLoan = async (loanId) => {
    const { error, count } = await supabase.from("loans").delete({ count: "exact" }).eq("id", loanId);
    if (error) { showToast("Failed to delete: " + error.message, "error"); return; }

    if (count === 0) {
      showToast("Delete blocked — check your Supabase RLS delete policy on loans.", "error");
      return;
    }

    await logAudit(`Deleted loan ${loanId.slice(0, 8)}`);
    setLoans((prev) => prev.filter((l) => l.id !== loanId));
    setSelectedLoan(null);
    showToast("Loan application deleted.");
  };

  const disburseLoan = async (loan, phone) => {
    const paynowUrl = `https://www.paynow.co.zw/Payment/Link/?q=fynlo-${loan.id.slice(0, 8)}&amount=${loan.principal}&phone=${encodeURIComponent(phone)}`;
    window.open(paynowUrl, "_blank");
    await supabase.from("loans").update({ disbursement_status: "sent", disbursement_phone: phone }).eq("id", loan.id);
    await supabase.from("notifications").insert({ user_id: loan.user_id, title: "Loan Funds Sent via PayNow", message: `Your loan of $${parseFloat(loan.principal).toLocaleString()} has been sent to ${phone} via PayNow. Please confirm receipt in your Notifications page.`, type: "success" });
    await logAudit(`Disbursed loan ${loan.id.slice(0, 8)} to ${phone}`);
    showToast("Money sent via PayNow.");
    fetchLoans();
  };

  const logAudit = async (action) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_logs").insert({ admin_id: user.id, action, target_table: "loans" });
    } catch (e) { console.log("Audit log skipped:", e); }
  };

  const updateUserStatus = async (userId, status) => {
    await supabase.from("profiles").update({ account_status: status }).eq("user_id", userId);
    if (status === "active") {
      const user = users.find(u => u.user_id === userId);
      if (user) await supabase.from("notifications").insert({ user_id: userId, title: "Account Activated", message: "Your Fynlo account has been approved. You can now log in and apply for loans.", type: "success" });
    }
    fetchUsers();
    showToast(`User status updated to ${status}.`);
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) return;

    // ✅ Step 1: Delete profile row
    const { error: profileError } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (profileError) { showToast("Failed to delete profile: " + profileError.message, "error"); return; }

    // ✅ Step 2: Delete from Supabase Auth using admin API via edge function
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.warn("Auth delete warning:", err);
        // Still show success — profile is deleted even if auth cleanup had an issue
      }
    } catch (e) {
      console.warn("Edge function not available, only profile deleted:", e);
    }

    fetchUsers();
    showToast("User deleted.");
  };

  const handleSettingsSave = async () => {
    setSettingsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from("global_settings").update({ value, updated_at: new Date().toISOString(), updated_by: user.id }).eq("key", key);
    }
    showToast("Settings saved.");
    setSettingsLoading(false);
  };

  const triggerRiskAssessment = async (loan) => {
    try {
      const res = await fetch("http://localhost:8000/api/risk/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loan_id: loan.id, user_id: loan.user_id,
          principal: parseFloat(loan.principal), term_months: loan.term_months,
          interest_rate: parseFloat(loan.interest_rate),
          has_collateral: !!loan.collateral_url,
        }),
      });
      const data = await res.json();
      showToast(`Risk Score: ${data.score} — ${data.decision}`);
    } catch (_e) {
      showToast("Python service not running. Start with: python run.py", "error");
    }
  };

  const getStatusStyle = (status) => {
    const map = {
      ACTIVE:   { color: "#60a5fa", bg: "#2563eb22" },
      PENDING:  { color: "#f6ad55", bg: "#d9770622" },
      PAID:     { color: "#4ade80", bg: "#16a34a22" },
      REJECTED: { color: "#f87171", bg: "#7f1d1d22" },
      OVERDUE:  { color: "#f87171", bg: "#7f1d1d22" },
    };
    return map[status] || { color: "#94a3b8", bg: "#33415522" };
  };

  const pendingLoans = loans.filter((l) => l.status === "PENDING");
  const activeLoans  = loans.filter((l) => l.status === "ACTIVE");
  const pendingUsers = users.filter((u) => u.account_status === "pending");

  // ✅ Overview stats exclude REJECTED loans
  const nonRejectedLoans = loans.filter((l) => l.status !== "REJECTED");
  const totalDisbursed   = loans
    .filter((l) => l.status === "ACTIVE" || l.status === "PAID")
    .reduce((sum, l) => sum + parseFloat(l.principal || 0), 0);

  const navItems = [
    { label: "Overview",     badge: null },
    { label: "Applications", badge: pendingLoans.length || null },
    { label: "All Loans",    badge: null },
    { label: "Users",        badge: pendingUsers.length || null },
    { label: "Settings",     badge: null },
    { label: "Audit Logs",   badge: null },
  ];

  const handleNavClick = (label) => {
    setActivePage(label);
    setMobileMenuOpen(false);
  };

  return (
    <div style={s.layout}>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-el { transform: translateX(${mobileMenuOpen ? "0" : "-100%"}); z-index: 1001; box-shadow: 5px 0 15px rgba(0,0,0,0.5); }
          .main-el { margin-left: 0 !important; padding: 1rem !important; width: 100%; box-sizing: border-box; }
          .mobile-nav-toggle { display: flex !important; }
          .header-el { flex-direction: column; align-items: flex-start !important; gap: 0.75rem; }
          .admin-tag-el { align-self: flex-start; }
        }
      `}</style>

      {/* Mobile Top Navbar */}
      <div style={s.mobileTopBar} className="mobile-nav-toggle">
        <div style={s.logo}>Fynlo</div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={s.menuBtn}>
          {mobileMenuOpen ? "✕ Close" : "☰ Menu"}
        </button>
      </div>

      {/* Sidebar */}
      <div style={s.sidebar} className="sidebar-el">
        <div style={{ ...s.logo, display: "block" }}>Fynlo</div>
        <div style={s.adminBadge}>Admin Panel</div>
        <nav style={s.nav}>
          {navItems.map(({ label, badge }) => (
            <div key={label} onClick={() => handleNavClick(label)}
              style={{ ...s.navItem, background: activePage === label ? "#e53e3e" : "transparent", color: activePage === label ? "#fff" : "#94a3b8" }}>
              {label}
              {badge ? <span style={s.badge}>{badge}</span> : null}
            </div>
          ))}
        </nav>
        <div style={s.logoutBtn} onClick={onLogout}>Logout</div>
      </div>

      {mobileMenuOpen && <div style={s.sidebarOverlay} onClick={() => setMobileMenuOpen(false)} />}

      {/* Main */}
      <div style={s.main} className="main-el">
        <div style={s.header} className="header-el">
          <div>
            <h1 style={s.headerTitle}>{activePage}</h1>
            <p style={s.headerSub}>{userEmail || "Fynlo Administration"}</p>
          </div>
          <div style={s.adminTag} className="admin-tag-el">Administrator</div>
        </div>

        {toast && (
          <div style={{ ...s.toast, background: toast.type === "error" ? "#7f1d1d" : "#14532d", borderColor: toast.type === "error" ? "#e53e3e" : "#16a34a" }}>
            {toast.msg}
          </div>
        )}

        {selectedLoan && (
          <FileReviewModal
            loan={selectedLoan}
            users={users}
            onClose={() => setSelectedLoan(null)}
            onApprove={approveLoan}
            onReject={rejectLoan}
            onDelete={deleteLoan}
            onDisburse={disburseLoan}
          />
        )}

        {loading && <p style={{ color: "#64748b", textAlign: "center", marginTop: "3rem" }}>Loading…</p>}

        {/* ─── Overview ─── */}
        {!loading && activePage === "Overview" && (
          <>
            {/* ✅ Stats cards exclude REJECTED loans */}
            <div style={s.cards}>
              {[
                { label: "Total Loans",      value: nonRejectedLoans.length,           color: "#fff"     },
                { label: "Pending Approval", value: pendingLoans.length,               color: "#f6ad55"  },
                { label: "Active Loans",     value: activeLoans.length,                color: "#60a5fa"  },
                { label: "Total Disbursed",  value: `$${totalDisbursed.toLocaleString()}`, color: "#4ade80" },
              ].map((c) => (
                <div key={c.label} style={s.card}>
                  <p style={s.cardLabel}>{c.label}</p>
                  <p style={{ ...s.cardValue, color: c.color }}>{c.value}</p>
                </div>
              ))}
            </div>

            <div style={s.tableBox}>
              <div style={s.tableHeader}>
                <h3 style={s.sectionTitle}>Pending Applications</h3>
                <button style={s.viewAllBtn} onClick={() => setActivePage("Applications")}>View All →</button>
              </div>
              {pendingLoans.length === 0 ? <p style={s.empty}>No pending applications.</p> : (
                <div style={s.tableWrapper}>
                  <table style={s.table}>
                    <thead>
                      <tr>{["Loan ID", "Applicant", "Amount", "Applied", "Action"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {pendingLoans.slice(0, 5).map((loan) => {
                        const profile = users.find((u) => u.user_id === loan.user_id) || {};
                        return (
                          <tr key={loan.id} style={s.tr}>
                            <td style={s.td}>#{loan.id.slice(0, 8).toUpperCase()}</td>
                            <td style={s.td}>{loan.full_name || profile.full_name || "Unknown"}</td>
                            <td style={s.td}>${parseFloat(loan.principal).toLocaleString()}</td>
                            <td style={s.td}>{new Date(loan.created_at).toLocaleDateString("en-GB")}</td>
                            <td style={s.td}>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button style={s.reviewBtn} onClick={() => setSelectedLoan(loan)}>Review</button>
                                <button style={{ ...s.reviewBtn, background: "#1e293b22", color: "#94a3b8" }} onClick={() => triggerRiskAssessment(loan)}>Risk Score</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── Applications ─── */}
        {!loading && activePage === "Applications" && (
          <div style={s.tableBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: "1.25rem" }}>All Applications ({loans.length})</h3>
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>{["Loan ID", "Applicant", "Amount", "Term", "Status", "Applied", "Action"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const profile = users.find((u) => u.user_id === loan.user_id) || {};
                    const st = getStatusStyle(loan.status);
                    return (
                      <tr key={loan.id} style={s.tr}>
                        <td style={s.td}>#{loan.id.slice(0, 8).toUpperCase()}</td>
                        <td style={s.td}>{loan.full_name || profile.full_name || "—"}</td>
                        <td style={s.td}>${parseFloat(loan.principal).toLocaleString()}</td>
                        <td style={s.td}>{loan.term_months}mo</td>
                        <td style={s.td}><span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", color: st.color, background: st.bg }}>{loan.status}</span></td>
                        <td style={s.td}>{new Date(loan.created_at).toLocaleDateString("en-GB")}</td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button style={s.reviewBtn} onClick={() => setSelectedLoan(loan)}>{loan.status === "PENDING" ? "Review" : "View"}</button>
                            {loan.status === "PENDING" && (
                              <button style={{ ...s.reviewBtn, background: "#1e293b22", color: "#94a3b8" }} onClick={() => triggerRiskAssessment(loan)}>Risk</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── All Loans ─── */}
        {!loading && activePage === "All Loans" && (
          <div style={s.tableBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: "1.25rem" }}>Active & Paid Loans</h3>
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>{["Loan ID", "Applicant", "Principal", "Remaining", "Rate", "Due Date", "Disbursed", "Status", "Action"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loans.filter((l) => l.status === "ACTIVE" || l.status === "PAID").map((loan) => {
                    const profile = users.find((u) => u.user_id === loan.user_id) || {};
                    const st = getStatusStyle(loan.status);
                    return (
                      <tr key={loan.id} style={s.tr}>
                        <td style={s.td}>#{loan.id.slice(0, 8).toUpperCase()}</td>
                        <td style={s.td}>{loan.full_name || profile.full_name || "—"}</td>
                        <td style={s.td}>${parseFloat(loan.principal).toLocaleString()}</td>
                        <td style={s.td}>${parseFloat(loan.remaining_balance || 0).toLocaleString()}</td>
                        <td style={s.td}>{(parseFloat(loan.interest_rate || 0) * 100).toFixed(1)}%</td>
                        <td style={s.td}>{loan.due_date || "—"}</td>
                        <td style={s.td}>
                          <span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700",
                            color: loan.client_confirmed ? "#4ade80" : loan.disbursement_status === "sent" ? "#f6ad55" : "#64748b",
                            background: loan.client_confirmed ? "#16a34a22" : loan.disbursement_status === "sent" ? "#d9770622" : "#33415522" }}>
                            {loan.client_confirmed ? "Confirmed" : loan.disbursement_status}
                          </span>
                        </td>
                        <td style={s.td}><span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", color: st.color, background: st.bg }}>{loan.status}</span></td>
                        <td style={s.td}>
                          {loan.status === "ACTIVE" && loan.disbursement_status === "pending" && (
                            <button style={{ ...s.reviewBtn, background: "#16a34a22", color: "#4ade80" }} onClick={() => setSelectedLoan(loan)}>Send Money</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Users ─── */}
        {!loading && activePage === "Users" && (
          <div style={s.tableBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: "1.25rem" }}>All Users ({users.length})</h3>
            {pendingUsers.length > 0 && (
              <div style={{ background: "#d9770622", border: "1px solid #d9770644", borderRadius: "8px", padding: "0.75rem 1rem", color: "#f6ad55", fontSize: "0.875rem", marginBottom: "1rem" }}>
                {pendingUsers.length} user(s) waiting for approval
              </div>
            )}
            <div style={s.tableWrapper}>
              <table style={s.table}>
                <thead>
                  <tr>{["Name", "Phone", "Role", "Trust Score", "Status", "Actions"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} style={s.tr}>
                      <td style={s.td}>{u.full_name || "—"}</td>
                      <td style={s.td}>{u.phone || "—"}</td>
                      <td style={s.td}>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", color: u.role === "admin" ? "#e53e3e" : "#60a5fa", background: u.role === "admin" ? "#e53e3e22" : "#2563eb22" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={s.td}>{u.trust_score ?? "—"}</td>
                      <td style={s.td}>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700",
                          color: u.account_status === "active" ? "#4ade80" : u.account_status === "pending" ? "#f6ad55" : "#f87171",
                          background: u.account_status === "active" ? "#16a34a22" : u.account_status === "pending" ? "#d9770622" : "#7f1d1d22" }}>
                          {u.account_status || "unknown"}
                        </span>
                      </td>
                      <td style={s.td}>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", minWidth: "180px" }}>
                          {u.account_status !== "active" && <button style={s.reviewBtn} onClick={() => updateUserStatus(u.user_id, "active")}>Activate</button>}
                          {u.account_status === "active" && u.role !== "admin" && <button style={{ ...s.reviewBtn, background: "#7f1d1d22", color: "#f87171" }} onClick={() => updateUserStatus(u.user_id, "suspended")}>Suspend</button>}
                          {u.account_status === "suspended" && <button style={s.reviewBtn} onClick={() => updateUserStatus(u.user_id, "active")}>Reactivate</button>}
                          {u.role !== "admin" && <button style={{ ...s.reviewBtn, background: "#7f1d1d44", color: "#f87171" }} onClick={() => deleteUser(u.user_id)}>Delete</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Settings ─── */}
        {!loading && activePage === "Settings" && (
          <div style={s.tableBox}>
            <h3 style={{ ...s.sectionTitle, marginBottom: "1.5rem" }}>Global Settings</h3>
            <div style={{ display: "grid", gap: "1.25rem", maxWidth: "100%", width: "420px" }}>
              {[
                { key: "default_interest_rate", label: "Default Interest Rate (0.05 = 5%)", step: "0.01" },
                { key: "late_fee_amount",        label: "Late Fee Amount ($)",               step: "0.01" },
                { key: "grace_period_days",      label: "Grace Period (days)",               step: "1"    },
              ].map(({ key, label, step }) => (
                <label key={key} style={s.fieldWrap}>
                  <span style={s.label}>{label}</span>
                  <input style={s.input} type="number" step={step} value={settings[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} />
                </label>
              ))}
              <button style={{ ...s.reviewBtn, background: "#16a34a", color: "#fff", padding: "0.65rem 1.5rem", alignSelf: "flex-start" }}
                onClick={handleSettingsSave} disabled={settingsLoading}>
                {settingsLoading ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Audit Logs ─── */}
        {!loading && activePage === "Audit Logs" && <AuditLogs />}
      </div>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setLogs(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={s.tableBox}>
      <h3 style={s.sectionTitle}>Audit Logs</h3>
      {loading ? <p style={s.empty}>Loading…</p> : logs.length === 0 ? <p style={s.empty}>No audit logs yet.</p> : (
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead><tr>{["Action", "Table", "Date"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={s.tr}>
                  <td style={s.td}>{log.action}</td>
                  <td style={s.td}>{log.target_table || "—"}</td>
                  <td style={s.td}>{new Date(log.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Modal styles ──────────────────────────────────────────────────────────────
const m = {
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "0.5rem" },
  modal:      { background: "#1e293b", border: "1px solid #334155", borderRadius: "14px", width: "100%", maxWidth: "650px", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" },
  header:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid #334155" },
  title:      { margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#fff" },
  sub:        { margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" },
  closeBtn:   { background: "none", border: "none", color: "#64748b", fontSize: "1.1rem", cursor: "pointer", padding: "0.25rem", lineHeight: 1 },
  scrollBody: { flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" },
  section:    { marginBottom: "1.25rem" },
  sectionLabel: { fontSize: "0.7rem", fontWeight: "700", color: "#e53e3e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" },
  grid2:      { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" },
  infoItem:   { background: "#0f172a", borderRadius: "8px", padding: "0.65rem 0.875rem" },
  infoLabel:  { margin: "0 0 0.2rem", fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  infoValue:  { margin: 0, fontSize: "0.9rem", color: "#e2e8f0", fontWeight: "600", wordBreak: "break-word" },
  noDocsBox:  { background: "#0f172a", borderRadius: "8px", padding: "1.5rem", textAlign: "center" },
  docsGrid:   { display: "flex", flexDirection: "column", gap: "0.5rem" },
  docCard:    { display: "flex", alignItems: "center", gap: "0.875rem", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "0.75rem 1rem", color: "#60a5fa", textDecoration: "none" },
  docIcon:    { fontSize: "1.25rem", flexShrink: 0 },
  docLabel:   { margin: 0, fontSize: "0.875rem", fontWeight: "600", color: "#e2e8f0" },
  docAction:  { margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#60a5fa" },
  actions:    { display: "flex", gap: "0.5rem", padding: "1rem 1.25rem", borderTop: "1px solid #334155", flexWrap: "wrap" },
  btn:        { flex: "1 1 130px", border: "none", borderRadius: "8px", padding: "0.65rem 1rem", fontSize: "0.9rem", fontWeight: "700", cursor: "pointer" },
};

// ─── Dashboard styles ──────────────────────────────────────────────────────────
const s = {
  layout:        { display: "flex", minHeight: "100vh", background: "#0f172a", color: "#fff", fontFamily: "'Inter', 'Segoe UI', sans-serif", flexDirection: "column" },
  mobileTopBar:  { display: "none", width: "100%", height: "60px", background: "#1a1a2e", padding: "0 1rem", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 1002, borderBottom: "1px solid #334155", boxSizing: "border-box" },
  menuBtn:       { background: "#334155", border: "none", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600" },
  sidebar:       { width: "200px", background: "#1a1a2e", display: "flex", flexDirection: "column", padding: "1.5rem 1rem", position: "fixed", top: 0, left: 0, bottom: 0, transition: "transform 0.25s ease-in-out", boxSizing: "border-box" },
  sidebarOverlay:{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 },
  logo:          { fontSize: "1.4rem", fontWeight: "700", color: "#fff", marginBottom: "0.5rem", letterSpacing: "1px" },
  adminBadge:    { background: "#e53e3e22", color: "#e53e3e", fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "4px", marginBottom: "1.5rem", textAlign: "center", border: "1px solid #e53e3e44" },
  nav:           { display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 },
  navItem:       { padding: "0.65rem 1rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", borderRadius: "6px", display: "flex", alignItems: "center", transition: "all 0.2s" },
  badge:         { marginLeft: "auto", background: "#e53e3e", color: "#fff", borderRadius: "999px", fontSize: "0.65rem", padding: "0.1rem 0.45rem", fontWeight: "700" },
  logoutBtn:     { padding: "0.65rem 1rem", cursor: "pointer", color: "#64748b", fontSize: "0.875rem", borderTop: "1px solid #334155", marginTop: "1rem" },
  main:          { marginLeft: "200px", padding: "2rem", flex: 1, display: "flex", flexDirection: "column" },
  header:        { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  headerTitle:   { fontSize: "1.5rem", fontWeight: "700", margin: 0 },
  headerSub:     { color: "#64748b", fontSize: "0.85rem", margin: "0.2rem 0 0" },
  adminTag:      { background: "#e53e3e22", color: "#e53e3e", padding: "0.35rem 0.9rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: "600", border: "1px solid #e53e3e44" },
  toast:         { position: "fixed", top: "1rem", right: "1rem", left: "1rem", maxWidth: "400px", marginLeft: "auto", padding: "0.75rem 1.25rem", borderRadius: "8px", border: "1px solid", fontSize: "0.875rem", fontWeight: "600", zIndex: 3000, color: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" },
  cards:         { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" },
  card:          { background: "#1e293b", borderRadius: "10px", padding: "1.25rem" },
  cardLabel:     { color: "#64748b", fontSize: "0.8rem", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" },
  cardValue:     { fontSize: "1.5rem", fontWeight: "700", margin: 0 },
  tableBox:      { background: "#1e293b", borderRadius: "10px", padding: "1.25rem 1rem", marginBottom: "1rem" },
  tableHeader:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "0.5rem" },
  sectionTitle:  { fontSize: "0.9rem", fontWeight: "600", color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 },
  viewAllBtn:    { background: "transparent", border: "1px solid #334155", color: "#94a3b8", cursor: "pointer", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.8rem", flexShrink: 0 },
  tableWrapper:  { width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table:         { width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "550px" },
  th:            { textAlign: "left", padding: "0.75rem 1rem", color: "#64748b", fontWeight: "600", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #334155" },
  tr:            { borderBottom: "1px solid #33415533" },
  td:            { padding: "0.8rem 1rem", color: "#e2e8f0", verticalAlign: "middle" },
  reviewBtn:     { background: "#2563eb22", color: "#60a5fa", border: "1px solid #2563eb44", borderRadius: "6px", padding: "0.35rem 0.8rem", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" },
  empty:         { color: "#64748b", textAlign: "center", padding: "2rem 0" },
  fieldWrap:     { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label:         { fontSize: "0.8rem", color: "#94a3b8" },
  input:         { background: "#0f172a", border: "1px solid #334155", color: "#fff", borderRadius: "6px", padding: "0.6rem 0.875rem", fontSize: "0.9rem", width: "100%", boxSizing: "border-box" },
};