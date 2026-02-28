import { useState } from "react";
import { Link } from "react-router-dom";
import { socialProof, trustRowHospitalStat } from "../content/socialProof.js";
import { globalCaveats, homepageSecurityBlocks, step1Callout } from "../content/securityTrust.js";
import useScrollReveal from "../utils/useScrollReveal.js";

const initialHeroState = {
  workEmail: "",
  trustOrHospital: ""
};

function IconClock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconTrendingUp() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 1-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconBriefcase() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5" r="3"/>
      <circle cx="5" cy="19" r="3"/>
      <circle cx="19" cy="19" r="3"/>
      <line x1="12" y1="8" x2="5.5" y2="16.5"/>
      <line x1="12" y1="8" x2="18.5" y2="16.5"/>
    </svg>
  );
}

const FEATURES = [
  {
    icon: <IconClock />,
    title: "Saves hours every week",
    desc: "Eliminate manual refreshing and repetitive booking steps. Our system works continuously so you can focus on patient care.",
    link: "/contact"
  },
  {
    icon: <IconEye />,
    title: "24/7 shift monitoring",
    desc: "We watch HealthRoster around the clock and act the moment a matching shift appears — no delays, no missed windows.",
    link: "/contact"
  },
  {
    icon: <IconTrendingUp />,
    title: "Higher booking success",
    desc: "Instant automated booking dramatically improves your chance of securing preferred shifts over manual refresh.",
    link: "/contact"
  },
  {
    icon: <IconShield />,
    title: "Fully secure by design",
    desc: "Credentials are encrypted in transit and used only for authorised booking automation. Never shared with third parties.",
    link: "/security"
  }
];

const ROLES = [
  {
    icon: <IconUser />,
    title: "NHS Bank Nurse",
    desc: "Maximise shifts without spending hours refreshing HealthRoster. Get booked automatically for your grade and shift type.",
    href: "/contact"
  },
  {
    icon: <IconUsers />,
    title: "NHS Locum Nurse",
    desc: "Book shifts flexibly across multiple NHS Trusts from a single automation setup. No manual cross-checking required.",
    href: "/contact"
  },
  {
    icon: <IconBriefcase />,
    title: "Trust HR Manager",
    desc: "Reduce staffing gaps and admin overhead. Help bank staff fill shifts faster with automated booking.",
    href: "/contact"
  },
  {
    icon: <IconNetwork />,
    title: "Staffing Agency",
    desc: "Scale shift placements across your workforce without proportionally scaling your admin team.",
    href: "/contact"
  }
];

const STATS = [
  { value: "12+", label: "NHS Trusts supported" },
  { value: "24/7", label: "Automated shift monitoring" },
  { value: "48hrs", label: "Average setup time" },
  { value: "100%", label: "Grade-matched booking" }
];

export default function Home() {
  const [heroFormState, setHeroFormState] = useState(initialHeroState);
  const [heroStatus, setHeroStatus] = useState({ state: "idle", message: "" });
  useScrollReveal();

  const handleHeroChange = (event) => {
    const { name, value } = event.target;
    setHeroFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleHeroSubmit = async (event) => {
    event.preventDefault();
    setHeroStatus({ state: "sending", message: "Sending your request..." });

    try {
      const response = await fetch("/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...heroFormState, source: "hero" })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to send request.");
      }

      setHeroStatus({ state: "success", message: "Request sent. We will be in touch shortly." });
      setHeroFormState(initialHeroState);
    } catch (error) {
      setHeroStatus({
        state: "error",
        message: error?.message || "Something went wrong. Please try again."
      });
    }
  };

  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy" data-reveal>
            <span className="eyebrow">Built for NHS Trust nurses</span>
            <h1>Automated Shift Booking for NHS Nurses</h1>
            <p className="lead">
              Never miss a shift again. We automate your HealthRoster bookings based on
              your grade and preferred shift type.
            </p>
            <p className="proof-line">{socialProof.heroProofLine}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/contact">
                Book a Free Demo — Takes 2 Minutes
              </Link>
            </div>
            <a className="scroll-cue" href="#how-it-works">
              <span className="scroll-cue-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </span>
              <span>How it works</span>
            </a>
            <div className="trust-row">
              <div className="trust-card">
                <div className="trust-number">24/7</div>
                <div className="trust-label">Automated monitoring</div>
              </div>
              <div className="trust-card">
                <div className="trust-number">Secure</div>
                <div className="trust-label">Encrypted credentials</div>
              </div>
              <div className="trust-card">
                <div className="trust-number">{trustRowHospitalStat.value}</div>
                <div className="trust-label">{trustRowHospitalStat.label}</div>
              </div>
            </div>
          </div>

          <div className="hero-form-panel" data-reveal style={{ "--reveal-delay": "120ms" }}>
            <form className="hero-form-card" onSubmit={handleHeroSubmit}>
              <h3>Get Your Free Demo</h3>
              <label>
                Work Email
                <input
                  type="email"
                  name="workEmail"
                  placeholder="jane@nhs.uk"
                  value={heroFormState.workEmail}
                  onChange={handleHeroChange}
                  required
                />
              </label>
              <label>
                NHS Trust Name
                <input
                  type="text"
                  name="trustOrHospital"
                  placeholder="e.g. Leeds Teaching Hospitals"
                  value={heroFormState.trustOrHospital}
                  onChange={handleHeroChange}
                  required
                />
              </label>
              <button
                className="btn btn-primary hero-submit"
                type="submit"
                disabled={heroStatus.state === "sending"}
              >
                {heroStatus.state === "sending" ? "Sending..." : "Get My Free Demo →"}
              </button>
              <p className="hero-form-note">No commitment. Set up in 48 hours.</p>
              <p className="hero-form-note">We&apos;ll only use this to set up your demo. No spam, ever.</p>
              {heroStatus.message && (
                <p
                  className={`hero-status ${heroStatus.state === "error" ? "is-error" : "is-success"}`}
                  aria-live="polite"
                >
                  {heroStatus.message}
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header" data-reveal>
            <h2>How It Works</h2>
            <p>Clear, compliant, and built around the HealthRoster workflow.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card" data-reveal style={{ "--reveal-delay": "80ms" }}>
              <div className="step-index">1</div>
              <h3>Share your preferences</h3>
              <p>You provide login credentials, grade, and preferred shift type.</p>
              <details className="step-security-callout">
                <summary className="step-security-summary">
                  <span className="step-security-title">
                    <span aria-hidden="true">{step1Callout.icon}</span>
                    <span>{step1Callout.title}</span>
                  </span>
                  <span className="step-security-chevron" aria-hidden="true">▾</span>
                </summary>
                <p>{step1Callout.body}</p>
                <Link className="step-security-link" to={step1Callout.linkHref}>
                  {step1Callout.linkLabel} &rarr;
                </Link>
              </details>
            </div>
            <div className="step-card" data-reveal style={{ "--reveal-delay": "140ms" }}>
              <div className="step-index">2</div>
              <h3>We configure automation</h3>
              <p>We set up the booking logic based on your requirements.</p>
            </div>
            <div className="step-card" data-reveal style={{ "--reveal-delay": "200ms" }}>
              <div className="step-index">3</div>
              <h3>We monitor shifts</h3>
              <p>Our system watches for matching shifts as they appear.</p>
            </div>
            <div className="step-card" data-reveal style={{ "--reveal-delay": "260ms" }}>
              <div className="step-index">4</div>
              <h3>Shifts get booked</h3>
              <p>Eligible shifts are booked automatically in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO VIDEO ─────────────────────────────────────────────── */}
      <section className="section demo-section">
        <div className="container demo-grid">
          <div className="demo-copy" data-reveal>
            <h2>See Our Automation in Action</h2>
            <p>
              Watch how we monitor HealthRoster, match shifts to your grade and shift type,
              and book instantly so you never lose opportunities to manual refresh.
            </p>
          </div>
          <div className="demo-video" data-reveal style={{ "--reveal-delay": "120ms" }}>
            <div className="video-placeholder" role="img" aria-label="Demo video coming soon">
              <div className="video-placeholder-inner">
                <div className="video-play-btn" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <span className="video-placeholder-label">Demo video coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS (Benefits) ───────────────────────────────── */}
      <section className="section benefits-section">
        <div className="container">
          <div className="section-header" data-reveal>
            <h2>Why nurses choose us</h2>
            <p>Automation that protects your time and delivers measurable results.</p>
          </div>
          <div className="benefits-grid">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className="feature-card"
                data-reveal
                style={{ "--reveal-delay": `${80 + index * 70}ms` }}
              >
                <div className="feature-card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <Link className="feature-card-link" to={feature.link}>
                  Learn more &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ────────────────────────────────────────────── */}
      <section className="stats-strip-section" aria-label="Service statistics">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((stat, index) => (
              <div
                key={stat.value}
                data-reveal="fade"
                style={{ "--reveal-delay": `${80 + index * 60}ms` }}
              >
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR (Roles) ───────────────────────────────────── */}
      <section className="section roles-section">
        <div className="container">
          <div className="section-header" data-reveal>
            <h2>Built for your role</h2>
            <p>Different NHS workflows, one automation platform.</p>
          </div>
          <div className="roles-grid">
            {ROLES.map((role, index) => (
              <Link
                key={role.title}
                className="role-card"
                to={role.href}
                data-reveal
                style={{ "--reveal-delay": `${70 + index * 70}ms` }}
              >
                <div className="role-card-icon">{role.icon}</div>
                <div className="role-card-title">{role.title}</div>
                <div className="role-card-desc">{role.desc}</div>
                <span className="role-card-cta">Get started &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CREDENTIAL SECURITY ────────────────────────────────────── */}
      <section className="section homepage-security-section">
        <div className="container">
          <div className="section-header" data-reveal>
            <h2>How we protect your credentials</h2>
            <p>
              Practical safeguards, continuous hardening, and full transparency on our roadmap.
            </p>
          </div>
          <div className="homepage-security-grid">
            {homepageSecurityBlocks.map((block, index) => (
              <article
                key={block.title}
                className="homepage-security-card"
                data-reveal
                style={{ "--reveal-delay": `${80 + index * 70}ms` }}
              >
                <h3>{block.title}</h3>
                <p>{block.body}</p>
              </article>
            ))}
          </div>
          <p className="homepage-security-caveat" data-reveal style={{ "--reveal-delay": "240ms" }}>
            {globalCaveats.nhsPolicyNote}
          </p>
          <Link className="step-security-link" to="/security" data-reveal style={{ "--reveal-delay": "300ms" }}>
            Full security details &rarr;
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIAL ────────────────────────────────────────────── */}
      <section className="section testimonial-section">
        <div className="container">
          <div className="section-header" data-reveal>
            <h2>What nurses say</h2>
            <p>Trusted by NHS nurses across the UK.</p>
          </div>
          <div className="testimonial-card" data-reveal style={{ "--reveal-delay": "120ms" }}>
            <div className="testimonial-quote-mark" aria-hidden="true">&ldquo;</div>
            <p className="testimonial-quote">
              I used to spend 30 minutes every morning refreshing HealthRoster. Now I get a
              notification when a shift is already booked for me. It has saved me hours every
              week and I never miss a shift I would have wanted.
            </p>
            <div className="testimonial-byline">
              <div className="testimonial-author">NHS Bank Nurse</div>
              <div className="testimonial-role-label">Yorkshire NHS Trust</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="container cta-card" data-reveal>
          <div>
            <h2>Start Booking Smarter</h2>
            <p>Get set up in 48 hours and let automation do the work for you.</p>
          </div>
          <Link className="btn btn-primary" to="/contact">
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
