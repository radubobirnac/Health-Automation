import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
      // Replace with real auth endpoint when available.
      await new Promise((resolve) => setTimeout(resolve, 500));
      localStorage.setItem("hr_auth", JSON.stringify({ user: formState.username }));
      setStatus({ state: "success", message: "Signed in successfully." });
      navigate("/app");
    } catch (error) {
      setStatus({
        state: "error",
        message: error?.message || "Login failed. Please try again."
      });
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
                placeholder="Your client ID"
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
              Need an account? <Link to="/signup">Create one</Link>
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
