import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { hasStoredAdminAccess, hasStoredPortalAccess } from "../utils/rbac.js";

const THEME_STORAGE_KEY = "hr_theme";

const getInitialTheme = () => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "light";
};

export default function Layout({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthed = useMemo(() => Boolean(localStorage.getItem("hr_token")), [location.pathname]);
  const canAccessPortal = useMemo(() => hasStoredPortalAccess(), [location.pathname]);
  const isAdmin = useMemo(() => hasStoredAdminAccess(), [location.pathname]);
  const isAppRoute =
    location.pathname.startsWith("/app") ||
    location.pathname.startsWith("/logs") ||
    location.pathname.startsWith("/bot-active");
  const isPortalRoute =
    location.pathname.startsWith("/portal-data") ||
    location.pathname.startsWith("/trusts-data");
  const isAppShell = isAppRoute || isPortalRoute;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [isMobileNavOpen]);

  const handleSignOff = () => {
    localStorage.removeItem("hr_token");
    localStorage.removeItem("hr_auth");
    navigate("/login");
  };

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className={`site-header${isAppShell ? " site-header--app" : ""}`}>
        <div className="container nav-wrap">
          <Link className="brand" to={isAppShell ? "/app" : "/"} aria-label="Health Roster Automation — go to dashboard">
            <div className="logo">HR</div>
            <div>
              <div className="brand-title">Health Roster Automation</div>
              <div className="brand-sub">NHS Shift Booking</div>
            </div>
          </Link>
          <nav className="nav" aria-label="Main">
            {isAppShell ? (
              <>
                <Link to="/app" className={location.pathname === "/app" ? "nav-active" : ""} aria-current={location.pathname === "/app" ? "page" : undefined}>Dashboard</Link>
                <Link to="/logs" className={location.pathname === "/logs" ? "nav-active" : ""} aria-current={location.pathname === "/logs" ? "page" : undefined}>Logs</Link>
                {isAuthed && canAccessPortal && (
                  <Link to="/portal-data" className={location.pathname === "/portal-data" ? "nav-active" : ""} aria-current={location.pathname === "/portal-data" ? "page" : undefined}>Portal Data</Link>
                )}
                {isAdmin && (
                  <Link to="/bot-active" className={location.pathname === "/bot-active" ? "nav-active" : ""} aria-current={location.pathname === "/bot-active" ? "page" : undefined}>Bot Status</Link>
                )}
              </>
            ) : (
              <>
                <Link to="/" className={location.pathname === "/" ? "nav-active" : ""} aria-current={location.pathname === "/" ? "page" : undefined}>Home</Link>
                <Link to="/about" className={location.pathname === "/about" ? "nav-active" : ""} aria-current={location.pathname === "/about" ? "page" : undefined}>About</Link>
                <Link to="/contact" className={location.pathname === "/contact" ? "nav-active" : ""} aria-current={location.pathname === "/contact" ? "page" : undefined}>Contact</Link>
                <Link to="/security" className={location.pathname === "/security" ? "nav-active" : ""} aria-current={location.pathname === "/security" ? "page" : undefined}>Security</Link>
                <Link to="/login" className={location.pathname === "/login" ? "nav-active" : ""} aria-current={location.pathname === "/login" ? "page" : undefined}>Client Portal</Link>
              </>
            )}
          </nav>
          <div className="nav-actions" aria-label="Actions">
            {isAppShell ? (
              <>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                >
                  {theme === "dark" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="5"/>
                      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  )}
                </button>
                <button className="btn btn-primary" type="button" onClick={handleSignOff}>
                  Sign Off
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
          <button
            className="mobile-nav-toggle"
            type="button"
            aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav"
            onClick={() => setIsMobileNavOpen((prev) => !prev)}
          >
            <span className="mobile-nav-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        className={`mobile-nav-backdrop${isMobileNavOpen ? " is-open" : ""}`}
        onClick={() => setIsMobileNavOpen(false)}
        aria-hidden={!isMobileNavOpen}
      />
      <nav
        id="mobile-nav"
        className={`mobile-nav${isMobileNavOpen ? " is-open" : ""}`}
        aria-label="Mobile"
        aria-hidden={!isMobileNavOpen}
      >
        <div className="mobile-nav-header">
          <div className="mobile-nav-title">Navigate</div>
          <button
            className="mobile-nav-close"
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
          >
            Close
          </button>
        </div>
        <div className="mobile-nav-links">
          {isAppShell ? (
            <>
              <Link to="/app" className={location.pathname === "/app" ? "nav-active" : ""}>Dashboard</Link>
              <Link to="/logs" className={location.pathname === "/logs" ? "nav-active" : ""}>Logs</Link>
              {isAuthed && canAccessPortal && (
                <Link to="/portal-data" className={location.pathname === "/portal-data" ? "nav-active" : ""}>Portal Data</Link>
              )}
              {isAdmin && (
                <Link to="/bot-active" className={location.pathname === "/bot-active" ? "nav-active" : ""}>Bot Status</Link>
              )}
            </>
          ) : (
            <>
              <Link to="/" className={location.pathname === "/" ? "nav-active" : ""}>Home</Link>
              <Link to="/about" className={location.pathname === "/about" ? "nav-active" : ""}>About</Link>
              <Link to="/contact" className={location.pathname === "/contact" ? "nav-active" : ""}>Contact</Link>
              <Link to="/security" className={location.pathname === "/security" ? "nav-active" : ""}>Security</Link>
              <Link to="/login" className={location.pathname === "/login" ? "nav-active" : ""}>Client Portal</Link>
            </>
          )}
        </div>
        <div className="mobile-nav-actions">
          {isAppShell ? (
            <>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSignOff}>
                Sign Off
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline" to="/contact">
                Book a Free Demo
              </Link>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
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
            </>
          )}
        </div>
      </nav>

      <main id="main-content">{children}</main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <div className="footer-title">Health Roster Automation</div>
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
            <p>
              <Link to="/security">View security details</Link>
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>(c) 2026 Health Roster Automation. All rights reserved.</span>
        </div>
      </footer>
    </>
  );
}
