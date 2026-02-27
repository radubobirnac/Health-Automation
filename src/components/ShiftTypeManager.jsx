import { useState } from "react";
import { authedFetch } from "../utils/api.js";

export default function ShiftTypeManager({ shiftTypes, onShiftTypesChange, onClose }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const normalize = (v) => v.trim().toUpperCase();

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditValue(shiftTypes[index]);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
    setError("");
  };

  const handleSaveEdit = async (oldName) => {
    const next = normalize(editValue);
    if (!next) { setError("Name cannot be empty."); return; }
    if (next.length > 6) { setError("Max 6 characters."); return; }
    if (next === oldName) { handleCancelEdit(); return; }
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/shift-types/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: oldName, new_name: next })
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload?.error || "Failed to rename."); return; }
      onShiftTypesChange(payload.shiftTypes);
      setEditingIndex(null);
      setEditValue("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (name) => {
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/shift-types/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload?.error || "Failed to delete."); return; }
      onShiftTypesChange(payload.shiftTypes);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async () => {
    const next = normalize(newValue);
    if (!next) { setError("Name cannot be empty."); return; }
    if (next.length > 6) { setError("Max 6 characters."); return; }
    setBusy(true);
    setError("");
    try {
      const res = await authedFetch("/shift-types/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_name: next })
      });
      const payload = await res.json();
      if (!res.ok) { setError(payload?.error || "Failed to add."); return; }
      onShiftTypesChange(payload.shiftTypes);
      setNewValue("");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ minWidth: "320px" }}>
        <div className="modal-header">
          <h3>Manage Shift Types</h3>
          <button className="modal-close" type="button" onClick={onClose}>✕</button>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
          {shiftTypes.map((type, index) => (
            <li
              key={type}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid var(--gray-200)" }}
            >
              {editingIndex === index ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    maxLength={6}
                    autoFocus
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(type);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    style={{ width: "80px", padding: "2px 6px" }}
                  />
                  <button className="btn btn-primary" type="button" disabled={busy} onClick={() => handleSaveEdit(type)} style={{ padding: "2px 10px", fontSize: "0.8rem" }}>Save</button>
                  <button className="btn btn-outline" type="button" onClick={handleCancelEdit} style={{ padding: "2px 10px", fontSize: "0.8rem" }}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: "0.9rem" }}>{type}</span>
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartEdit(index)}
                    aria-label={`Rename ${type}`}
                    style={{ padding: "2px 10px", fontSize: "0.8rem" }}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(type)}
                    aria-label={`Delete ${type}`}
                    style={{ padding: "2px 10px", fontSize: "0.8rem" }}
                  >
                    ✕
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="New type, e.g. AD"
            value={newValue}
            maxLength={6}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="button" disabled={busy} onClick={handleAdd}>
            Add
          </button>
        </div>

        {error && (
          <p className="form-note" style={{ color: "var(--red-500)", marginTop: "8px" }} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
