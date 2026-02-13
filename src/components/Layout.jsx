import { Link } from "react-router-dom";

export default function Layout({ children }) {
  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <div className="brand">
            <div className="logo">HR</div>
            <div>
              <div className="brand-title">HealthRoster Automation</div>
              <div className="brand-sub">NHS Shift Booking</div>
            </div>
          </div>
          <nav className="nav">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </nav>
          <Link className="btn btn-primary" to="/contact">
            Book a Free Demo
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-title">HealthRoster Automation</div>
            <p>
              Automated shift booking for NHS Trust nurses. We simplify and secure the
              HealthRoster booking process so you can focus on patient care.
            </p>
          </div>
          <div>
            <div className="footer-title">Contact</div>
            <p>Email: radubobirnac@gmail.com</p>
            <p>Phone: +1 (503) 820-9110</p>
          </div>
          <div>
            <div className="footer-title">Security Disclaimer</div>
            <p>
              We never share credentials with third parties. Credentials are encrypted
              in transit and stored securely for automation only.
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>(c) 2026 HealthRoster Automation. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
