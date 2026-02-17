import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchedulerGrid from "../components/SchedulerGrid.jsx";
import SheetGrid from "../components/SheetGrid.jsx";

const SHIFT_TYPES = ["LD", "E", "N", "AE"];
const LOG_COLUMNS = ["Column A", "Column B", "Column C", "Column D", "Column E", "Column F"];

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

const createEmptyRow = () => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  locum_name: "",
  client: "",
  search_firstname: "",
  specialty: "",
  keyword: "",
  gender: "",
  time: ""
});

export default function Dashboard() {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [newSheetName, setNewSheetName] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
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
  const userId = useMemo(() => {
    try {
      const stored = localStorage.getItem("hr_auth");
      const parsed = stored ? JSON.parse(stored) : {};
      return (parsed?.user || "").trim();
    } catch (error) {
      return "";
    }
  }, []);
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
        const response = await fetch(`/sheets?user_id=${encodeURIComponent(userId)}`);
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

    if (userId) {
      fetchSheets();
    }
  }, [userId]);

  useEffect(() => {
    if (!activeSheetId || !startDate || !endDate || !userId) return;
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    const isLogs = active?.sheet_id === "logs" || (active?.name || "").toLowerCase() === "logs";
    const fetchSchedule = async () => {
      setStatus({ state: "loading", message: "Loading schedule..." });
      try {
        const response = await fetch(
          `/schedule?start=${startDate}&end=${endDate}&sheet_id=${activeSheetId}&user_id=${encodeURIComponent(
            userId
          )}`
        );
        if (!response.ok) {
          throw new Error("Schedule unavailable");
        }
        const payload = await response.json();
        setSheetName(payload?.sheet?.name || "");
        if (isLogs) {
          setNurses(payload?.nurses || []);
        } else {
          setNurses(padRows(payload?.nurses || []));
        }
        const nextMap = {};
        if (!isLogs) {
          (payload?.shifts || []).forEach((shift) => {
            nextMap[`${shift.nurse_id}_${shift.date}`] = shift.shift;
          });
          setShifts(nextMap);
        } else {
          setShifts({});
        }
        setStatus({ state: "success", message: "Schedule loaded." });
      } catch (error) {
        setStatus({ state: "error", message: "Unable to load schedule." });
      }
    };

    fetchSchedule();
  }, [activeSheetId, startDate, endDate, userId, sheets]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [activeSheetId]);

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
          shift,
          user_id: userId
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
              shift: update.shift,
              user_id: userId
            })
          })
        )
      );
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save pasted shifts." });
    }
  };

  const handleAddRow = () => {
    const newRow = createEmptyRow();
    setNurses((prev) =>
      padRows([...prev, newRow])
    );
    saveNurses([newRow]);
  };

  const handleAddColumn = () => {
    const next = new Date(endDate);
    next.setDate(next.getDate() + 1);
    setEndDate(toInputDate(next));
  };

  const handleNurseChange = (nurseId, key, value) => {
    let updatedRow;
    setNurses((prev) =>
      prev.map((nurse) => {
        if (nurse.id !== nurseId) return nurse;
        updatedRow = { ...nurse, [key]: value };
        return updatedRow;
      })
    );
    if (updatedRow) {
      saveNurses([updatedRow]);
    }
  };

  const saveNurses = async (rows) => {
    if (!activeSheetId || !rows || rows.length === 0) return;
    try {
      await fetch("/nurses/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: activeSheetId, nurses: rows, user_id: userId })
      });
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save row updates." });
    }
  };

  const handleCreateSheet = async (overrideName) => {
    const trimmed = (overrideName ?? newSheetName).trim();
    if (!trimmed) return;
    try {
      const response = await fetch("/sheets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, user_id: userId })
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
    if (!active) return;
    try {
      const response = await fetch("/sheets/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: active.sheet_id, user_id: userId })
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

  const handleEnsureRows = (newRows) => {
    if (!newRows?.length) return;
    setNurses((prev) => padRows([...prev, ...newRows]));
    saveNurses(newRows);
  };

  const handleNurseCommit = (nurse) => {
    if (!nurse) return;
    const current = nurses.find((row) => row.id === nurse.id);
    if (current) {
      saveNurses([current]);
    }
  };

  const handleBulkNurseCommit = ({ updates, rowIndices }) => {
    if (!updates?.length || !rowIndices?.length) return;
    let updatedRows = [];
    setNurses((prev) => {
      const next = [...prev];
      const affected = new Set(rowIndices);
      updates.forEach((update) => {
        const rowIndex = update.rowIndex;
        if (!next[rowIndex]) return;
        next[rowIndex] = { ...next[rowIndex], [update.key]: update.value };
        affected.add(rowIndex);
      });
      updatedRows = Array.from(affected)
        .map((index) => next[index])
        .filter(Boolean);
      return next;
    });
    saveNurses(updatedRows);
  };

  const handleToggleRow = (rowId) => {
    setSelectedRowIds((prev) => {
      if (prev.includes(rowId)) {
        return prev.filter((id) => id !== rowId);
      }
      return [...prev, rowId];
    });
  };

  const handleToggleAllRows = () => {
    setSelectedRowIds((prev) => {
      if (prev.length === nurses.length) {
        return [];
      }
      return nurses.map((nurse) => nurse.id);
    });
  };

  const deleteRows = async (rowIds) => {
    if (!rowIds.length) return;
    setNurses((prev) => padRows(prev.filter((nurse) => !rowIds.includes(nurse.id))));
    setShifts((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [nurseId] = key.split("_");
        if (!rowIds.includes(nurseId)) {
          next[key] = value;
        }
      });
      return next;
    });
    setSelectedRowIds([]);
    try {
      await fetch("/nurses/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: activeSheetId, nurse_ids: rowIds, user_id: userId })
      });
    } catch (error) {
      setStatus({ state: "error", message: "Failed to delete rows." });
    }
  };

  const handleDeleteSelectedRows = () => {
    deleteRows(selectedRowIds);
  };

  const handleDeleteRow = (rowId) => {
    deleteRows([rowId]);
  };

  const ensureLogRowIds = (rows) => {
    return rows.map((row) => (row?.id ? row : { id: createEmptyRow().id, ...row }));
  };

  const handleLogsRowsChange = (nextRows) => {
    const withIds = ensureLogRowIds(nextRows);
    setNurses(withIds);
    saveNurses(withIds);
  };

  const handleLogsAddRow = () => {
    const newRow = LOG_COLUMNS.reduce(
      (acc, key) => ({ ...acc, [key]: "" }),
      { id: createEmptyRow().id }
    );
    const next = [...nurses, newRow];
    setNurses(next);
    saveNurses([newRow]);
  };

  const handleLogsDeleteRow = (rowIndex, row) => {
    const next = nurses.filter((_, index) => index !== rowIndex);
    setNurses(next);
    if (!row?.id) return;
    fetch("/nurses/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet_id: activeSheetId, nurse_ids: [row.id], user_id: userId })
    }).catch(() => {
      setStatus({ state: "error", message: "Failed to delete rows." });
    });
  };

  const handleRename = async (overrideName) => {
    if (!activeSheetId) return;
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    const trimmed = (overrideName ?? sheetName).trim();
    if (!trimmed) return;
    if (active && (active.name || "").trim() === trimmed) return;
    try {
      const response = await fetch("/sheets/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: activeSheetId, name: trimmed, user_id: userId })
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
      setSheetName(payload.name);
    } catch (error) {
      setStatus({ state: "error", message: "Rename failed." });
    }
  };

  const activeSheet = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
  const isLogsSheet =
    activeSheet?.sheet_id === "logs" || (activeSheet?.name || "").toLowerCase() === "logs";

  return (
    <>
      <section className="dashboard-hero">
        <div className="container dashboard-header dashboard-container">
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
                    onBlur={(event) => handleRename(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleRename(event.target.value);
                      }
                    }}
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
                        handleCreateSheet(event.target.value);
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
                  />
                </div>
                <div className="sheet-field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="sheet-actions-row">
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={isLogsSheet ? handleLogsAddRow : handleAddRow}
                >
                  Add row
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={handleDeleteSelectedRows}
                  disabled={isLogsSheet || !selectedRowIds.length}
                >
                  Delete selected
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={handleAddColumn}
                  disabled={isLogsSheet}
                >
                  Add column (next day)
                </button>
              </div>
              {isLogsSheet ? (
                <SheetGrid
                  columns={LOG_COLUMNS}
                  rows={nurses}
                  onRowsChange={handleLogsRowsChange}
                  onDeleteRow={handleLogsDeleteRow}
                  showControls={false}
                />
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
                  onNurseCommit={handleNurseCommit}
                  onBulkNurseCommit={handleBulkNurseCommit}
                  onEnsureRows={handleEnsureRows}
                  selectedRowIds={selectedRowIds}
                  onToggleRow={handleToggleRow}
                  onToggleAllRows={handleToggleAllRows}
                  onDeleteRow={handleDeleteRow}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
