import { useEffect, useState } from "react";

import { supabase } from "../supabaseClient";

export default function Settings() {
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
  });
  const [email, setEmail] = useState("");
  const [passwords, setPasswords] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user.email);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
        });
      }
    };

    fetchProfile();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (error) setProfileError(error.message);
    else setProfileSuccess("Profile updated successfully.");

    setProfileLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordError("Passwords do not match.");
      setPasswordLoading(false);
      return;
    }

    if (passwords.new_password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      setPasswordLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: passwords.new_password,
    });

    if (error) setPasswordError(error.message);
    else {
      setPasswordSuccess("Password changed successfully.");
      setPasswords({ new_password: "", confirm_password: "" });
    }

    setPasswordLoading(false);
  };

  return (
    <div style={styles.container}>
      <p style={styles.sub}>Manage your account details and preferences.</p>

      <div style={styles.layout}>
        {/* Profile Settings */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Personal Information</p>
          <p style={styles.sectionSub}>Update your name and contact details.</p>

          {profileSuccess && <div style={styles.successBox}>{profileSuccess}</div>}
          {profileError && <div style={styles.errorBox}>{profileError}</div>}

          <form onSubmit={handleProfileSave} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                style={{ ...styles.input, opacity: 0.5, cursor: "not-allowed" }}
                type="email"
                value={email}
                disabled
              />
              <p style={styles.hint}>Email cannot be changed.</p>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="Your full name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone Number</label>
              <input
                style={styles.input}
                type="tel"
                placeholder="e.g. +263 77 123 4567"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <button style={styles.button} type="submit" disabled={profileLoading}>
              {profileLoading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Password Settings */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Change Password</p>
          <p style={styles.sectionSub}>Choose a strong password to keep your account secure.</p>

          {passwordSuccess && <div style={styles.successBox}>{passwordSuccess}</div>}
          {passwordError && <div style={styles.errorBox}>{passwordError}</div>}

          <form onSubmit={handlePasswordChange} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>New Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Enter new password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                style={styles.input}
                type="password"
                placeholder="Confirm new password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                required
              />
            </div>
            <button style={styles.button} type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Change Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Account Info */}
      <div style={styles.infoBox}>
        <p style={styles.sectionTitle}>Account Information</p>
        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Account Type</p>
            <p style={styles.infoValue}>Client</p>
          </div>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Account Status</p>
            <p style={{ ...styles.infoValue, color: "#4ade80" }}>Active</p>
          </div>
          <div style={styles.infoItem}>
            <p style={styles.infoLabel}>Platform</p>
            <p style={styles.infoValue}>Fynlo Loan Management</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "1rem", width: "100%", boxSizing: "border-box" },
  title: { fontSize: "1.5rem", fontWeight: "700", margin: "0 0 0.5rem", color: "#e2e8f0" },
  sub: { color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem", marginTop: 0 },
  
  // Responsive split layout: stacks vertically on mobile, auto-splits to 2 columns on desktops
  layout: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" },
  
  section: { background: "#1e293b", borderRadius: "10px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", boxSizing: "border-box" },
  sectionTitle: { color: "#e2e8f0", fontWeight: "600", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #334155", paddingBottom: "0.5rem", margin: 0 },
  sectionSub: { color: "#64748b", fontSize: "0.85rem", margin: 0, lineHeight: "1.4" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  field: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { color: "#94a3b8", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "0.75rem 1rem", color: "#fff", fontSize: "0.95rem", outline: "none", width: "100%", boxSizing: "border-box" },
  hint: { color: "#475569", fontSize: "0.75rem", margin: 0 },
  button: { background: "#e53e3e", color: "#fff", border: "none", borderRadius: "8px", padding: "0.85rem", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", width: "100%" },
  successBox: { background: "#14532d22", color: "#4ade80", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem", border: "1px solid #14532d" },
  errorBox: { background: "#7f1d1d22", color: "#f87171", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.875rem", border: "1px solid #7f1d1d" },
  
  infoBox: { background: "#1e293b", borderRadius: "10px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", boxSizing: "border-box" },
  
  // Responsive grid layout: auto-arranges metadata fields smoothly based on screen width thresholds
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" },
  infoItem: { background: "#0f172a", borderRadius: "8px", padding: "1rem", boxSizing: "border-box" },
  infoLabel: { color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.4rem" },
  infoValue: { color: "#e2e8f0", fontWeight: "600", fontSize: "0.95rem", margin: 0 },
};