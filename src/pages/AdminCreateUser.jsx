import { useState } from "react";
import { Link } from "react-router-dom";
import { authedFetch } from "../utils/api.js";

const initialState = {
  clientName: "",
  username: "",
  password: ""
};

export default function AdminCreateUser() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const randomFrom = (chars, length) => {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => chars[value % chars.length]).join("");
  };

  const shuffle = (value) => {
    const array = value.split("");
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join("");
  };

  const generateUsername = () => {
    const suffix = randomFrom("abcdefghijklmnopqrstuvwxyz0123456789", 6);
    return `client-${suffix}`;
  };

  const generatePassword = () => {
    const upper = randomFrom("ABCDEFGHJKLMNPQRSTUVWXYZ", 3);
    const lower = randomFrom("abcdefghijkmnopqrstuvwxyz", 5);
    const digits = randomFrom("23456789", 3);
    const symbols = randomFrom("!@#$%^&*", 3);
    return shuffle(`${upper}${lower}${digits}${symbols}`);
  };

  const handleGenerate = () => {
    setFormState((prev) => ({
      ...prev,
      username: generateUsername(),
      password: generatePassword()
    }));
  };

  const handleCopy = async () => {
    if (!formState.username || !formState.password) {
      setStatus({ state: "error", message: "Generate credentials first." });
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `Username: ${formState.username}\nPassword: ${formState.password}`
      );
      setStatus({ state: "success", message: "Credentials copied to clipboard." });
    } catch (error) {
      setStatus({ state: "error", message: "Copy failed. Please copy manually." });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", message: "Creating credentials..." });

    try {
      const response = await authedFetch("/admin-api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: formState.clientName,
          username: formState.username,
          password: formState.password
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create user.");
      }

      setStatus({ state: "success", message: "Client credentials created." });
      setFormState(initialState);
    } catch (error) {
      setStatus({ state: "error", message: error?.message || "Failed to create user." });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Admin Console</span>
          <h1>Create client credentials</h1>
          <p className="lead">Only admins can create new client logins.</p>
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
                placeholder="Central Trust"
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
                placeholder="client-username"
                value={formState.username}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Temporary Password
              <input
                type="password"
                name="password"
                placeholder="Set a temporary password"
                value={formState.password}
                onChange={handleChange}
                required
              />
            </label>
            <div className="button-row">
              <button
                className="btn btn-outline"
                type="button"
                onClick={handleGenerate}
                disabled={status.state === "sending"}
              >
                Generate credentials
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={handleCopy}
                disabled={status.state === "sending"}
              >
                Copy credentials
              </button>
            </div>
            <button className="btn btn-primary" type="submit" disabled={status.state === "sending"}>
              {status.state === "sending" ? "Creating..." : "Create credentials"}
            </button>
            {status.message && (
              <p className="form-note" aria-live="polite">
                {status.message}
              </p>
            )}
            <p className="form-note">
              <Link to="/app">Back to dashboard</Link>
            </p>
          </form>
          <div className="auth-aside">
            <h2>Notes</h2>
            <ul className="bullet-list">
              <li>Share credentials securely with the client.</li>
              <li>Clients can change their password after sign-in.</li>
              <li>Each client has isolated sheets and logs.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
