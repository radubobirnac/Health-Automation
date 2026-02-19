import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";

const initialState = {
  username: "",
  password: ""
};

export default function AdminLogin() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", message: "Signing in..." });

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formState.username,
          password: formState.password
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Login failed.");
      }
      if (payload?.role !== "admin") {
        throw new Error("Admin access required.");
      }
      localStorage.setItem("hr_token", payload.token);
      localStorage.setItem(
        "hr_auth",
        JSON.stringify({ username: payload.username, role: payload.role })
      );
      setStatus({ state: "success", message: "Signed in successfully." });
      navigate("/admin");
    } catch (error) {
      let message = "Login failed. Please try again.";
      if ((error?.message || "").toLowerCase().includes("admin")) {
        message = "Admin access required.";
      } else if ((error?.message || "").toLowerCase().includes("invalid")) {
        message = "Invalid username or password.";
      }
      setStatus({ state: "error", message });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Admin Portal</span>
          <h1>Admin sign in</h1>
          <p className="lead">Secure access to client credential tools.</p>
        </div>
      </section>

      <section className="section">
        <div className="container auth-grid">
          <form className="auth-card" onSubmit={handleSubmit}>
            <label>
              Admin Username
              <input
                type="text"
                name="username"
                placeholder="admin"
                value={formState.username}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Admin Password
              <input
                type="password"
                name="password"
                placeholder="Enter admin password"
                value={formState.password}
                onChange={handleChange}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={status.state === "sending"}>
              {status.state === "sending" ? "Signing in..." : "Sign in"}
            </button>
            {status.message && (
              <p className="form-note" aria-live="polite">
                {status.message}
              </p>
            )}
            <p className="form-note">
              Looking for the client portal? <Link to="/login">Go to client login</Link>
            </p>
          </form>
          <div className="auth-aside">
            <h2>Admin tools</h2>
            <ul className="bullet-list">
              <li>Create client credentials</li>
              <li>Generate secure passwords</li>
              <li>Copy credentials instantly</li>
              <li>Admin-only protected access</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
