import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";

export default function AdminGuard({ children }) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const verify = async () => {
      const token = localStorage.getItem("hr_token");
      if (!token) {
        navigate("/admin-login");
        return;
      }

      try {
        const response = await authedFetch("/auth/me");
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const payload = await response.json();
        if (!isActive) return;
        if (payload?.role === "admin") {
          setAllowed(true);
        } else {
          localStorage.removeItem("hr_token");
          localStorage.removeItem("hr_auth");
          navigate("/admin-login");
        }
      } catch (error) {
        if (!isActive) return;
        localStorage.removeItem("hr_token");
        localStorage.removeItem("hr_auth");
        navigate("/admin-login");
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
          <p className="form-note">Checking admin access...</p>
        </div>
      </section>
    );
  }

  if (!allowed) {
    return null;
  }

  return children;
}
