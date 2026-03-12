import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";
import { hasPortalAccess } from "../utils/rbac.js";
import { clearClientSession, isClientSessionExpired } from "../utils/session.js";

export default function AuthGuard({ children }) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const verify = async () => {
      const token = localStorage.getItem("hr_token");
      if (!token) {
        navigate("/login");
        return;
      }
      if (isClientSessionExpired()) {
        clearClientSession();
        localStorage.removeItem("hr_token");
        localStorage.removeItem("hr_auth");
        navigate("/login");
        return;
      }

      try {
        const response = await authedFetch("/auth/me");
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const payload = await response.json();
        if (!isActive) return;
        if (hasPortalAccess(payload?.role)) {
          setAllowed(true);
        } else {
          clearClientSession();
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_auth");
          navigate("/login");
        }
      } catch (error) {
        if (!isActive) return;
        clearClientSession();
        localStorage.removeItem("hr_token");
        localStorage.removeItem("hr_auth");
        navigate("/login");
      } finally {
        if (isActive) setChecking(false);
      }
    };

    verify();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <section className="section">
        <div className="container">
          <p className="form-note">Checking access...</p>
        </div>
      </section>
    );
  }

  if (!allowed) {
    return null;
  }

  return children;
}
