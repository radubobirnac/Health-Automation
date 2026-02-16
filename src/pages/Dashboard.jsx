import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchedulerGrid from "../components/SchedulerGrid.jsx";

const SHIFT_TYPES = ["LD", "E", "N", "AE"];

const buildDateRange = (start, end) => {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const toInputDate = (date) => date.toISOString().slice(0, 10);
const MIN_ROWS = 50;

const padRows = (rows) => {
  const next = [...rows];
  while (next.length < MIN_ROWS) {
    next.push({
      id: `temp-${Date.now()}-${next.length}`,
      locum_name: "",
      client: "",
      search_firstname: "",
      specialty: "",
      keyword: "",
      gender: "",
      time: ""
    });
  }
  return next;
};

export default function Dashboard() {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [status, setStatus] = useState({ state: "loading", message: "Loading data..." });
  const [nurses, setNurses] = useState([]);
  const [shifts, setShifts] = useState({});
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return toInputDate(today);
  });
  const [endDate, setEndDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return toInputDate(future);
  });
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem("hr_auth");
    if (!auth) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await fetch("/sheets");
        const payload = await response.json();
        const list = payload?.sheets || [];
        const hasLogs = list.some((sheet) => (sheet.name || "").toLowerCase() === "logs");
        const withLogs = hasLogs
          ? list
          : [
              ...list,
              {
                sheet_id: "logs",
                name: "Logs",
                client_name: "",
                created_at: ""
              }
            ];
        setSheets(withLogs);
        if (withLogs.length > 0) {
          setActiveSheetId(withLogs[0].sheet_id);
          setSheetName(withLogs[0].name);
        }
      } catch (error) {
        setStatus({ state: "idle", message: "" });
      }
    };

    fetchSheets();
  }, []);

  useEffect(() => {
    if (!activeSheetId || !startDate || !endDate) return;
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    if (active && (active.name || "").toLowerCase() === "logs") {
      setNurses(padRows([]));
      setShifts({});
      return;
    }

    const fetchSchedule = async () => {
      setStatus({ state: "loading", message: "Loading schedule..." });
      try {
        const response = await fetch(
          `/schedule?start=${startDate}&end=${endDate}&sheet_id=${activeSheetId}`
        );
        if (!response.ok) {
          throw new Error("Schedule unavailable");
        }
        const payload = await response.json();
        setSheetName(payload?.sheet?.name || "");
        setNurses(padRows(payload?.nurses || []));
        const nextMap = {};
        (payload?.shifts || []).forEach((shift) => {
          nextMap[`${shift.nurse_id}_${shift.date}`] = shift.shift;
        });
        setShifts(nextMap);
        setStatus({ state: "success", message: "Schedule loaded." });
      } catch (error) {
        setStatus({ state: "error", message: "Unable to load schedule." });
      }
    };

    fetchSchedule();
  }, [activeSheetId, startDate, endDate]);

  const dates = useMemo(() => {
    if (!startDate || !endDate) return [];
    return buildDateRange(new Date(startDate), new Date(endDate));
  }, [startDate, endDate]);

  const handleShiftChange = async (nurseId, dateKey, shift) => {
    setShifts((prev) => ({ ...prev, [`${nurseId}_${dateKey}`]: shift }));
    try {
      await fetch("/schedule/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: activeSheetId,
          nurse_id: nurseId,
          date: dateKey,
          shift
        })
      });
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save shift." });
    }
  };

  const handleBulkShiftChange = async (updates) => {
    setShifts((prev) => {
      const next = { ...prev };
      updates.forEach((update) => {
        next[`${update.nurseId}_${update.dateKey}`] = update.shift;
      });
      return next;
    });

    try {
      await Promise.all(
        updates.map((update) =>
          fetch("/schedule/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheet_id: activeSheetId,
              nurse_id: update.nurseId,
              date: update.dateKey,
              shift: update.shift
            })
          })
        )
      );
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save pasted shifts." });
    }
  };

  const handleAddRow = () => {
    setNurses((prev) =>
      padRows([
        ...prev,
        {
          id: `temp-${Date.now()}`,
          locum_name: "",
          client: "",
          search_firstname: "",
          specialty: "",
          keyword: "",
          gender: "",
          time: ""
        }
      ])
    );
  };

  const handleAddColumn = () => {
    const next = new Date(endDate);
    next.setDate(next.getDate() + 1);
    setEndDate(toInputDate(next));
  };

  const handleNurseChange = (nurseId, key, value) => {
    setNurses((prev) =>
      prev.map((nurse) => (nurse.id === nurseId ? { ...nurse, [key]: value } : nurse))
    );
  };

  const handleCreateSheet = async () => {
    const trimmed = newSheetName.trim();
    if (!trimmed) return;
    try {
      const response = await fetch("/sheets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (!response.ok) {
        throw new Error("Create failed");
      }
      const payload = await response.json();
      const created = payload?.sheet || { sheet_id: payload.sheet_id, name: trimmed };
      setSheets((prev) => [...prev.filter((s) => s.name !== "Logs"), created, ...prev.filter((s) => s.name === "Logs")]);
      setActiveSheetId(created.sheet_id);
      setSheetName(created.name);
      setNurses(padRows([]));
      setShifts({});
      setNewSheetName("");
    } catch (error) {
      setStatus({ state: "error", message: "Failed to create sheet." });
    }
  };

  const handleDuplicateSheet = async () => {
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    if (!active || (active.name || "").toLowerCase() === "logs") return;
    try {
      const response = await fetch("/sheets/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: active.sheet_id })
      });
      if (!response.ok) {
        throw new Error("Duplicate failed");
      }
      const payload = await response.json();
      const created = payload?.sheet || {
        sheet_id: payload.sheet_id,
        name: payload.name || `${active.name} (Copy)`
      };
      setSheets((prev) => [...prev.filter((s) => s.name !== "Logs"), created, ...prev.filter((s) => s.name === "Logs")]);
      setActiveSheetId(created.sheet_id);
      setSheetName(created.name);
      setNurses(padRows([]));
      setShifts({});
    } catch (error) {
      setStatus({ state: "error", message: "Failed to duplicate sheet." });
    }
  };

  const handleBulkNurseChange = (updates) => {
    setNurses((prev) => {
      const next = [...prev];
      updates.forEach((update) => {
        const rowIndex = update.rowIndex;
        if (!next[rowIndex]) return;
        next[rowIndex] = { ...next[rowIndex], [update.key]: update.value };
      });
      return next;
    });
  };

  const handleRename = async () => {
    if (!activeSheetId) return;
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    if (active && (active.name || "").toLowerCase() === "logs") return;
    try {
      const response = await fetch("/sheets/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: activeSheetId, name: sheetName })
      });
      if (!response.ok) {
        throw new Error("Rename failed");
      }
      const payload = await response.json();
      setSheets((prev) =>
        prev.map((sheet) =>
          sheet.sheet_id === payload.sheet_id ? { ...sheet, name: payload.name } : sheet
        )
      );
    } catch (error) {
      setStatus({ state: "error", message: "Rename failed." });
    }
  };

  const activeSheet = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
  const isLogsSheet = (activeSheet?.name || "").toLowerCase() === "logs";

  return (
    <>
      <section className="dashboard-hero">
        <div className="container dashboard-header">
          <div>
            <span className="eyebrow">Client Workspace</span>
            <h1>Shift Monitoring Sheets</h1>
            <p className="lead">Schedule matrix with real-time updates.</p>
          </div>
          {status.message && <div className="status-pill">{status.message}</div>}
        </div>
      </section>

      <section className="section">
        <div className="container dashboard-container">
          <div className="sheet-tabs">
            {sheets.map((sheet) => (
              <button
                key={sheet.sheet_id}
                type="button"
                className={`sheet-tab${
                  sheet.sheet_id === activeSheetId ? " active" : ""
                }`}
                onClick={() => {
                  setActiveSheetId(sheet.sheet_id);
                  setSheetName(sheet.name);
                }}
              >
                {sheet.name}
              </button>
            ))}
            <button
              className="sheet-tab"
              type="button"
              onClick={handleDuplicateSheet}
              disabled={isLogsSheet}
            >
              Duplicate
            </button>
          </div>

          <div className="dashboard-grid">
            <div>
              <div className="sheet-controls">
                <div className="sheet-field">
                  <label>Sheet name</label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(event) => setSheetName(event.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleRename();
                      }
                    }}
                    disabled={isLogsSheet}
                  />
                </div>
                <div className="sheet-field">
                  <label>New sheet name</label>
                  <input
                    type="text"
                    value={newSheetName}
                    placeholder="Type name and press Enter"
                    onChange={(event) => setNewSheetName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateSheet();
                      }
                    }}
                  />
                </div>
                <div className="sheet-field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    disabled={isLogsSheet}
                  />
                </div>
                <div className="sheet-field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    disabled={isLogsSheet}
                  />
                </div>
              </div>
              <div className="sheet-actions-row">
                <button className="btn btn-outline" type="button" onClick={handleAddRow}>
                  Add row
                </button>
                <button className="btn btn-outline" type="button" onClick={handleAddColumn}>
                  Add column (next day)
                </button>
              </div>
              {isLogsSheet ? (
                <div className="logs-placeholder">
                  Logs sheet is read-only and reserved for audit activity.
                </div>
              ) : (
                <SchedulerGrid
                  nurses={nurses}
                  dates={dates}
                  shifts={shifts}
                  shiftTypes={SHIFT_TYPES}
                  onShiftChange={handleShiftChange}
                  onBulkShiftChange={handleBulkShiftChange}
                  onNurseChange={handleNurseChange}
                  onBulkNurseChange={handleBulkNurseChange}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
