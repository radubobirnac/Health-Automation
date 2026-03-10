import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";
import useScrollReveal from "../utils/useScrollReveal.js";
const initialState = {
  username: "",
  password: ""
};

const IconEye = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.2A10.3 10.3 0 0 1 12 4c6.5 0 10 8 10 8a20.3 20.3 0 0 1-4.2 5.6" />
    <path d="M6.1 6.1A20.3 20.3 0 0 0 2 12s3.5 8 10 8a10.3 10.3 0 0 0 4.2-.9" />
  </svg>
);

export default function Login() {
  useScrollReveal();

  const [formState, setFormState] = useState(initialState);
  const [showPassword, setShowPassword] = useState(false);
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
        <div className="container" data-reveal>
          <span className="eyebrow">Client Portal</span>
          <h1>Sign in to your dashboard</h1>
          <p className="lead">Access your live shift sheets and calendar view.</p>
        </div>
      </section>

      <section className="section">
        <div className="container auth-grid">
          <form className="auth-card" onSubmit={handleSubmit} data-reveal>
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
              <div className="password-field">
                <input
                  className="password-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formState.password}
                  onChange={handleChange}
                  required
                />
                {/* <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button> */}
              </div>
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
          <div className="auth-aside" data-reveal style={{ "--reveal-delay": "140ms" }}>
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
