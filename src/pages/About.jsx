import { Link } from "react-router-dom";
import { globalCaveats } from "../content/securityTrust.js";

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

const VALUE_BLOCKS = [
  {
    icon: <IconTarget />,
    title: "Who We Are",
    body: "A healthcare-focused automation team helping NHS nurses secure shifts without the stress of constant manual refresh. We built this service because the problem is real and the existing tools do not solve it."
  },
  {
    icon: <IconZap />,
    title: "Our Mission",
    body: "Simplify and automate the shift booking process so nurses can focus on patient care while we handle the logistics. Fast, compliant, and built around the HealthRoster workflow."
  },
  {
    icon: <IconLock />,
    title: "Security First",
    body: "Credential handling is designed for roster-booking automation with controlled access boundaries, continuous hardening, and transparent communication about what we do and do not do with your data."
  },
  {
    icon: <IconHeart />,
    title: "Built for NHS Staff",
    body: "Every feature is designed around real NHS workflows — grade-based matching, shift type preferences, and Trust-level configuration. No generic automation tooling."
  }
];

const ABOUT_STATS = [
  { value: "12+", label: "NHS Trusts served" },
  { value: "24/7", label: "Continuous monitoring" },
  { value: "48hrs", label: "Setup time" },
  { value: "0", label: "Third-party credential sharing" }
];

export default function About() {
  return (
    <>
      {/* ── PAGE HERO ──────────────────────────────────────────────── */}
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h1>Healthcare automation built for NHS nurses</h1>
          <p className="lead">
            We help NHS Trust nurses maximise shift bookings with automated HealthRoster
            monitoring and instant booking — so you can focus on care, not admin.
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" to="/contact">Book a Free Demo</Link>
            <Link className="btn btn-outline" to="/security">View Security Details</Link>
          </div>
        </div>
      </section>

      {/* ── VALUE BLOCKS ───────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>What we stand for</h2>
            <p>The principles that guide every product and security decision we make.</p>
          </div>
          <div className="value-blocks-grid">
            {VALUE_BLOCKS.map((block) => (
              <div key={block.title} className="value-block">
                <div className="value-block-icon">{block.icon}</div>
                <h3>{block.title}</h3>
                <p>{block.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────── */}
      <section className="stats-strip-section" aria-label="Service statistics">
        <div className="container">
          <div className="stats-grid">
            {ABOUT_STATS.map((stat) => (
              <div key={stat.value + stat.label}>
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Why choose Health Roster Automation</h2>
            <p>Designed specifically for the NHS context — not generic automation.</p>
          </div>
          <div className="content-grid">
            <div>
              <h3>NHS-specific expertise</h3>
              <ul className="bullet-list" style={{ marginTop: "10px" }}>
                <li>Built around the HealthRoster platform</li>
                <li>Grade-based and shift-type filtering</li>
                <li>Multi-Trust configuration support</li>
                <li>48-hour average setup time</li>
              </ul>
            </div>
            <div>
              <h3>Transparent security posture</h3>
              <ul className="bullet-list" style={{ marginTop: "10px" }}>
                <li>Credentials encrypted in transit</li>
                <li>No third-party credential sharing</li>
                <li>UK GDPR compliant practices</li>
                <li>Honest roadmap communication</li>
              </ul>
            </div>
            <div>
              <h3>Measurable outcomes</h3>
              <ul className="bullet-list" style={{ marginTop: "10px" }}>
                <li>Hours saved on manual refresh</li>
                <li>Higher shift booking success rate</li>
                <li>Real-time booking, no delays</li>
                <li>Trusted by nurses across 12 hospitals</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY TRANSPARENCY ──────────────────────────────────── */}
      <section className="section">
        <div className="container about-security-block">
          <h2>Credential Security Transparency</h2>
          <p>
            We provide practical, status-based security communication so you can evaluate
            our controls without overclaiming. Every safeguard is documented honestly —
            including what is in progress.
          </p>
          <p style={{ color: "var(--gray-600)", fontSize: "0.9rem" }}>
            {globalCaveats.nhsPolicyNote}
          </p>
          <Link className="step-security-link" to="/security">
            Review full security details &rarr;
          </Link>
        </div>
      </section>

      {/* ── DEMO VIDEO ─────────────────────────────────────────────── */}
      <section className="section demo-section">
        <div className="container demo-grid">
          <div className="demo-copy">
            <h2>Watch the Automation Flow</h2>
            <p>
              A walkthrough of how we monitor HealthRoster, match shifts to your grade,
              and secure bookings in real time — without any manual intervention.
            </p>
            <Link className="btn btn-primary" to="/contact" style={{ marginTop: "16px", display: "inline-flex" }}>
              Book Your Demo
            </Link>
          </div>
          <div className="demo-video">
            <div className="video-placeholder" role="img" aria-label="Automation walkthrough video coming soon">
              <div className="video-placeholder-inner">
                <div className="video-play-btn" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <span className="video-placeholder-label">Automation walkthrough coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="container cta-card">
          <div>
            <h2>Ready to automate your shift booking?</h2>
            <p>Get set up in 48 hours. No commitment required before your demo.</p>
          </div>
          <Link className="btn btn-primary" to="/contact">
            Book a Free Demo
          </Link>
        </div>
      </section>
    </>
  );
}
