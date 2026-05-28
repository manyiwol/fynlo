import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function SuperAdmin() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div
      style={{
        padding: "2rem",
        background: "#0f172a",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h1 style={{ color: "#e53e3e" }}>Super Admin Panel</h1>

      <p style={{ color: "#64748b" }}>
        This page is reserved for super administrators.
      </p>

      <button
        type="button"
        onClick={handleLogout}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}