import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SheetGrid from "../components/SheetGrid.jsx";
import { authedFetch } from "../utils/api.js";
import { hasPortalAccess } from "../utils/rbac.js";
import { LOG_COLUMNS } from "../utils/logColumns.js";

const toInputDate = (date) => date.toISOString().slice(0, 10);

const createEmptyRowId = () =>
  `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export default function Logs() {
  const [rows, setRows] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [status, setStatus] = useState({ state: "loading", message: "Loading logs..." });
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState("");
  const logsSheetIdRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      try {
        const response = await authedFetch("/auth/me");
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        const payload = await response.json();
        if (!isActive) return;
        if (!hasPortalAccess(payload?.role)) {
          throw new Error("Unauthorized");
        }
        setUserId(payload?.user_id || "");
        setAuthChecked(true);
      } catch (error) {
        if (!isActive) return;
        localStorage.removeItem("hr_auth");
        localStorage.removeItem("hr_token");
        navigate("/login");
      }
    };

    loadSession();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  const ensureRowIds = (nextRows) =>
    nextRows.map((row) => (row?.id ? row : { id: createEmptyRowId(), ...row }));

  const fetchLogs = async () => {
    if (!userId) return;
    setStatus({ state: "loading", message: "Loading logs..." });
    try {
      const sheetsRes = await authedFetch("/sheets");
      const sheetsPayload = await sheetsRes.json();
      const list = sheetsPayload?.sheets || [];
      const logsSheet = list.find(
        (sheet) => sheet.sheet_id === "logs" || (sheet.name || "").toLowerCase() === "logs"
      );
      if (!logsSheet) {
        setStatus({ state: "error", message: "Logs sheet not found." });
        return;
      }
      logsSheetIdRef.current = logsSheet.sheet_id;
      const today = toInputDate(new Date());
      const scheduleRes = await authedFetch(
        `/schedule?start=${today}&end=${today}&sheet_id=${logsSheet.sheet_id}`
      );
      if (!scheduleRes.ok) {
        throw new Error("Logs unavailable");
      }
      const payload = await scheduleRes.json();
      setRows(ensureRowIds(payload?.nurses || []));
      setStatus({ state: "success", message: "" });
    } catch (error) {
      setStatus({ state: "error", message: "Unable to load logs." });
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [userId]);

  const handleRowsChange = (nextRows) => {
    const withIds = ensureRowIds(nextRows);
    setRows(withIds);
    saveRows(withIds);
  };

  const saveRows = async (nextRows) => {
    const sheetId = logsSheetIdRef.current;
    if (!sheetId || !nextRows?.length) return;
    try {
      await authedFetch("/nurses/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: sheetId, nurses: nextRows })
      });
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save log updates." });
    }
  };

  const handleToggleRow = (rowId) => {
    setSelectedRowIds((prev) => {
      if (prev.includes(rowId)) {
        return prev.filter((id) => id !== rowId);
      }
      return [...prev, rowId];
    });
  };

  const handleDeleteSelectedRows = async () => {
    const sheetId = logsSheetIdRef.current;
    if (!sheetId || selectedRowIds.length === 0) return;
    const selected = new Set(selectedRowIds);
    setRows((prev) => prev.filter((row) => !selected.has(row.id)));
    setSelectedRowIds([]);
    try {
      await authedFetch("/nurses/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: sheetId, nurse_ids: Array.from(selected) })
      });
    } catch (error) {
      setStatus({ state: "error", message: "Failed to delete selected logs." });
    }
  };

  const logsCount = useMemo(() => rows.length, [rows.length]);

  if (!authChecked) {
    return (
      <section className="section">
        <div className="container">
          <p className="form-note">Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="dashboard-hero dashboard-hero--minimal">
        <div className="container dashboard-container">
          <div className="page-header-grid minimal">
            <div className="page-header-copy">
              <div className="page-title">Logs</div>
              <p className="page-desc">Activity logs for booking actions.</p>
            </div>
            <div className="page-header-actions compact">
              <span className="status-pill">{logsCount} entries</span>
              {status.message && <span className="status-pill">{status.message}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-section">
        <div className="container dashboard-container">
          <div className="action-bar minimal">
            <div className="action-bar-left">
              <button
                className="btn btn-danger btn-sm"
                type="button"
                disabled={!selectedRowIds.length}
                onClick={handleDeleteSelectedRows}
              >
                Delete Selected Rows
              </button>
            </div>
            <div className="action-bar-right">
              <button className="btn btn-outline btn-sm" type="button" onClick={fetchLogs}>
                Refresh Logs
              </button>
            </div>
          </div>

          <div className="dashboard-grid">
            <div>
              <SheetGrid
                columns={LOG_COLUMNS}
                rows={rows}
                onRowsChange={handleRowsChange}
                showControls={false}
                variant="logs"
                enableSelection
                selectedRowIds={selectedRowIds}
                onToggleRow={handleToggleRow}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
