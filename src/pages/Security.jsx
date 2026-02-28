import { Link } from "react-router-dom";
import {
  globalCaveats,
  securityContact,
  securityFaq,
  ukDataRightsTransparency,
  ukGdprSection
} from "../content/securityTrust.js";
import useScrollReveal from "../utils/useScrollReveal.js";

export default function Security() {
  useScrollReveal();

  return (
    <>
      <section className="page-hero">
        <div className="container" data-reveal>
          <span className="eyebrow">Security</span>
          <h1>How we handle credential security</h1>
          <p className="lead">
            Your credentials are your responsibility to share and ours to protect. This page gives
            an honest account of the safeguards we have in place today, the work currently underway,
            and what we're committed to delivering next.
          </p>
        </div>
      </section>

      <section className="section security-faq-section">
        <div className="container" data-reveal>
          <h2>Frequently Asked Questions</h2>
        </div>

        <div className="container security-faq-grid">
          {securityFaq.map((item, index) => (
            <article
              key={item.id}
              className="security-faq-item"
              data-reveal
              style={{ "--reveal-delay": `${80 + index * 60}ms` }}
            >
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="container security-caveat-block" data-reveal style={{ "--reveal-delay": "120ms" }}>
          <p className="security-caveat-text">
            <strong>Important:</strong> {globalCaveats.nhsPolicyNote}
          </p>
        </div>

        <div className="container security-rights-block" data-reveal style={{ "--reveal-delay": "140ms" }}>
          <h2>{ukDataRightsTransparency.title}</h2>
          <p>{ukDataRightsTransparency.body}</p>
          <ul>
            {ukDataRightsTransparency.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="container security-rights-block" data-reveal style={{ "--reveal-delay": "200ms" }}>
          <h2>{ukGdprSection.title}</h2>
          <p>{ukGdprSection.body}</p>
          <ul>
            {ukGdprSection.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="container security-page-cta" data-reveal style={{ "--reveal-delay": "260ms" }}>
          <p className="form-note">{securityContact.finalNote}</p>
          <Link className="btn btn-primary" to="/contact">
            Contact
          </Link>
        </div>
      </section>
    </>
  );
}
