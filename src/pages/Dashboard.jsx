import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import SchedulerGrid from "../components/SchedulerGrid.jsx";
import ShiftTypeManager from "../components/ShiftTypeManager.jsx";
import { authedFetch } from "../utils/api.js";
import { hasPortalAccess } from "../utils/rbac.js";
import { getShiftClass } from "../utils/shiftClass.js";
import { BASE_SCHEDULER_COLUMNS } from "../utils/schedulerColumns.js";

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
const MIN_ROWS = 20;
const CUSTOM_COLUMN_CLASS = "col-custom";
const CUSTOM_COLUMNS_STORAGE_PREFIX = "hr_sheet_columns";
const BASE_COLUMN_KEYS = BASE_SCHEDULER_COLUMNS.map((col) => col.key);
const BASE_COLUMN_KEY_SET = new Set(BASE_COLUMN_KEYS);

const normalizeLabel = (value) => (value || "").trim().replace(/\s+/g, " ");

const toColumnKey = (label) => {
  const slug = normalizeLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug;
};

const toColumnLabel = (key) =>
  normalizeLabel(key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildCustomColumn = (key, label) => ({
  key,
  label: normalizeLabel(label) || toColumnLabel(key),
  className: CUSTOM_COLUMN_CLASS
});

const getColumnsStorageKey = (userId, sheetId) =>
  `${CUSTOM_COLUMNS_STORAGE_PREFIX}:${userId}:${sheetId}`;

const loadStoredColumns = (userId, sheetId) => {
  if (!userId || !sheetId) return [];
  const raw = localStorage.getItem(getColumnsStorageKey(userId, sheetId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((col) => col && typeof col.key === "string")
      .map((col) => buildCustomColumn(col.key, col.label));
  } catch {
    return [];
  }
};

const mergeCustomColumns = (current, additions) => {
  if (!additions?.length) return current;
  const existing = new Set(current.map((col) => col.key));
  const next = [...current];
  additions.forEach((col) => {
    if (!existing.has(col.key)) {
      existing.add(col.key);
      next.push(col);
    }
  });
  return next.length === current.length ? current : next;
};

const ensureColumnDefaults = (row, columns = []) => {
  if (!columns.length) return row;
  let updated = row;
  columns.forEach((col) => {
    if (updated[col.key] === undefined) {
      if (updated === row) {
        updated = { ...row };
      }
      updated[col.key] = "";
    }
  });
  return updated;
};

const padRows = (rows, customColumns = []) => {
  const normalized = rows.map((row) => ensureColumnDefaults(row, customColumns));
  const next = [...normalized];
  while (next.length < MIN_ROWS) {
    next.push(
      ensureColumnDefaults(
        {
          id: `temp-${Date.now()}-${next.length}`,
          locum_name: "",
          client: "",
          search_firstname: "",
          specialty: "",
          keyword: "",
          gender: "",
          time: ""
        },
        customColumns
      )
    );
  }
  return next;
};

const createEmptyRow = (customColumns = []) =>
  ensureColumnDefaults(
    {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      locum_name: "",
      client: "",
      search_firstname: "",
      specialty: "",
      keyword: "",
      gender: "",
      time: ""
    },
    customColumns
  );

const inferCustomColumns = (rows, existingKeys) => {
  if (!rows?.length) return [];
  const discovered = new Set();
  rows.forEach((row) => {
    if (!row || typeof row !== "object") return;
    Object.keys(row).forEach((key) => {
      if (key === "id") return;
      if (BASE_COLUMN_KEY_SET.has(key)) return;
      if (existingKeys.has(key)) return;
      discovered.add(key);
    });
  });
  return Array.from(discovered).map((key) => buildCustomColumn(key, ""));
};

export default function Dashboard() {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [sheetName, setSheetName] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [status, setStatus] = useState({ state: "loading", message: "Loading data..." });
  const [nurses, setNurses] = useState([]);
  const [shifts, setShifts] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shiftTypes, setShiftTypes] = useState(["LD", "E", "N", "AE"]);
  const [showShiftManager, setShowShiftManager] = useState(false);
  const [customColumns, setCustomColumns] = useState([]);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [columnError, setColumnError] = useState("");
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
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);
  const POLL_INTERVAL_MS = 3000;
  const [selectedCell, setSelectedCell] = useState(null);
  const [viewerText, setViewerText] = useState("");

  const allColumns = useMemo(
    () => [...BASE_SCHEDULER_COLUMNS, ...customColumns],
    [customColumns]
  );


  const markLocalUpdate = () => {
    if (!activeSheetId) return;
    lastLocalUpdateRef.current[activeSheetId] = Date.now();
    dataSheetIdRef.current = activeSheetId;
  };

  const markServerSync = (sheetId) => {
    if (!sheetId) return;
    lastServerSyncRef.current[sheetId] = Date.now();
  };
  //useeffect 

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
        setUsername(payload?.username || "");
        localStorage.setItem(
          "hr_auth",
          JSON.stringify({ username: payload?.username, role: payload?.role })
        );
        setAuthChecked(true);
      } catch (error) {
        if (!isActive) return;
        setUserId("");
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

  const fetchSchedule = async (options = {}) => {
    if (!activeSheetId || !startDate || !endDate || !userId) return;
    const fetchStartedAt = Date.now();
    if (!options.silent) {
      setStatus({ state: "loading", message: "Loading schedule..." });
    }
    try {
      const response = await authedFetch(
        `/schedule?start=${startDate}&end=${endDate}&sheet_id=${activeSheetId}`,
        options.signal ? { signal: options.signal } : undefined
      );
      if (!response.ok) {
        throw new Error("Schedule unavailable");
      }
      const payload = await response.json();
      if (!isMountedRef.current) return;
      const lastLocalUpdate = lastLocalUpdateRef.current[activeSheetId];
      const lastServerSync = lastServerSyncRef.current[activeSheetId];
      const hasUnsyncedChanges =
        lastLocalUpdate && (!lastServerSync || lastServerSync < lastLocalUpdate);
      const shouldApply =
        !hasUnsyncedChanges && (!lastLocalUpdate || lastLocalUpdate <= fetchStartedAt);
      if (shouldApply) {
        dataSheetIdRef.current = activeSheetId;
        setSheetName(payload?.sheet?.name || "");
        setNurses(padRows(payload?.nurses || [], customColumns));
        const nextMap = {};
        (payload?.shifts || []).forEach((shift) => {
          nextMap[`${shift.nurse_id}_${shift.date}`] = shift.shift;
        });
        setShifts(nextMap);
      }
      if (!options.silent) {
        setStatus({ state: "success", message: "" });
      }
    } catch (error) {
      if (!isMountedRef.current || error.name === "AbortError") return;
      if (!options.silent) {
        setStatus({ state: "error", message: "Unable to load schedule." });
      }
    }
  };

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        const response = await authedFetch("/sheets");
        const payload = await response.json();
        const list = payload?.sheets || [];
        const filtered = list.filter(
          (sheet) => (sheet.name || "").toLowerCase() !== "logs" && sheet.sheet_id !== "logs"
        );
        setSheets(filtered);
        if (filtered.length > 0) {
          setActiveSheetId(filtered[0].sheet_id);
          setSheetName(filtered[0].name);
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
    const cached = sheetCacheRef.current.get(activeSheetId);
    if (cached) {
      dataSheetIdRef.current = activeSheetId;
      setNurses(cached.nurses);
      setShifts(cached.shifts);
      if (cached.sheetName) {
        setSheetName(cached.sheetName);
      }
    }
    const controller = new AbortController();
    fetchSchedule({ signal: controller.signal });
    return () => {
      controller.abort();
    };
  }, [activeSheetId, startDate, endDate, userId, sheets]);

  useEffect(() => {
    if (!activeSheetId || !startDate || !endDate || !userId) return;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      fetchSchedule({ silent: true });
    };
    const intervalId = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [activeSheetId, startDate, endDate, userId]);

  useEffect(() => {
    if (!userId) return;
    const fetchShiftTypes = async () => {
      try {
        const response = await authedFetch("/shift-types");
        if (!response.ok) return;
        const payload = await response.json();
        if (payload?.shiftTypes?.length) {
          setShiftTypes(payload.shiftTypes);
        }
      } catch {
        // keep default shift types on error
      }
    };
    fetchShiftTypes();
  }, [userId]);

  useEffect(() => {
    if (!userId || !activeSheetId) {
      setCustomColumns([]);
      return;
    }
    setCustomColumns(loadStoredColumns(userId, activeSheetId));
    setNewColumnLabel("");
    setColumnError("");
  }, [userId, activeSheetId]);

  useEffect(() => {
    if (!userId || !activeSheetId) return;
    localStorage.setItem(
      getColumnsStorageKey(userId, activeSheetId),
      JSON.stringify(customColumns)
    );
  }, [customColumns, userId, activeSheetId]);

  useEffect(() => {
    if (!userId || !activeSheetId) return;
    if (!nurses?.length) return;
    const existingKeys = new Set([
      ...BASE_COLUMN_KEYS,
      ...customColumns.map((col) => col.key)
    ]);
    const inferred = inferCustomColumns(nurses, existingKeys);
    if (!inferred.length) return;
    setCustomColumns((prev) => mergeCustomColumns(prev, inferred));
  }, [nurses, userId, activeSheetId, customColumns]);

  useEffect(() => {
    if (!customColumns.length) return;
    setNurses((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const updated = ensureColumnDefaults(row, customColumns);
        if (updated !== row) {
          changed = true;
        }
        return updated;
      });
      return changed ? next : prev;
    });
  }, [customColumns]);

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

  const handleCellSelect = (cell) => {
    if (!cell) return;
    setSelectedCell(cell);
    setViewerText(cell.value ?? "");
  };

  const handleViewerChange = (event) => {
    const nextValue = event.target.value;
    setViewerText(nextValue);
    if (!selectedCell) return;
    handleNurseChange(selectedCell.rowId, selectedCell.column, nextValue);
  };

  const handleCopyViewerText = async () => {
    if (!viewerText) return;
    try {
      await navigator.clipboard.writeText(viewerText);
    } catch {
      // ignore clipboard errors
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
    const newRow = createEmptyRow(customColumns);
    setNurses((prev) => padRows([...prev, newRow], customColumns));
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
    if (active.sheet_id === "logs" || (active.name || "").toLowerCase() === "logs") {
      return;
    }
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
      setNurses(padRows([], customColumns));
      setShifts({});
      dataSheetIdRef.current = created.sheet_id;
    } catch (error) {
      const msg = error?.message || "Failed to duplicate sheet.";
      setStatus({ state: "error", message: msg });
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
      setNurses(padRows([], customColumns));
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
    setNurses((prev) => padRows([...prev, ...newRows], customColumns));
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

  const handleDeleteSelectedRows = async () => {
    const idsToDelete = selectedRowIds || [];
    if (!idsToDelete.length || !activeSheetId) return;
    markLocalUpdate();
    const selectedIdsSet = new Set(idsToDelete);
    setNurses((prev) =>
      padRows(prev.filter((nurse) => !selectedIdsSet.has(nurse.id)), customColumns)
    );
    setShifts((prev) => {
      const next = {};
      Object.entries(prev || {}).forEach(([key, value]) => {
        const [nurseId] = key.split("_");
        if (!selectedIdsSet.has(nurseId)) {
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
        body: JSON.stringify({ sheet_id: activeSheetId, nurse_ids: idsToDelete })
      });
      markServerSync(activeSheetId);
    } catch (error) {
      setStatus({ state: "error", message: "Failed to delete selected rows." });
    }
  };

  const handleAddColumn = () => {
    const label = normalizeLabel(newColumnLabel);
    if (!label) {
      setColumnError("Enter a column name.");
      return;
    }
    const baseKey = toColumnKey(label);
    if (!baseKey) {
      setColumnError("Use letters or numbers only.");
      return;
    }
    const existingKeys = new Set([
      ...BASE_COLUMN_KEYS,
      ...customColumns.map((col) => col.key)
    ]);
    let key = baseKey;
    let counter = 2;
    while (existingKeys.has(key)) {
      key = `${baseKey}_${counter}`;
      counter += 1;
    }
    const nextColumn = buildCustomColumn(key, label);
    setCustomColumns((prev) => [...prev, nextColumn]);
    setNurses((prev) =>
      prev.map((row) => (row?.[key] === undefined ? { ...row, [key]: "" } : row))
    );
    setNewColumnLabel("");
    setColumnError("");
  };


  const handleRename = async (overrideName) => {
    if (!activeSheetId) return;
    const active = sheets.find((sheet) => sheet.sheet_id === activeSheetId);
    const previousName = active?.name ?? sheetName;
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
      setSheetName(previousName);
    }
  };

  const activeSheet = sheets.find((sheet) => sheet.sheet_id === activeSheetId);

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
              <div className="page-title">Shift Monitoring - {sheetName}</div>
              <p className="page-desc">Manage weekly shift assignments.</p>
            </div>
            <div className="page-header-actions compact">
              <div className="action-dock" aria-label="Sheet actions">
                <div className="action-dock-title">Sheet Actions</div>
                <div className="action-dock-grid">
                  <button
                    className="btn btn-danger btn-xs"
                    type="button"
                    disabled={!selectedRowIds.length}
                    onClick={handleDeleteSelectedRows}
                  >
                    Delete Rows
                  </button>
                  <button
                    className="btn btn-outline btn-xs"
                    type="button"
                    onClick={() => setShowShiftManager(true)}
                  >
                    Edit Shift Types
                  </button>
                  <button
                    className="btn btn-outline btn-xs"
                    type="button"
                    onClick={handleDuplicateSheet}
                  >
                    Duplicate Sheet
                  </button>
                  <button
                    className="btn btn-outline btn-xs btn-danger-outline"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete Sheet
                  </button>
                </div>
                <div className="action-dock-add">
                  <input
                    type="text"
                    placeholder="New column"
                    value={newColumnLabel}
                    onChange={(event) => {
                      setNewColumnLabel(event.target.value);
                      if (columnError) setColumnError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddColumn();
                      }
                    }}
                  />
                  <button
                    className="btn btn-primary btn-xs"
                    type="button"
                    onClick={handleAddColumn}
                  >
                    Add Column
                  </button>
                </div>
                {columnError && <span className="action-dock-error">{columnError}</span>}
              </div>
              {status.message && (
                <span className="status-pill">{status.message}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section dashboard-section">
        <div className="container dashboard-container">
          <div className="sheet-tabs sheet-tabs--minimal">
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
          </div>

          <div className="action-bar minimal">
            <div className="action-bar-left">
              <div className="sheet-field sheet-name-field">
                <label>Sheet name</label>
                <input
                  type="text"
                  value={sheetName}
                  placeholder="Enter sheet name"
                  onChange={(event) => setSheetName(event.target.value)}
                  onBlur={(event) => handleRename(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              </div>
              <div className="sheet-field sheet-viewer-field">
                <label>Selected field</label>
                <textarea
                  className="text-viewer-input"
                  placeholder="Selected field text will appear here"
                  value={viewerText}
                  onChange={handleViewerChange}
                  rows={2}
                />
              </div>
            </div>
            <div className="action-bar-right">
              <div className="date-range">
                <label className="date-label">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="date-range">
                <label className="date-label">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
          </div>

          {shiftTypes.length > 0 && (
            <div className="shift-legend">
              <span className="shift-legend-label">Shift Legend</span>
              {shiftTypes.map((type) => (
                <span key={type} className={`shift-legend-chip ${getShiftClass(type)}`}>
                  {type}
                </span>
              ))}
            </div>
          )}

          <div className="dashboard-grid">
            <div>
              <SchedulerGrid
                columns={allColumns}
                nurses={nurses}
                dates={dates}
                shifts={shifts}
                shiftTypes={shiftTypes}
                onShiftChange={handleShiftChange}
                onBulkShiftChange={handleBulkShiftChange}
                onNurseChange={handleNurseChange}
                onBulkNurseChange={handleBulkNurseChange}
                onNurseCommit={handleNurseCommit}
                onBulkNurseCommit={handleBulkNurseCommit}
                onEnsureRows={handleEnsureRows}
                selectedRowIds={selectedRowIds}
                onToggleRow={handleToggleRow}
                selectedCellId={selectedCell?.id ?? null}
                onCellSelect={handleCellSelect}
              />
            </div>
          </div>
        </div>
      </section>

      {showShiftManager && (
        <ShiftTypeManager
          shiftTypes={shiftTypes}
          onShiftTypesChange={(next) => setShiftTypes(next)}
          onClose={() => setShowShiftManager(false)}
        />
      )}

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
