import { useEffect, useRef } from "react";

export default function HistoryModal({ isOpen, onClose, title, history, loading }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement;
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActive instanceof HTMLElement) {
        previousActive.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = "history-modal-title";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="modal-card" ref={modalRef}>
        <div className="modal-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} ref={closeRef}>
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
