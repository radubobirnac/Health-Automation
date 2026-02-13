import { useState } from "react";

const initialState = {
  fullName: "",
  workEmail: "",
  trustOrHospital: "",
  message: ""
};

export default function Contact() {
  const [formState, setFormState] = useState(initialState);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ state: "sending", message: "Sending your request..." });

    try {
      const response = await fetch("/.netlify/functions/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || "Failed to send request.");
      }

      setStatus({ state: "success", message: "Request sent. We will be in touch soon." });
      setFormState(initialState);
    } catch (error) {
      setStatus({
        state: "error",
        message: error?.message || "Something went wrong. Please try again."
      });
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Contact</span>
          <h1>Book a free demo</h1>
          <p className="lead">
            Tell us your details and we will set up a walkthrough of the automation.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-grid">
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input
                type="text"
                name="fullName"
                placeholder="Jane Smith"
                value={formState.fullName}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Work Email
              <input
                type="email"
                name="workEmail"
                placeholder="jane@nhs.uk"
                value={formState.workEmail}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Trust or Hospital
              <input
                type="text"
                name="trustOrHospital"
                placeholder="NHS Trust Name"
                value={formState.trustOrHospital}
                onChange={handleChange}
              />
            </label>
            <label>
              Message
              <textarea
                rows="5"
                name="message"
                placeholder="Share your preferred grade and shift type."
                value={formState.message}
                onChange={handleChange}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={status.state === "sending"}>
              {status.state === "sending" ? "Sending..." : "Request Demo"}
            </button>
            <p className="form-note">
              Requests are sent directly to radubobirnac@gmail.com and virinchiaddanki@gmail.com.
            </p>
            <p className="form-note">
              We will never share your data. Credentials are collected only after demo approval.
            </p>
            {status.message && (
              <p className="form-note" aria-live="polite">
                {status.message}
              </p>
            )}
          </form>
          <div className="contact-card">
            <h2>Contact Details</h2>
            <p>Email: hello@healthrosterautomation.co.uk</p>
            <p>Phone: 020 1234 5678</p>
            <p>Hours: Monday to Friday, 9am-6pm</p>
            <div className="security-box">
              <h3>Security Disclaimer</h3>
              <p>
                Credentials are encrypted in transit and stored securely for automation.
                We never share them with third parties.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
