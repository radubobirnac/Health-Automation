import { useEffect, useState } from "react";
import { authedFetch } from "../utils/api.js";

export default function BotActive() {
  const [status, setStatus] = useState(null);
  const [state, setState] = useState("loading");

  const fetchStatus = async () => {
    setState("loading");
    try {
      const res = await authedFetch("/bot/status");
      const payload = await res.json();
      setStatus(payload?.status || null);
      setState("success");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <>
      <section className="dashboard-hero dashboard-hero--minimal">
        <div className="container dashboard-container">
          <div className="page-header-grid minimal">
            <div className="page-header-copy">
              <div className="page-title">Bot Active</div>
              <p className="page-desc">Latest bot heartbeat and status.</p>
            </div>
            <div className="page-header-actions compact">
              <button className="btn btn-outline btn-sm" type="button" onClick={fetchStatus}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-section">
        <div className="container dashboard-container">
          <div className="sheet-card">
            <div className="sheet-actions">
              <span className="sheet-meta">
                {state === "loading" && "Loading status..."}
                {state === "error" && "Unable to load status."}
              </span>
            </div>
            <div className="sheet-table-wrapper">
              <table className="sheet-table">
                <tbody>
                  <tr>
                    <th>Last Seen</th>
                    <td>{status?.lastLogged || "No data yet"}</td>
                  </tr>
                  <tr>
                    <th>Portal</th>
                    <td>{status?.portal || "-"}</td>
                  </tr>
                  <tr>
                    <th>Team</th>
                    <td>{status?.AMteamName || "-"}</td>
                  </tr>
                  <tr>
                    <th>Mode</th>
                    <td>{status?.mode || "-"}</td>
                  </tr>
                  <tr>
                    <th>Received At</th>
                    <td>{status?.received_at || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
