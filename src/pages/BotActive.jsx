import { useEffect, useMemo, useState } from "react";
import { authedFetch } from "../utils/api.js";

export default function BotActive() {
  const [bots, setBots] = useState([]);
  const [state, setState] = useState("loading");
  const POLL_INTERVAL_MS = 3000;

  const fetchStatus = async (options = {}) => {
    if (!options.silent) {
      setState("loading");
    }
    try {
      const res = await authedFetch("/bot/status");
      const payload = await res.json();
      const list = Array.isArray(payload?.statuses)
        ? payload.statuses
        : payload?.status
          ? [payload.status]
          : [];
      setBots(list);
      setState("success");
    } catch {
      if (!options.silent) {
        setState("error");
      }
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      fetchStatus({ silent: true });
    };
    const intervalId = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  const sortedBots = useMemo(() => {
    return [...bots].sort((a, b) => {
      const aTime = new Date(a?.last_reported_at || a?.received_at || 0).getTime();
      const bTime = new Date(b?.last_reported_at || b?.received_at || 0).getTime();
      return bTime - aTime;
    });
  }, [bots]);

  return (
    <>
      <section className="dashboard-hero dashboard-hero--minimal">
        <div className="container dashboard-container">
          <div className="page-header-grid minimal">
            <div className="page-header-copy">
              <div className="page-title">Bot Live Status</div>
              <p className="page-desc">Latest bot heartbeats per team.</p>
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
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Last Reported Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBots.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center", padding: "16px" }}>
                        No bot status data yet.
                      </td>
                    </tr>
                  ) : (
                    sortedBots.map((bot, index) => {
                      const teamName =
                        bot?.team_name || bot?.team || bot?.AMteamName || bot?.bot_name || "-";
                      const lastReported =
                        bot?.last_reported_at ||
                        bot?.received_at ||
                        bot?.lastLogged ||
                        "-";
                      return (
                        <tr key={`${teamName}-${bot?.received_at || index}`}>
                          <td>{teamName}</td>
                          <td>{lastReported}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
