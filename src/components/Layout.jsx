import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const THEME_STORAGE_KEY = "hr_theme";

const getInitialTheme = () => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
};

export default function Layout({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthed = useMemo(() => Boolean(localStorage.getItem("hr_token")), [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleSignOff = () => {
    localStorage.removeItem("hr_token");
    localStorage.removeItem("hr_auth");
    navigate("/login");
  };

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrap">
          <div className="brand">
            <div className="logo">HR</div>
            <div>
              <div className="brand-title">Health Roaster Automation</div>
              <div className="brand-sub">NHS Shift Booking</div>
            </div>
          </div>
          <nav className="nav" aria-label="Main">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Client Portal</Link>
          </nav>
          <div className="nav-actions" aria-label="Actions">
            <Link className="btn btn-outline" to="/contact">
              Book a Free Demo
            </Link>
            <button
              className="btn btn-outline theme-toggle"
              type="button"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            {isAuthed ? (
              <button className="btn btn-primary" type="button" onClick={handleSignOff}>
                Sign-Off
              </button>
            ) : (
              <Link className="btn btn-primary" to="/login">
                Sign-In
              </Link>
            )}
          </div>
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
            <p>Email: bobirnacr@gmail.com</p>
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
