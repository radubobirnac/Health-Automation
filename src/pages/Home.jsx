import { Link } from "react-router-dom";

export default function Home() {
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
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/contact">
                Book a Free Demo
              </Link>
              <a className="btn btn-outline" href="#how-it-works">
                How It Works
              </a>
            </div>
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
                <div className="trust-number">Fast</div>
                <div className="trust-label">Instant booking</div>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-card">
              <h3>Your Preferences</h3>
              <ul>
                <li>HealthRoster Username</li>
                <li>HealthRoster Password</li>
                <li>Requested Grade</li>
                <li>Preferred Shift Type</li>
              </ul>
              <div className="panel-note">
                We configure automation to match your exact shift preferences.
              </div>
            </div>
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
