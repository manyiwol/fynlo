import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import AdminDashboard from "./pages/AdminDashboard";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SuperAdmin from "./pages/SuperAdmin";
import { supabase } from "./supabaseClient";

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchRole = async (userId) => {
    setRoleLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) console.error("fetchRole error:", error);
    setRole(data?.role || "user");
    setRoleLoading(false);
  };

  useEffect(() => {
    let initialLoadDone = false; // ✅ prevents double fetch from onAuthStateChange

    const timeout = setTimeout(() => {
      setLoading(false);
      setRoleLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id).finally(() => {
          setLoading(false);
          initialLoadDone = true; // ✅ mark done after getSession completes
          clearTimeout(timeout);
        });
      } else {
        setLoading(false);
        setRoleLoading(false);
        initialLoadDone = true;
        clearTimeout(timeout);
      }
    }).catch((err) => {
      console.error("getSession error:", err);
      setSession(null);
      setLoading(false);
      setRoleLoading(false);
      initialLoadDone = true;
      clearTimeout(timeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // ✅ skip if getSession hasn't finished yet — avoids race condition
      if (!initialLoadDone) return;
      setSession(session);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      return;
    }

    setSession(null);
    setRole(null);
    setLoading(false);
    setRoleLoading(false);
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  if (loading || roleLoading) return (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingCard}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>F</div>
          <span style={styles.logoText}>Fynlo</span>
        </div>
        <p style={styles.tagline}>Smart Loan Management</p>
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner} />
        </div>
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );

  const defaultPath =
    role === "superadmin" ? "/superadmin"
    : role === "admin"    ? "/admin"
    : "/dashboard";

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to={defaultPath} />} />
        <Route path="/dashboard" element={
          !session ? <Navigate to="/login" />
          : role === "superadmin" ? <Navigate to="/superadmin" />
          : role === "admin"      ? <Navigate to="/admin" />
          : <Dashboard />
        } />
        <Route path="/admin" element={
          !session                                    ? <Navigate to="/login" />
          : role !== "admin" && role !== "superadmin" ? <Navigate to="/dashboard" />
          : <AdminDashboard userEmail={session.user.email} onLogout={handleLogout} />
        } />
        <Route path="/superadmin" element={
          !session                ? <Navigate to="/login" />
          : role !== "superadmin" ? <Navigate to={defaultPath} />
          : <SuperAdmin onLogout={handleLogout} />
        } />
        <Route path="*" element={<Navigate to={session ? defaultPath : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  loadingScreen: {
    background: "linear-gradient(135deg, #0f172a 0%, #1a1a2e 100%)",
    minHeight: "100vh", display: "flex",
    alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  loadingCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  logoRow: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoIcon: {
    width: "48px", height: "48px", background: "#e53e3e",
    borderRadius: "12px", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "1.5rem", fontWeight: "800", color: "#fff",
  },
  logoText: { fontSize: "2rem", fontWeight: "800", color: "#fff", letterSpacing: "2px" },
  tagline: { color: "#64748b", fontSize: "0.875rem", margin: 0 },
  spinnerWrap: { marginTop: "1.5rem" },
  spinner: {
    width: "36px", height: "36px",
    border: "3px solid #1e293b", borderTop: "3px solid #e53e3e",
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  loadingText: { color: "#475569", fontSize: "0.8rem", margin: 0, animation: "pulse 1.5s ease-in-out infinite" },
};

export default App;