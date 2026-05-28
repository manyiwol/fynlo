import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const [showHero, setShowHero] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.toLowerCase().trim();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) { setError(error.message); setLoading(false); return; }

      if (data?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            full_name: fullName,
            role: "user",
            account_status: "pending",
          },
          { onConflict: "user_id" }
        );
        if (profileError) console.error("profile upsert error:", profileError);
      }

      setLoading(false);
      setIsSignUp(false);
      setFullName(""); setEmail(""); setPassword("");
      setError("");
      alert("Account created! Please wait for admin approval before logging in.");
      return;
    }

    // Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // ✅ Improved error message — catches unconfirmed email clearly
    if (error) {
      if (
        error.message.toLowerCase().includes("invalid login credentials") ||
        error.message.toLowerCase().includes("email not confirmed")
      ) {
        setError(
          "Invalid credentials or your email is not confirmed. " +
          "Check your inbox for a confirmation email, or contact your administrator."
        );
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("fetch profile error:", profileError);
      setError("Unable to fetch account details. Please contact support.");
      setLoading(false);
      return;
    }

    if (!profile) {
      const { error: createError } = await supabase.from("profiles").upsert(
        {
          user_id: data.user.id,
          role: "user",
          account_status: "active",
        },
        { onConflict: "user_id" }
      );

      if (createError) {
        console.error("create profile fallback error:", createError);
        setError("Unable to create user profile. Please contact support.");
        setLoading(false);
        return;
      }

      profile = { role: "user", account_status: "active" };
    }

    // ✅ Superadmin bypasses account_status checks
    if (profile.role === "superadmin") {
      navigate("/superadmin");
      setLoading(false);
      return;
    }

    // Block pending users
    if (profile.account_status === "pending") {
      await supabase.auth.signOut();
      setError("Your account is pending approval. Please wait for an admin to activate your account.");
      setLoading(false);
      return;
    }

    // Block suspended users
    if (profile.account_status === "suspended") {
      await supabase.auth.signOut();
      setError("Your account has been suspended. Please contact support.");
      setLoading(false);
      return;
    }

    if (profile.role === "admin") navigate("/admin");
    else navigate("/dashboard");

    setLoading(false);
  };

  if (showHero) {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "5rem", fontWeight: "900", color: "#fff", marginBottom: "1rem" }}>FYNLO</h1>
          <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "1.2rem" }}>Smart Loan Management Platform</p>
          <button style={styles.button} onClick={() => setShowHero(false)}>Get Started</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>Fynlo</h1>
        <h2 style={styles.title}>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
        <p style={styles.subtitle}>{isSignUp ? "Create your account below" : "Login to continue"}</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <input style={styles.input} type="text" placeholder="Full Name"
              value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          )}
          <input style={styles.input} type="email" placeholder="Email Address"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignUp ? "Already have an account?" : "New to Fynlo?"}
          <span style={styles.link} onClick={() => { setIsSignUp(!isSignUp); setError(""); }}>
            {isSignUp ? " Sign In" : " Create Account"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", padding: "20px" },
  card: { width: "100%", maxWidth: "430px", background: "#1e293b", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 25px 50px rgba(0,0,0,0.4)" },
  logo: { textAlign: "center", color: "#ffffff", marginBottom: "0.5rem", fontSize: "2rem" },
  title: { textAlign: "center", color: "#ffffff", marginBottom: "0.5rem" },
  subtitle: { textAlign: "center", color: "#94a3b8", marginBottom: "2rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { padding: "1rem", borderRadius: "12px", border: "1px solid #334155", background: "#0f172a", color: "#ffffff", fontSize: "1rem" },
  button: { padding: "1rem", borderRadius: "12px", border: "none", background: "#2563eb", color: "#ffffff", fontWeight: "700", cursor: "pointer", marginTop: "0.5rem" },
  error: { background: "#7f1d1d", color: "#fecaca", padding: "0.8rem", borderRadius: "10px", marginBottom: "1rem", textAlign: "center", fontSize: "0.9rem", lineHeight: "1.5" },
  toggle: { marginTop: "2rem", textAlign: "center", color: "#94a3b8" },
  link: { color: "#3b82f6", cursor: "pointer", fontWeight: "700" },
};