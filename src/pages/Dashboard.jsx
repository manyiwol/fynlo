import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useCallback, useEffect, useRef, useState } from "react";

import AdminDashboard from "./AdminDashboard";
import Analytics from "./Analytics";
import Apply from "./Apply";
import MyLoans from "./MyLoans";
import Notifications from "./Notifications";
import Payments from "./Payments";
import Settings from "./Settings";
import { supabase } from "../supabaseClient";

const paymentData = [
  { month: "Jan", amount: 400 }, { month: "Feb", amount: 300 },
  { month: "Mar", amount: 500 }, { month: "Apr", amount: 280 }, { month: "May", amount: 590 },
];
const balanceData = [
  { month: "Jan", balance: 12500 }, { month: "Feb", balance: 11800 },
  { month: "Mar", balance: 11100 }, { month: "Apr", balance: 10200 }, { month: "May", balance: 8200 },
];

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

const NAV_ICONS = {
  Dashboard: "⬡", "My Loans": "◈", Payments: "◎", Apply: "✦",
  Analytics: "◉", Notifications: "◐", Settings: "⚙", Admin: "⬟",
};

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [activePage, setActivePage] = useState("Dashboard");
  const [loans, setLoans] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({
    totalLoans: 0, totalBorrowed: "$0", remainingBalance: "$0", nextPaymentDue: "--",
  });
  const canvasRef = useRef(null);

  // 3D particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.3) * 0.3,
      vy: (Math.random() - 0.3) * 0.3,
      r: Math.random() * 2 + 1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${0.1 * p.z})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.05 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const fetchLoans = useCallback(async (userId) => {
    const { data, error } = await supabase.from("loans").select("*").eq("user_id", userId);
    if (error) return;
    const now = Date.now();
    const filtered = data.filter((loan) => {
      if (loan.status !== "REJECTED") return true;
      const rejectedAt = loan.rejected_at ? new Date(loan.rejected_at).getTime() : 0;
      return now - rejectedAt < THREE_WEEKS_MS;
    });
    setLoans(filtered);
    const active = filtered.filter((l) => l.status !== "REJECTED");
    const totalBorrowed = active.reduce((sum, l) => sum + parseFloat(l.principal || 0), 0);
    const remainingBalance = active.reduce((sum, l) => sum + parseFloat(l.remaining_balance || 0), 0);
    const nextDue = active.filter((l) => l.due_date).sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0]?.due_date;
    setStats({ totalLoans: active.length, totalBorrowed: `$${totalBorrowed.toLocaleString()}`, remainingBalance: `$${remainingBalance.toLocaleString()}`, nextPaymentDue: nextDue || "--" });
  }, []);

  const fetchUnreadCount = useCallback(async (userId) => {
    const { data } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("is_read", false);
    setUnreadCount(data?.length || 0);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchLoans(user.id);
        fetchUnreadCount(user.id);
        const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
        setUserRole(profile?.role || "user");
      }
    });
  }, [fetchLoans, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchUnreadCount(user.id), 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };
  const isAdmin = userRole === "admin" || userRole === "superadmin";
  const userNavItems = ["Dashboard", "My Loans", "Payments", "Apply", "Analytics", "Notifications", "Settings"];
  const adminNavItems = [...userNavItems, "Admin"];
  const navItems = isAdmin ? adminNavItems : userNavItems;

  const roleConfig = {
    superadmin: { label: "Super Admin", color: "#a78bfa", bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.3)" },
    admin: { label: "Admin", color: "#f87171", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" },
    user: { label: "User", color: "#60a5fa", bg: "rgba(37,99,235,0.15)", border: "rgba(37,99,235,0.3)" },
  }[userRole] || { label: "User", color: "#60a5fa", bg: "rgba(37,99,235,0.15)", border: "rgba(37,99,235,0.3)" };

  const navigate = (page) => { setActivePage(page); setSidebarOpen(false); };

  const renderPage = () => {
    if (activePage === "Admin" && !isAdmin) return (
      <div style={s.accessDenied}><h2 style={{ color: "#f87171", margin: "0 0 0.5rem" }}>Access Denied</h2><p style={{ color: "#64748b" }}>You do not have permission.</p></div>
    );
    switch (activePage) {
      case "My Loans": return <MyLoans />;
      case "Payments": return <Payments />;
      case "Analytics": return <Analytics />;
      case "Notifications": return <Notifications onRead={() => user && fetchUnreadCount(user.id)} />;
      case "Settings": return <Settings />;
      case "Admin": return <AdminDashboard userEmail={user?.email} onLogout={handleLogout} />;
      case "Apply": return <Apply onSuccess={() => { setActivePage("Dashboard"); supabase.auth.getUser().then(({ data: { user } }) => { if (user) fetchLoans(user.id); }); }} />;
      default: return (
        <>
          {/* Stats Cards */}
          <div style={s.statsGrid} className="stats-grid">
            {[
              { label: "Total Loans", value: stats.totalLoans, icon: "◈", color: "#60a5fa", gradient: "linear-gradient(135deg,rgba(37,99,235,0.2),rgba(37,99,235,0.05))" },
              { label: "Total Borrowed", value: stats.totalBorrowed, icon: "◎", color: "#a78bfa", gradient: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(124,58,237,0.05))" },
              { label: "Remaining Balance", value: stats.remainingBalance, icon: "◉", color: "#f87171", gradient: "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(239,68,68,0.05))" },
              { label: "Next Payment Due", value: stats.nextPaymentDue, icon: "⬡", color: "#fbbf24", gradient: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(251,191,36,0.05))" },
            ].map((card, i) => (
              <div key={card.label} style={{ ...s.statCard, background: card.gradient, animationDelay: `${i * 0.1}s` }} className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "1.5rem", color: card.color, filter: `drop-shadow(0 0 8px ${card.color}66)` }}>{card.icon}</span>
                  <span style={{ ...s.cardBadge, color: card.color, borderColor: `${card.color}44`, background: `${card.color}11` }}>Live</span>
                </div>
                <p style={{ ...s.cardValue, color: card.color }} className="card-value-text">{card.value}</p>
                <p style={s.cardLabel}>{card.label}</p>
                <div style={{ ...s.cardGlow, background: `radial-gradient(circle at bottom right, ${card.color}22, transparent 70%)` }} />
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={s.chartsRow} className="charts-row">
            <div style={s.chartCard}>
              <div style={s.chartHeader}>
                <span style={s.chartTitle}>Payment History</span>
                <span style={s.chartBadge}>Monthly</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={paymentData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fontFamily: "inherit" }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11, fontFamily: "inherit" }} width={35} />
                  <Tooltip contentStyle={{ background: "#0f1729", border: "1px solid #1e293b", color: "#e2e8f0", fontSize: 12, borderRadius: "8px" }} cursor={{ fill: "rgba(99,102,241,0.1)" }} />
                  <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={s.chartCard}>
              <div style={s.chartHeader}>
                <span style={s.chartTitle}>Balance Trend</span>
                <span style={s.chartBadge}>Declining</span>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={balanceData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a78bfa" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={45} />
                  <Tooltip contentStyle={{ background: "#0f1729", border: "1px solid #1e293b", color: "#e2e8f0", fontSize: 12, borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="balance" stroke="url(#lineGrad)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Loans Table */}
          <div style={s.tableCard}>
            <div style={s.tableCardHeader}>
              <span style={s.chartTitle}>My Active Loans</span>
              <button style={s.viewAllBtn} onClick={() => setActivePage("My Loans")}>View All →</button>
            </div>
            <div style={{ width: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ ...s.table, minWidth: "550px" }}>
                <thead>
                  <tr>{["Loan ID", "Principal", "Remaining", "Rate", "Due Date", "Status", "Progress"].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loans.filter(l => l.status !== "REJECTED").length === 0 ? (
                    <tr><td colSpan="7" style={{ ...s.td, textAlign: "center", color: "#475569", padding: "2rem" }}>No loans found. Click Apply to get started.</td></tr>
                  ) : loans.filter(l => l.status !== "REJECTED").map((loan) => {
                    const principal = parseFloat(loan.principal) || 0;
                    const remaining = parseFloat(loan.remaining_balance) || 0;
                    const progress = principal > 0 ? Math.round(((principal - remaining) / principal) * 100) : 0;
                    const statusMap = { ACTIVE: { c: "#60a5fa", bg: "rgba(37,99,235,0.15)" }, PENDING: { c: "#fbbf24", bg: "rgba(251,191,36,0.15)" }, PAID: { c: "#4ade80", bg: "rgba(22,163,74,0.15)" }, REJECTED: { c: "#f87171", bg: "rgba(239,68,68,0.15)" }, OVERDUE: { c: "#f87171", bg: "rgba(239,68,68,0.15)" } }[loan.status] || { c: "#94a3b8", bg: "rgba(51,65,85,0.3)" };
                    return (
                      <tr key={loan.id} style={s.tr}>
                        <td style={s.td}><span style={s.loanId}>#{loan.id.slice(0, 8)}</span></td>
                        <td style={s.td}>${principal.toLocaleString()}</td>
                        <td style={s.td}>${remaining.toLocaleString()}</td>
                        <td style={s.td}>{(parseFloat(loan.interest_rate || 0) * 100).toFixed(1)}%</td>
                        <td style={s.td}>{loan.due_date || "--"}</td>
                        <td style={s.td}><span style={{ ...s.statusBadge, color: statusMap.c, background: statusMap.bg }}>{loan.status}</span></td>
                        <td style={s.td}>
                          <div style={s.progressWrap}>
                            <div style={s.progressBg}><div style={{ ...s.progressFill, width: `${progress}%` }} /></div>
                            <span style={s.progressPct}>{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div style={s.layout}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Space Grotesk', sans-serif; }
        .stat-card { animation: slideUp 0.5s ease both; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .nav-item:hover { background: rgba(99,102,241,0.15) !important; color: #e2e8f0 !important; transform: translateX(4px); }
        .nav-item { transition: all 0.2s ease !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 2px; }
        .hamburger:hover { background: rgba(99,102,241,0.2) !important; }
        @media (max-width: 991px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .sidebar-el { transform: translateX(-100%); transition: transform 0.3s ease-in-out !important; }
          .sidebar-el.open { transform: translateX(0) !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .hamburger-btn { display: flex !important; }
          .overlay-bg { display: block !important; }
          .topbar-el { padding: 1rem !important; }
          .topbar-actions { gap: 0.5rem !important; }
          .content-el { padding: 1rem !important; }
          .account-badge-text { display: none !important; }
        }
        @media (max-width: 520px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .charts-row { grid-template-columns: 1fr !important; }
          .card-value-text { font-size: 1.4rem !important; }
        }
      `}</style>

      {/* Canvas Background */}
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={s.overlay} className="overlay-bg" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar-el${sidebarOpen ? " open" : ""}`} style={s.sidebar}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoIcon}>F</div>
          <div>
            <div style={s.logoText}>FYNLO</div>
            <div style={s.logoSub}>Finance Platform</div>
          </div>
        </div>

        {/* Role Badge */}
        <div style={{ ...s.roleBadge, color: roleConfig.color, background: roleConfig.bg, borderColor: roleConfig.border }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: roleConfig.color, display: "inline-block", boxShadow: `0 0 6px ${roleConfig.color}`, flexShrink: 0 }} />
          {roleConfig.label}
        </div>

        {/* Nav */}
        <nav style={s.nav}>
          {navItems.map((item) => (
            <div key={item} className="nav-item" onClick={() => navigate(item)} style={{
              ...s.navItem,
              background: activePage === item ? "rgba(99,102,241,0.2)" : "transparent",
              color: activePage === item ? "#e2e8f0" : "#64748b",
              borderLeft: activePage === item ? "2px solid #6366f1" : "2px solid transparent",
            }}>
              <span style={{ ...s.navIcon, color: activePage === item ? "#6366f1" : "#475569" }}>{NAV_ICONS[item]}</span>
              {item}
              {item === "Notifications" && unreadCount > 0 && (
                <span style={s.navBadge}>{unreadCount}</span>
              )}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <div style={s.sidebarFooter}>
          <div style={s.userAvatar}>{user?.email?.[0]?.toUpperCase() || "U"}</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={s.userEmail}>{user?.email}</div>
            <div style={s.userRole}>{roleConfig.label}</div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn} title="Logout">⏻</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={s.main}>
        {/* Top Bar */}
        <div style={s.topBar} className="topbar-el">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
            {/* Hamburger */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} style={s.hamburger}>
              <div style={{ ...s.hamLine, transform: sidebarOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
              <div style={{ ...s.hamLine, opacity: sidebarOpen ? 0 : 1 }} />
              <div style={{ ...s.hamLine, transform: sidebarOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
            </button>
            <div style={{ overflow: "hidden" }}>
              <h1 style={s.pageTitle}>{activePage}</h1>
              <p style={s.pageSub} className="user-welcome-sub">Hi, <span style={{ color: "#6366f1" }}>{user?.email?.split("@")[0]}</span></p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }} className="topbar-actions">
            <button style={s.bellBtn} onClick={() => navigate("Notifications")}>
              🔔
              {unreadCount > 0 && <span style={s.bellBadge}>{unreadCount}</span>}
            </button>
            <div style={{ ...s.accountBadge, background: roleConfig.bg, color: roleConfig.color, borderColor: roleConfig.border }}>
              <span className="account-badge-text">{roleConfig.label} </span>Account
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div style={s.content} className="content-el">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

const s = {
  layout: {
    display: "flex", minHeight: "100vh",
    background: "linear-gradient(135deg, #060b18 0%, #0a0f1e 50%, #060b18 100%)",
    color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif",
    position: "relative", overflow: "hidden",
  },
  canvas: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    zIndex: 1040, display: "none",
  },
  sidebar: {
    width: "240px", minHeight: "100vh",
    background: "rgba(8,13,26,0.95)",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(99,102,241,0.15)",
    display: "flex", flexDirection: "column",
    padding: "1.5rem 1rem",
    position: "fixed", top: 0, left: 0, bottom: 0,
    zIndex: 1050, overflowY: "auto",
    boxShadow: "4px 0 30px rgba(0,0,0,0.5)",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  logoIcon: {
    width: "40px", height: "40px",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    borderRadius: "10px", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "1.2rem", fontWeight: "800", color: "#fff",
    boxShadow: "0 4px 15px rgba(99,102,241,0.4)",
    flexShrink: 0,
  },
  logoText: { fontSize: "1rem", fontWeight: "800", color: "#fff", letterSpacing: "3px" },
  logoSub: { fontSize: "0.65rem", color: "#475569", letterSpacing: "1px", textTransform: "uppercase" },
  roleBadge: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.35rem 0.75rem", borderRadius: "6px",
    border: "1px solid", fontSize: "0.72rem", fontWeight: "600",
    marginBottom: "1.5rem", letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem" },
  navItem: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.65rem 0.875rem", borderRadius: "8px",
    cursor: "pointer", fontSize: "0.875rem", fontWeight: "500",
  },
  navIcon: { fontSize: "1rem", width: "18px", textAlign: "center", flexShrink: 0 },
  navBadge: {
    marginLeft: "auto", background: "#ef4444",
    color: "#fff", borderRadius: "999px",
    fontSize: "0.6rem", padding: "0.1rem 0.4rem",
    fontWeight: "700", minWidth: "16px", textAlign: "center",
  },
  sidebarFooter: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    padding: "0.875rem", background: "rgba(255,255,255,0.03)",
    borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)",
    marginTop: "1rem",
  },
  userAvatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: "linear-gradient(135deg, #6366f1, #a78bfa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.875rem", fontWeight: "700", color: "#fff", flexShrink: 0,
  },
  userEmail: { fontSize: "0.75rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: "0.65rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" },
  logoutBtn: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#f87171", borderRadius: "6px", padding: "0.35rem 0.5rem",
    cursor: "pointer", fontSize: "0.8rem", flexShrink: 0,
  },
  main: {
    marginLeft: "240px", flex: 1, display: "flex",
    flexDirection: "column", minHeight: "100vh",
    position: "relative", zIndex: 1, width: "auto", boxSizing: "border-box"
  },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "1.25rem 2rem",
    background: "rgba(8,13,26,0.7)", backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    position: "sticky", top: 0, zIndex: 1030,
  },
  hamburger: {
    display: "none", flexDirection: "column", gap: "5px",
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px", padding: "0.5rem", cursor: "pointer", flexShrink: 0,
  },
  hamLine: {
    width: "18px", height: "2px",
    background: "#94a3b8", borderRadius: "1px",
    transition: "all 0.3s ease",
    display: "block",
  },
  pageTitle: { fontSize: "1.4rem", fontWeight: "700", margin: 0, color: "#f1f5f9" },
  pageSub: { fontSize: "0.8rem", color: "#475569", margin: "0.15rem 0 0" },
  bellBtn: {
    position: "relative", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
    padding: "0.5rem 0.65rem", cursor: "pointer", fontSize: "1rem",
  },
  bellBadge: {
    position: "absolute", top: "-4px", right: "-4px",
    background: "#ef4444", color: "#fff", borderRadius: "999px",
    fontSize: "0.55rem", fontWeight: "700", padding: "0.1rem 0.3rem",
    minWidth: "14px", textAlign: "center",
  },
  accountBadge: {
    padding: "0.4rem 0.875rem", borderRadius: "20px",
    fontSize: "0.75rem", fontWeight: "600", border: "1px solid", whiteSpace: "nowrap"
  },
  content: { padding: "1.5rem 2rem", flex: 1, width: "100%", boxSizing: "border-box" },
  statsGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1rem", marginBottom: "1.25rem", width: "100%", boxSizing: "border-box"
  },
  statCard: {
    position: "relative", borderRadius: "16px", padding: "1.25rem",
    border: "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(10px)", overflow: "hidden",
    background: "rgba(255,255,255,0.03)", width: "100%", boxSizing: "border-box"
  },
  cardBadge: {
    fontSize: "0.65rem", fontWeight: "600", padding: "0.2rem 0.5rem",
    borderRadius: "4px", border: "1px solid", textTransform: "uppercase", letterSpacing: "0.5px",
  },
  cardValue: { fontSize: "1.75rem", fontWeight: "800", margin: "0 0 0.25rem", letterSpacing: "-0.5px", wordBreak: "break-all" },
  cardLabel: { fontSize: "0.75rem", color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" },
  cardGlow: { position: "absolute", inset: 0, pointerEvents: "none" },
  chartsRow: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: "1rem", marginBottom: "1.25rem", width: "100%"
  },
  chartCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px", padding: "1.25rem", backdropFilter: "blur(10px)", width: "100%", boxSizing: "border-box"
  },
  chartHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  chartTitle: { fontSize: "0.8rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" },
  chartBadge: {
    fontSize: "0.65rem", padding: "0.2rem 0.5rem", borderRadius: "4px",
    background: "rgba(99,102,241,0.15)", color: "#6366f1",
    border: "1px solid rgba(99,102,241,0.3)", fontWeight: "600",
  },
  tableCard: {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "16px", padding: "1.25rem", backdropFilter: "blur(10px)", width: "100%", boxSizing: "border-box"
  },
  tableCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  viewAllBtn: {
    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
    color: "#6366f1", borderRadius: "6px", padding: "0.35rem 0.75rem",
    fontSize: "0.75rem", cursor: "pointer", fontWeight: "600",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" },
  th: {
    textAlign: "left", padding: "0.65rem 0.875rem",
    color: "#475569", fontWeight: "600", fontSize: "0.7rem",
    textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.15s" },
  td: { padding: "0.75rem 0.875rem", color: "#cbd5e1", verticalAlign: "middle" },
  loanId: { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: "#6366f1" },
  statusBadge: {
    padding: "0.2rem 0.6rem", borderRadius: "4px",
    fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px",
  },
  progressWrap: { display: "flex", alignItems: "center", gap: "0.5rem" },
  progressBg: {
    flex: 1, background: "rgba(255,255,255,0.07)",
    borderRadius: "999px", height: "5px", overflow: "hidden",
  },
  progressFill: {
    height: "100%", borderRadius: "999px",
    background: "linear-gradient(90deg, #6366f1, #a78bfa)",
    transition: "width 0.3s ease",
  },
  progressPct: { fontSize: "0.7rem", color: "#475569", width: "28px", textAlign: "right" },
  accessDenied: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px", padding: "3rem", textAlign: "center" },
};

// Inject responsive styles globally
if (typeof document !== "undefined" && !document.getElementById("fynlo-responsive")) {
  const styleEl = document.createElement("style");
  styleEl.id = "fynlo-responsive";
  document.head.appendChild(styleEl);
}