import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authedFetch } from "../utils/api.js";

const COLUMNS = [
  { key: "request_id", label: "Request ID" },
  { key: "trust", label: "Trust" },
  { key: "client", label: "Client" },
  { key: "portal", label: "Portal" },
  { key: "unit", label: "Unit" },
  { key: "request_grade", label: "Grade" },
  { key: "start", label: "Start" },
  { key: "end", label: "End" },
  { key: "date", label: "Date" },
  { key: "release", label: "Release" },
  { key: "disappeared", label: "Disappeared" },
  { key: "sector", label: "Sector" },
  { key: "received_at", label: "Received At" }
];

const toDisplay = (value) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

export default function TrustsData() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState({ state: "loading", message: "Loading data..." });
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        const response = await authedFetch("/data/rows");
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const payload = await response.json();
        if (!isActive) return;
        setRows(payload?.rows || []);
        setStatus({ state: "success", message: "" });
      } catch (error) {
        if (!isActive) return;
        setStatus({ state: "error", message: "Unable to load Trusts Data." });
        if (error.message === "Unauthorized") {
          navigate("/login");
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return rows;
    return rows.filter((row) =>
      Object.values(row || {}).some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(trimmed)
      )
    );
  }, [rows, query]);

  return (
    <>
      <section className="dashboard-hero">
        <div className="container dashboard-header dashboard-container">
          <div>
            <span className="eyebrow">Operations</span>
            <h1>Trusts Data</h1>
            <p className="lead">Live ingest stream from automation bots.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {status.message && <div className="status-pill">{status.message}</div>}
            <button className="btn btn-outline" type="button" onClick={() => navigate("/app")}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </section>

      <section className="section dashboard-section">
        <div className="container dashboard-container">
          <div className="sheet-actions-row" style={{ marginBottom: "16px" }}>
            <div className="sheet-field" style={{ maxWidth: "320px" }}>
              <label>Search</label>
              <input
                type="text"
                placeholder="Filter by trust, unit, request id..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="sheet-table-wrapper trusts-table-wrapper">
            <table className="sheet-table trusts-table">
              <thead>
                <tr>
                  {COLUMNS.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ textAlign: "center", padding: "20px" }}>
                      No ingested rows yet.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => (
                    <tr key={`${row.request_id || "row"}-${row.received_at || index}`}>
                      {COLUMNS.map((column) => (
                        <td key={column.key}>{toDisplay(row?.[column.key])}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div
            className="sheet-actions-row"
            style={{ justifyContent: "center", marginTop: "12px" }}
          >
            <div className="status-pill">
              {filtered.length} / {rows.length} rows
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
