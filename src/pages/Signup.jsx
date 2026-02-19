import { Link } from "react-router-dom";

export default function Signup() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Client Portal</span>
          <h1>Account creation is admin-only</h1>
          <p className="lead">Your admin will provide login credentials.</p>
        </div>
      </section>

      <section className="section">
        <div className="container auth-grid">
          <div className="auth-card">
            <h2>Need access?</h2>
            <p className="form-note">
              Accounts are created by the HealthRoster Automation admin team. Please contact us
              to receive your credentials.
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <Link className="btn btn-primary" to="/contact">
                Contact support
              </Link>
              <Link className="btn btn-outline" to="/login">
                Back to sign in
              </Link>
            </div>
          </div>
          <div className="auth-aside">
            <h2>Why admin-only?</h2>
            <ul className="bullet-list">
              <li>Clients get pre-configured sheets and permissions.</li>
              <li>We verify organizations before issuing access.</li>
              <li>Credentials are delivered securely.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
