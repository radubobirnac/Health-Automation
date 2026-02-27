import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";
const initialState = {
  username: "",
  password: ""
};

export default function Login() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", message: "Signing you in..." });

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
      localStorage.setItem("hr_token", payload.token);
      localStorage.setItem(
        "hr_auth",
        JSON.stringify({ username: payload.username, role: payload.role })
      );
      const verify = await authedFetch("/auth/me");
      if (!verify.ok) {
        localStorage.removeItem("hr_token");
        localStorage.removeItem("hr_auth");
        throw new Error("Session verification failed.");
      }
      setStatus({ state: "success", message: "Signed in successfully." });
      navigate("/app");
    } catch (error) {
      let message = "Login failed. Please try again.";
      if ((error?.message || "").toLowerCase().includes("invalid")) {
        message = "Invalid username or password.";
      }
      setStatus({ state: "error", message });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Client Portal</span>
          <h1>Sign in to your sheets</h1>
          <p className="lead">Access your live shift sheets and calendar view.</p>
        </div>
      </section>

      <section className="section">
        <div className="container auth-grid">
          <form className="auth-card" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                type="text"
                name="username"
                placeholder="client-username"
                value={formState.username}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="••••••••"
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
              Accounts are created by an admin. <Link to="/contact">Contact us</Link>
            </p>
          </form>
          <div className="auth-aside">
            <h2>What you get</h2>
            <ul className="bullet-list">
              <li>Live shift sheet updates</li>
              <li>Calendar-style monitoring</li>
              <li>Real-time validation</li>
              <li>Logs sheet for activity tracking</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
