import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="page-hero not-found-section">
      <div className="container not-found-container">
        <div className="not-found-code" aria-hidden="true">404</div>
        <span className="eyebrow">Page Not Found</span>
        <h1>This page doesn&apos;t exist</h1>
        <p className="lead">
          The page you&apos;re looking for may have been moved or the URL may be incorrect.
        </p>
        <div className="not-found-actions">
          <Link className="btn btn-primary" to="/">
            Go to Homepage
          </Link>
          <Link className="btn btn-outline" to="/contact">
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  );
}
