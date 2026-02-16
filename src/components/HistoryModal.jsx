export default function HistoryModal({ isOpen, onClose, title, history, loading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">
          {loading && <p className="form-note">Loading history...</p>}
          {!loading && history.length === 0 && (
            <p className="form-note">No edits recorded for this cell.</p>
          )}
          {!loading && history.length > 0 && (
            <ol className="history-list">
              {history.map((entry, idx) => (
                <li key={`${entry.updated_at}-${idx}`}>
                  <div className="history-main">
                    <strong>
                      {entry.old_value || "-"} → {entry.new_value || "-"}
                    </strong>
                  </div>
                  <div className="history-meta">
                    Updated by: {entry.updated_by} ·{" "}
                    {new Date(entry.updated_at).toLocaleString("en-GB")}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
