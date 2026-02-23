import { useState } from "react";
import { Link } from "react-router-dom";
import { socialProof, trustRowHospitalStat } from "../content/socialProof.js";
import { globalCaveats, homepageSecurityBlocks, step1Callout } from "../content/securityTrust.js";

const initialHeroState = {
  workEmail: "",
  trustOrHospital: ""
};

export default function Home() {
  const [heroFormState, setHeroFormState] = useState(initialHeroState);
  const [heroStatus, setHeroStatus] = useState({ state: "idle", message: "" });

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
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...heroFormState,
          source: "hero"
        })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to send request.");
      }

      setHeroStatus({
        state: "success",
        message: "Request sent. We will be in touch shortly."
      });
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
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Built for NHS Trust nurses</span>
            <h1>Automated Shift Booking for NHS Nurses</h1>
            <p className="lead">
              Never miss a shift again. We automate your HealthRoster bookings based on
              your grade and preferred shift type.
            </p>
            <p className="proof-line">{socialProof.heroProofLine}</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/contact">
                Book a Free Demo - Takes 2 Minutes
              </Link>
            </div>
            <a className="scroll-cue" href="#how-it-works">
              <span className="scroll-cue-icon" aria-hidden="true">
                v
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
          <div className="hero-form-panel">
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
                {heroStatus.state === "sending" ? "Sending..." : "Get My Free Demo ->"}
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

      <section id="how-it-works" className="section">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Clear, compliant, and built around the HealthRoster workflow.</p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-index">1</div>
              <h3>Share your preferences</h3>
              <p>You provide login credentials, grade, and preferred shift type.</p>
              <div className="step-security-callout">
                <div className="step-security-title">
                  <span aria-hidden="true">{step1Callout.icon}</span>
                  <span>{step1Callout.title}</span>
                </div>
                <p>{step1Callout.body}</p>
                <Link className="step-security-link" to={step1Callout.linkHref}>
                  {step1Callout.linkLabel} &rarr;
                </Link>
              </div>
            </div>
            <div className="step-card">
              <div className="step-index">2</div>
              <h3>We configure automation</h3>
              <p>We set up the booking logic based on your requirements.</p>
            </div>
            <div className="step-card">
              <div className="step-index">3</div>
              <h3>We monitor shifts</h3>
              <p>Our system watches for matching shifts as they appear.</p>
            </div>
            <div className="step-card">
              <div className="step-index">4</div>
              <h3>Shifts get booked</h3>
              <p>Eligible shifts are booked automatically in real time.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section demo-section">
        <div className="container demo-grid">
          <div className="demo-copy">
            <h2>See Our Automation in Action</h2>
            <p>
              Watch how we monitor HealthRoster, match shifts to your grade and shift type,
              and book instantly so you never lose opportunities to manual refresh.
            </p>
          </div>
          <div className="demo-video">
            <div className="video-placeholder">
              <span>Demo Video Placeholder</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="container">
          <div className="section-header">
            <h2>Benefits</h2>
            <p>Automation that protects your time and boosts your booking success.</p>
          </div>
          <div className="benefits-grid">
            <div className="benefit-card">
              <h3>Saves time</h3>
              <p>Eliminate hours of manual refresh and repetitive booking steps.</p>
            </div>
            <div className="benefit-card">
              <h3>No manual refreshing</h3>
              <p>We monitor availability continuously so you can focus on care.</p>
            </div>
            <div className="benefit-card">
              <h3>Higher booking success</h3>
              <p>Instant booking improves your chance of securing preferred shifts.</p>
            </div>
            <div className="benefit-card">
              <h3>Fully secure</h3>
              <p>Credentials are encrypted and used only for automated booking.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section homepage-security-section">
        <div className="container">
          <div className="section-header">
            <h2>How we protect your credentials</h2>
            <p>
              We use practical safeguards now, continue hardening security posture, and share roadmap
              progress transparently.
            </p>
          </div>
          <div className="homepage-security-grid">
            {homepageSecurityBlocks.map((block) => (
              <article key={block.title} className="homepage-security-card">
                <h3>{block.title}</h3>
                <p>{block.body}</p>
              </article>
            ))}
          </div>
          <p className="homepage-security-caveat">{globalCaveats.nhsPolicyNote}</p>
          <Link className="step-security-link" to="/security">
            Full security details &rarr;
          </Link>
        </div>
      </section>

      <section className="section proof-strip-section" aria-label="Service trust signals">
        <div className="container proof-strip">
          {socialProof.primaryStats.map((stat) => (
            <div className="proof-item" key={stat.value}>
              {stat.value}
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-card">
          <div>
            <h2>Start Booking Smarter</h2>
            <p>Get set up in minutes and let automation do the work for you.</p>
          </div>
          <Link className="btn btn-primary" to="/contact">
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
