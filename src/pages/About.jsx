export default function About() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">About Us</span>
          <h1>Healthcare automation built for NHS nurses</h1>
          <p className="lead">
            We help NHS Trust nurses maximize shift bookings with automated HealthRoster
            monitoring and instant booking.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container content-grid">
          <div>
            <h2>Who We Are</h2>
            <p>
              We are a healthcare-focused automation company helping NHS nurses secure
              shifts without the stress of constant manual refresh.
            </p>
          </div>
          <div>
            <h2>Our Mission</h2>
            <p>
              To simplify and automate the shift booking process so nurses can focus on
              patient care while we handle the logistics.
            </p>
          </div>
          <div>
            <h2>Why Choose Us</h2>
            <ul className="bullet-list">
              <li>Automation expertise tailored to HealthRoster</li>
              <li>Fast and reliable booking in real time</li>
              <li>Secure handling of credentials and preferences</li>
              <li>Built specifically for NHS Trust workflows</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section demo-section">
        <div className="container demo-grid">
          <div className="demo-copy">
            <h2>Watch the Automation Flow</h2>
            <p>
              A quick walkthrough of how we monitor HealthRoster, match shifts to your grade,
              and secure bookings in real time.
            </p>
          </div>
          <div className="demo-video">
            <div className="video-placeholder">
              <span>About Page Video Placeholder</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
