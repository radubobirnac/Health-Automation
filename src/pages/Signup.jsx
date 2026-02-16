import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const initialState = {
  clientName: "",
  username: "",
  password: "",
  confirmPassword: ""
};

export default function Signup() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", message: "Creating your account..." });

    if (formState.password !== formState.confirmPassword) {
      setStatus({ state: "error", message: "Passwords do not match." });
      return;
    }

    try {
      // Replace with real signup endpoint when available.
      await new Promise((resolve) => setTimeout(resolve, 700));
      localStorage.setItem("hr_auth", JSON.stringify({ user: formState.username }));
      setStatus({ state: "success", message: "Account created." });
      navigate("/app");
    } catch (error) {
      setStatus({
        state: "error",
        message: error?.message || "Signup failed. Please try again."
      });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Client Portal</span>
          <h1>Create your client account</h1>
          <p className="lead">Get started with your automated shift sheets.</p>
        </div>
      </section>

      <section className="section">
        <div className="container auth-grid">
          <form className="auth-card" onSubmit={handleSubmit}>
            <label>
              Client Name
              <input
                type="text"
                name="clientName"
                placeholder="Betsi Cadwaladr Team"
                value={formState.clientName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Username
              <input
                type="text"
                name="username"
                placeholder="Choose a username"
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
                placeholder="Create a password"
                value={formState.password}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                placeholder="Repeat password"
                value={formState.confirmPassword}
                onChange={handleChange}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={status.state === "sending"}>
              {status.state === "sending" ? "Creating..." : "Create account"}
            </button>
            {status.message && (
              <p className="form-note" aria-live="polite">
                {status.message}
              </p>
            )}
            <p className="form-note">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
          <div className="auth-aside">
            <h2>Included</h2>
            <ul className="bullet-list">
              <li>Multiple sheets per client</li>
              <li>Live validation on every edit</li>
              <li>Dedicated logs sheet</li>
              <li>Calendar-style monitoring</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
