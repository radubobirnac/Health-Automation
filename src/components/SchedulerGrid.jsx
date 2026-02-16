import { useMemo } from "react";

const LEFT_COLUMNS = [
  { key: "locum_name", label: "Locum Name", className: "col-locum" },
  { key: "client", label: "Client", className: "col-client" },
  { key: "search_firstname", label: "Search with firstname", className: "col-search" },
  { key: "specialty", label: "Specialty", className: "col-specialty" },
  { key: "keyword", label: "Book based on keyword", className: "col-keyword" },
  { key: "gender", label: "Gender", className: "col-gender" },
  { key: "time", label: "Time", className: "col-time" }
];

const formatDateLabel = (date) =>
  date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });

const formatWeekday = (date) =>
  date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();

export default function SchedulerGrid({
  nurses,
  dates,
  shifts,
  shiftTypes,
  onShiftChange,
  onBulkShiftChange,
  onNurseChange,
  onBulkNurseChange
}) {
  const dateKeys = useMemo(
    () => dates.map((date) => date.toISOString().slice(0, 10)),
    [dates]
  );
  const handlePaste = (nurseId, dateKey, rowIndex, text) => {
    if (!onBulkShiftChange) return;
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    if (lines.length === 0) return;
    const startIndex = dateKeys.indexOf(dateKey);
    if (startIndex === -1) return;
    const updates = [];
    lines.forEach((line, rowOffset) => {
      const values = line.split("\t");
      values.forEach((value, colOffset) => {
        const targetDate = dateKeys[startIndex + colOffset];
        if (!targetDate) return;
        updates.push({
          nurseId: nurses[rowIndex + rowOffset]?.id ?? nurseId,
          dateKey: targetDate,
          shift: value.trim()
        });
      });
    });
    onBulkShiftChange(updates);
  };

  const handleLeftPaste = (rowIndex, colIndex, text) => {
    if (!onBulkNurseChange) return;
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    if (lines.length === 0) return;
    const updates = [];
    lines.forEach((line, rowOffset) => {
      const values = line.split("\t");
      values.forEach((value, colOffset) => {
        const column = LEFT_COLUMNS[colIndex + colOffset];
        if (!column) return;
        updates.push({
          rowIndex: rowIndex + rowOffset,
          key: column.key,
          value: value.trim()
        });
      });
    });
    onBulkNurseChange(updates);
  };

  return (
    <div className="scheduler-card">
      <div className="scheduler-table-wrapper">
        <table className="scheduler-table">
          <thead>
            <tr>
              {LEFT_COLUMNS.map((col) => (
                <th key={col.key} className={`sticky-col ${col.className}`}>
                  {col.label}
                </th>
              ))}
              {dates.map((date) => (
                <th key={`weekday-${date.toISOString()}`} className="date-col weekday-header">
                  {formatWeekday(date)}
                </th>
              ))}
            </tr>
            <tr>
              {LEFT_COLUMNS.map((col) => (
                <th key={`${col.key}-spacer`} className={`sticky-col ${col.className}`}>
                  <span className="header-spacer" />
                </th>
              ))}
              {dates.map((date) => (
                <th key={`date-${date.toISOString()}`} className="date-col date-header">
                  {formatDateLabel(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nurses.map((nurse, rowIndex) => (
              <tr key={nurse.id}>
                {LEFT_COLUMNS.map((col, colIndex) => (
                  <td key={`${nurse.id}-${col.key}`} className={`sticky-col ${col.className}`}>
                    <input
                      type="text"
                      value={nurse[col.key] ?? ""}
                      onChange={(event) =>
                        onNurseChange?.(nurse.id, col.key, event.target.value)
                      }
                      onPaste={(event) => {
                        const pasteText = event.clipboardData.getData("text");
                        if (pasteText.includes("\n") || pasteText.includes("\t")) {
                          event.preventDefault();
                          handleLeftPaste(rowIndex, colIndex, pasteText);
                        }
                      }}
                    />
                  </td>
                ))}
                {dateKeys.map((dateKey) => {
                  const cellKey = `${nurse.id}_${dateKey}`;
                  const shiftValue = shifts[cellKey] || "";

                  return (
                    <td
                      key={cellKey}
                      className="date-col"
                      onPaste={(event) => {
                        const pasteText = event.clipboardData.getData("text");
                        if (pasteText.includes("\n") || pasteText.includes("\t")) {
                          event.preventDefault();
                          handlePaste(nurse.id, dateKey, rowIndex, pasteText);
                        }
                      }}
                    >
                      <div className="cell-stack">
                        <select
                          value={shiftValue}
                          onChange={(event) =>
                            onShiftChange(nurse.id, dateKey, event.target.value)
                          }
                          onPaste={(event) => {
                            const pasteText = event.clipboardData.getData("text");
                            if (pasteText.includes("\n") || pasteText.includes("\t")) {
                              event.preventDefault();
                              handlePaste(nurse.id, dateKey, rowIndex, pasteText);
                            }
                          }}
                        >
                          <option value="">-</option>
                          {shiftTypes.map((shift) => (
                            <option key={shift} value={shift}>
                              {shift}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
