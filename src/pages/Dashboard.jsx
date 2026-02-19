import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchedulerGrid from "../components/SchedulerGrid.jsx";
import SheetGrid from "../components/SheetGrid.jsx";
import { authedFetch } from "../utils/api.js";

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
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [status, setStatus] = useState({ state: "loading", message: "Loading data..." });
  const [nurses, setNurses] = useState([]);
  const [shifts, setShifts] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sheetCacheRef = useRef(new Map());
  const lastLocalUpdateRef = useRef({});
  const lastServerSyncRef = useRef({});
  const dataSheetIdRef = useRef(null);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return toInputDate(today);
  });
  const [endDate, setEndDate] = useState(() => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    return toInputDate(future);
  });
  const [userId, setUserId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const markLocalUpdate = () => {
    if (!activeSheetId) return;
    lastLocalUpdateRef.current[activeSheetId] = Date.now();
    dataSheetIdRef.current = activeSheetId;
  };

  const markServerSync = (sheetId) => {
    if (!sheetId) return;
    lastServerSyncRef.current[sheetId] = Date.now();
  };

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
        setUserId(payload?.user_id || "");
        setIsAdmin(payload?.role === "admin");
        localStorage.setItem(
          "hr_auth",
          JSON.stringify({ username: payload?.username, role: payload?.role })
        );
      } catch (error) {
        if (!isActive) return;
        setUserId("");
        setIsAdmin(false);
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

  const handleLogout = async () => {
    try {
      localStorage.removeItem("hr_token");
      localStorage.removeItem("hr_auth");
      navigate("/login");
    } catch (error) {
      setStatus({ state: "error", message: "Logout failed." });
    }
  };

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await authedFetch("/sheets");
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
    const cached = sheetCacheRef.current.get(activeSheetId);
    if (cached) {
      dataSheetIdRef.current = activeSheetId;
      setNurses(cached.nurses);
      setShifts(cached.shifts);
      if (cached.sheetName) {
        setSheetName(cached.sheetName);
      }
    }
    const fetchStartedAt = Date.now();
    const controller = new AbortController();
    let isCurrent = true;
    const fetchSchedule = async () => {
      setStatus({ state: "loading", message: "Loading schedule..." });
      try {
        const response = await authedFetch(
          `/schedule?start=${startDate}&end=${endDate}&sheet_id=${activeSheetId}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("Schedule unavailable");
        }
        const payload = await response.json();
        if (!isCurrent) return;
        const lastLocalUpdate = lastLocalUpdateRef.current[activeSheetId];
        const lastServerSync = lastServerSyncRef.current[activeSheetId];
        const hasUnsyncedChanges =
          lastLocalUpdate && (!lastServerSync || lastServerSync < lastLocalUpdate);
        const shouldApply =
          !hasUnsyncedChanges && (!lastLocalUpdate || lastLocalUpdate <= fetchStartedAt);
        if (shouldApply) {
          dataSheetIdRef.current = activeSheetId;
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
        }
        setStatus({ state: "success", message: "Schedule loaded." });
      } catch (error) {
        if (!isCurrent || error.name === "AbortError") return;
        setStatus({ state: "error", message: "Unable to load schedule." });
      }
    };

    fetchSchedule();
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [activeSheetId, startDate, endDate, userId, sheets]);

  useEffect(() => {
    setSelectedRowIds([]);
  }, [activeSheetId]);

  useEffect(() => {
    const sheetId = dataSheetIdRef.current;
    if (!sheetId) return;
    sheetCacheRef.current.set(sheetId, {
      nurses,
      shifts,
      sheetName
    });
  }, [nurses, shifts, sheetName]);

  const dates = useMemo(() => {
    if (!startDate || !endDate) return [];
    return buildDateRange(new Date(startDate), new Date(endDate));
  }, [startDate, endDate]);

  const handleShiftChange = async (nurseId, dateKey, shift) => {
    markLocalUpdate();
    const sheetId = activeSheetId;
    setShifts((prev) => ({ ...prev, [`${nurseId}_${dateKey}`]: shift }));
    try {
      await authedFetch("/schedule/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: sheetId,
          nurse_id: nurseId,
          date: dateKey,
          shift
        })
      });
      markServerSync(sheetId);
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save shift." });
    }
  };

  const handleBulkShiftChange = async (updates) => {
    markLocalUpdate();
    const sheetId = activeSheetId;
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
          authedFetch("/schedule/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheet_id: sheetId,
              nurse_id: update.nurseId,
              date: update.dateKey,
              shift: update.shift
            })
          })
        )
      );
      markServerSync(sheetId);
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save pasted shifts." });
    }
  };

  const handleAddRow = () => {
    markLocalUpdate();
    const newRow = createEmptyRow();
    setNurses((prev) =>
      padRows([...prev, newRow])
    );
    saveNurses([newRow]);
  };


  const handleNurseChange = (nurseId, key, value) => {
    markLocalUpdate();
    let updatedRow;
    const next = nurses.map((nurse) => {
      if (nurse.id !== nurseId) return nurse;
      updatedRow = { ...nurse, [key]: value };
      return updatedRow;
    });
    setNurses(next);
    if (updatedRow) {
      saveNurses([updatedRow]);
    }
  };

  const saveNurses = async (rows) => {
    if (!activeSheetId || !rows || rows.length === 0) return;
    const sheetId = activeSheetId;
    try {
      await authedFetch("/nurses/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: sheetId, nurses: rows })
      });
      markServerSync(sheetId);
    } catch (error) {
      setStatus({ state: "error", message: "Failed to save row updates." });
    }
  };

  const handleDuplicateSheet = async () => {
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    if (!active) return;
    try {
      const response = await authedFetch("/sheets/duplicate", {
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
      dataSheetIdRef.current = created.sheet_id;
    } catch (error) {
      setStatus({ state: "error", message: "Failed to duplicate sheet." });
    }
  };

  const handleDeleteSheet = async () => {
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    if (!active) return;
    if (active.sheet_id === "logs" || (active.name || "").toLowerCase() === "logs") return;
    try {
      const response = await authedFetch("/sheets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: active.sheet_id })
      });
      if (!response.ok) {
        throw new Error("Delete failed");
      }
      sheetCacheRef.current.delete(active.sheet_id);
      delete lastLocalUpdateRef.current[active.sheet_id];
      delete lastServerSyncRef.current[active.sheet_id];
      const remaining = sheets.filter((s) => s.sheet_id !== active.sheet_id);
      setSheets(remaining);
      if (remaining.length > 0) {
        setActiveSheetId(remaining[0].sheet_id);
        setSheetName(remaining[0].name);
      }
      setNurses(padRows([]));
      setShifts({});
      dataSheetIdRef.current = remaining.length > 0 ? remaining[0].sheet_id : null;
      setShowDeleteConfirm(false);
    } catch (error) {
      setStatus({ state: "error", message: "Failed to delete sheet." });
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkNurseChange = (updates) => {
    markLocalUpdate();
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
    markLocalUpdate();
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
    markLocalUpdate();
    const next = [...nurses];
    const affected = new Set(rowIndices);
    updates.forEach((update) => {
      const rowIndex = update.rowIndex;
      if (!next[rowIndex]) return;
      next[rowIndex] = { ...next[rowIndex], [update.key]: update.value };
      affected.add(rowIndex);
    });
    const updatedRows = Array.from(affected)
      .map((index) => next[index])
      .filter(Boolean);
    setNurses(next);
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
    markLocalUpdate();
    const sheetId = activeSheetId;
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
      await authedFetch("/nurses/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: sheetId, nurse_ids: rowIds })
      });
      markServerSync(sheetId);
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
    markLocalUpdate();
    const withIds = ensureLogRowIds(nextRows);
    setNurses(withIds);
    saveNurses(withIds);
  };

  const handleLogsAddRow = () => {
    markLocalUpdate();
    const newRow = LOG_COLUMNS.reduce(
      (acc, key) => ({ ...acc, [key]: "" }),
      { id: createEmptyRow().id }
    );
    const next = [...nurses, newRow];
    setNurses(next);
    saveNurses([newRow]);
  };

  const handleLogsDeleteRow = (rowIndex, row) => {
    markLocalUpdate();
    const sheetId = activeSheetId;
    const next = nurses.filter((_, index) => index !== rowIndex);
    setNurses(next);
    if (!row?.id) return;
    authedFetch("/nurses/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sheet_id: sheetId, nurse_ids: [row.id] })
    })
      .then(() => {
        markServerSync(sheetId);
      })
      .catch(() => {
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
      const response = await authedFetch("/sheets/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheet_id: activeSheetId, name: trimmed })
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {status.message && <div className="status-pill">{status.message}</div>}
            {isAdmin && (
              <button className="btn btn-outline" type="button" onClick={() => navigate("/admin")}>
                Admin
              </button>
            )}
            <button className="btn btn-outline" type="button" onClick={handleLogout}>
              Sign out
            </button>
          </div>
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
            <button
              className="sheet-tab"
              type="button"
              style={{ color: "#dc3545" }}
              disabled={isLogsSheet}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Sheet
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
                  onDeleteRows={handleDeleteSelectedRows}
                  onDeleteRow={handleDeleteRow}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Sheet</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ marginBottom: "16px" }}>
              Are you sure you want to delete <strong>{activeSheet?.name}</strong>? This will permanently remove all nurses and shift data for this sheet. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDeleteSheet}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
