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
  onBulkNurseChange,
  selectedRowIds,
  onToggleRow,
  onToggleAllRows,
  onNurseCommit,
  onBulkNurseCommit,
  onEnsureRows
}) {
  const dateKeys = useMemo(
    () => dates.map((date) => date.toISOString().slice(0, 10)),
    [dates]
  );
  const selectedRowIndexSet = useMemo(() => new Set(selectedRowIds ?? []), [selectedRowIds]);
  const selectedRowIndices = useMemo(() => {
    if (!selectedRowIds?.length) return [];
    const indices = [];
    nurses.forEach((nurse, index) => {
      if (selectedRowIndexSet.has(nurse.id)) {
        indices.push(index);
      }
    });
    return indices;
  }, [nurses, selectedRowIds, selectedRowIndexSet]);

  const normalizeClipboardRows = (text) => {
    const raw = text.replace(/\r/g, "").split("\n");
    while (raw.length > 0 && raw[raw.length - 1] === "") {
      raw.pop();
    }
    return raw;
  };

  const createEmptyRow = (id) =>
    LEFT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: "" }), { id });

  const prepareRowTargets = (targetRowIndices) => {
    const rowIdByIndex = new Map();
    if (!targetRowIndices.length) return rowIdByIndex;
    const maxIndex = Math.max(...targetRowIndices);
    const newRows = [];
    for (let index = 0; index <= maxIndex; index += 1) {
      const existing = nurses[index];
      if (existing?.id) {
        rowIdByIndex.set(index, existing.id);
        continue;
      }
      const newId = `temp-${Date.now()}-${index}`;
      rowIdByIndex.set(index, newId);
      if (index >= nurses.length) {
        newRows.push(createEmptyRow(newId));
      }
    }
    if (newRows.length && onEnsureRows) {
      onEnsureRows(newRows);
    }
    return rowIdByIndex;
  };

  const getTargetRowIndices = (rowCount, startIndex) => {
    if (!selectedRowIndices.length) {
      return Array.from({ length: rowCount }, (_, offset) => startIndex + offset);
    }
    const ordered = [...selectedRowIndices].sort((a, b) => a - b);
    if (ordered.length >= rowCount) {
      return ordered.slice(0, rowCount);
    }
    const lastIndex = ordered.length ? ordered[ordered.length - 1] : startIndex;
    const extras = Array.from(
      { length: rowCount - ordered.length },
      (_, offset) => lastIndex + offset + 1
    );
    return [...ordered, ...extras];
  };

  const handleRowPaste = (rowIndex, text) => {
    if (!onBulkNurseChange && !onBulkShiftChange) return;
    const rows = normalizeClipboardRows(text);
    if (!rows.length) return;
    const rowMatrix = rows.map((row) => row.split("\t"));
    const targetRowIndices = getTargetRowIndices(rowMatrix.length, rowIndex);
    const rowIdByIndex = prepareRowTargets(targetRowIndices);

    const nurseUpdates = [];
    const nurseAffected = new Set();
    const shiftUpdates = [];

    rowMatrix.forEach((values, rowOffset) => {
      const targetRowIndex = targetRowIndices[rowOffset];
      const nurseId = rowIdByIndex.get(targetRowIndex);
      values.forEach((value, colOffset) => {
        if (colOffset < LEFT_COLUMNS.length) {
          const column = LEFT_COLUMNS[colOffset];
          if (!column) return;
          nurseUpdates.push({
            rowIndex: targetRowIndex,
            key: column.key,
            value: value.trim()
          });
          nurseAffected.add(targetRowIndex);
          return;
        }
        const dateKey = dateKeys[colOffset - LEFT_COLUMNS.length];
        if (!dateKey) return;
        if (!nurseId) return;
        shiftUpdates.push({
          nurseId,
          dateKey,
          shift: value.trim()
        });
      });
    });

    if (nurseUpdates.length && onBulkNurseChange) {
      onBulkNurseChange(nurseUpdates);
      if (onBulkNurseCommit) {
        onBulkNurseCommit({ updates: nurseUpdates, rowIndices: Array.from(nurseAffected) });
      }
    }
    if (shiftUpdates.length && onBulkShiftChange) {
      onBulkShiftChange(shiftUpdates);
    }
  };

  const handlePaste = (nurseId, dateKey, rowIndex, text) => {
    if (!onBulkShiftChange) return;
    if (selectedRowIds?.length) {
      handleRowPaste(rowIndex, text);
      return;
    }
    const rows = normalizeClipboardRows(text);
    if (!rows.length) return;
    const startIndex = dateKeys.indexOf(dateKey);
    if (startIndex === -1) return;
    const rowMatrix = rows.map((row) => row.split("\t"));
    const targetRowIndices = getTargetRowIndices(rowMatrix.length, rowIndex);
    const rowIdByIndex = prepareRowTargets(targetRowIndices);
    const updates = [];
    rowMatrix.forEach((values, rowOffset) => {
      const targetRowIndex = targetRowIndices[rowOffset];
      const targetId = rowIdByIndex.get(targetRowIndex) ?? nurseId;
      values.forEach((value, colOffset) => {
        const targetDate = dateKeys[startIndex + colOffset];
        if (!targetDate) return;
        updates.push({
          nurseId: targetId,
          dateKey: targetDate,
          shift: value.trim()
        });
      });
    });
    onBulkShiftChange(updates);
  };

  const handleLeftPaste = (rowIndex, colIndex, text) => {
    if (!onBulkNurseChange) return;
    if (selectedRowIds?.length) {
      handleRowPaste(rowIndex, text);
      return;
    }
    const rows = normalizeClipboardRows(text);
    if (!rows.length) return;
    const rowMatrix = rows.map((row) => row.split("\t"));
    const targetRowIndices = getTargetRowIndices(rowMatrix.length, rowIndex);
    prepareRowTargets(targetRowIndices);
    const updates = [];
    const affectedRows = new Set();
    rowMatrix.forEach((values, rowOffset) => {
      const targetRowIndex = targetRowIndices[rowOffset];
      values.forEach((value, colOffset) => {
        const column = LEFT_COLUMNS[colIndex + colOffset];
        if (!column) return;
        updates.push({
          rowIndex: targetRowIndex,
          key: column.key,
          value: value.trim()
        });
        affectedRows.add(targetRowIndex);
      });
    });
    onBulkNurseChange(updates);
    if (onBulkNurseCommit) {
      onBulkNurseCommit({ updates, rowIndices: Array.from(affectedRows) });
    }
  };

  return (
    <div className="scheduler-card">
      <div
        className="scheduler-table-wrapper"
        onCopy={(event) => {
          if (!selectedRowIds?.length) return;
          const rowsToCopy = nurses.filter((nurse) => selectedRowIndexSet.has(nurse.id));
          if (!rowsToCopy.length) return;
          const text = rowsToCopy
            .map((nurse) => {
              const leftValues = LEFT_COLUMNS.map((col) => nurse[col.key] ?? "");
              const shiftValues = dateKeys.map(
                (dateKey) => shifts[`${nurse.id}_${dateKey}`] ?? ""
              );
              return [...leftValues, ...shiftValues].join("\t");
            })
            .join("\n");
          event.preventDefault();
          event.clipboardData.setData("text/plain", text);
          event.clipboardData.setData("text", text);
        }}
      >
        <div className="scheduler-table-layout">
          <div className="scheduler-table-fixed">
            <table className="scheduler-table scheduler-table-fixed">
              <thead>
                <tr>
                  <th className="col-select header-cell">
                    <input
                      type="checkbox"
                      checked={nurses.length > 0 && selectedRowIds?.length === nurses.length}
                      onChange={() => onToggleAllRows?.()}
                      aria-label="Select all rows"
                    />
                  </th>
                  {LEFT_COLUMNS.map((col) => (
                    <th key={col.key} className={`${col.className} header-cell`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nurses.map((nurse, rowIndex) => {
                  const rowClass = selectedRowIndexSet.has(nurse.id)
                    ? "row-selected"
                    : undefined;
                  return (
                    <tr key={nurse.id} className={rowClass}>
                      <td className="col-select">
                        <input
                          type="checkbox"
                          checked={selectedRowIds?.includes(nurse.id) ?? false}
                          onChange={() => onToggleRow?.(nurse.id)}
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                      {LEFT_COLUMNS.map((col, colIndex) => (
                        <td key={`${nurse.id}-${col.key}`} className={col.className}>
                          <input
                            type="text"
                            value={nurse[col.key] ?? ""}
                            onChange={(event) =>
                              onNurseChange?.(nurse.id, col.key, event.target.value)
                            }
                            onBlur={() => onNurseCommit?.(nurse)}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="scheduler-table-scroll">
            <table className="scheduler-table scheduler-table-dates">
              <thead>
                <tr>
                  {dates.map((date) => (
                    <th key={`date-${date.toISOString()}`} className="date-col header-cell">
                      <div className="date-header-stack">
                        <span className="weekday-header">{formatWeekday(date)}</span>
                        <span className="date-header">{formatDateLabel(date)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nurses.map((nurse, rowIndex) => {
                  const rowClass = selectedRowIndexSet.has(nurse.id)
                    ? "row-selected"
                    : undefined;
                  return (
                    <tr key={`${nurse.id}-dates`} className={rowClass}>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
