const REQUIRED_FIELDS = ["Nurse Name", "Hospital", "Band"];

const TIME_FIELDS = [
  ["Start Time Range Start", "Start Time Range End"],
  ["End Time Range Start", "End Time Range End"]
];

const parseTime = (value) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  if (hours === undefined || minutes === undefined) return null;
  return Number(hours) * 60 + Number(minutes);
};

export default function SheetGrid({
  columns,
  rows,
  onRowsChange,
  showControls = true,
  variant = "",
  readOnly = false,
  selectedCellId = null,
  onCellSelect,
  tableWrapperClassName = "",
  enableSelection = false,
  selectedRowIds = [],
  onToggleRow
}) {
  const handleChange = (rowIndex, key, value) => {
    if (readOnly || typeof onRowsChange !== "function") return;
    const next = rows.map((row, idx) =>
      idx === rowIndex ? { ...row, [key]: value } : row
    );
    onRowsChange(next);
  };


  const isInvalid = (row, key) => {
    if (REQUIRED_FIELDS.includes(key)) {
      return !row[key];
    }

    for (const [startKey, endKey] of TIME_FIELDS) {
      if (key === startKey || key === endKey) {
        const start = parseTime(row[startKey]);
        const end = parseTime(row[endKey]);
        if (start === null || end === null) {
          return false;
        }
        return start >= end;
      }
    }

    return false;
  };

  const handleAddRow = () => {
    if (readOnly || typeof onRowsChange !== "function") return;
    const newRow = columns.reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {});
    onRowsChange([...rows, newRow]);
  };

  const ensureRowCount = (targetCount) => {
    if (rows.length >= targetCount) {
      return rows;
    }
    const nextRows = [...rows];
    while (nextRows.length < targetCount) {
      const newRow = columns.reduce((acc, key) => {
        acc[key] = "";
        return acc;
      }, {});
      nextRows.push(newRow);
    }
    return nextRows;
  };

  const handlePaste = (rowIndex, colIndex, text) => {
    if (readOnly || typeof onRowsChange !== "function") return;
    const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.length);
    if (lines.length === 0) return;

    const grid = ensureRowCount(rowIndex + lines.length);
    const nextRows = grid.map((row) => ({ ...row }));

    lines.forEach((line, lineOffset) => {
      const values = line.split("\t");
      values.forEach((value, valueOffset) => {
        const targetCol = columns[colIndex + valueOffset];
        if (!targetCol) return;
        nextRows[rowIndex + lineOffset][targetCol] = value;
      });
    });

    onRowsChange(nextRows);
  };

  const cardClassName = variant ? `sheet-card sheet-card--${variant}` : "sheet-card";

  const isSelected = (rowId) => selectedRowIds.includes(rowId);

  return (
    <div className={cardClassName}>
      {showControls && !readOnly && (
        <div className="sheet-actions">
          <button className="btn btn-outline" type="button" onClick={handleAddRow}>
            Add row
          </button>
          <span className="sheet-meta">Live validation enabled</span>
        </div>
      )}
      <div className={`sheet-table-wrapper${tableWrapperClassName ? ` ${tableWrapperClassName}` : ""}`}>
        <table className="sheet-table">
          <thead>
            <tr>
              {enableSelection && <th className="sheet-select-col">Select</th>}
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row["Cell Reference"] || "row"}`}>
                {enableSelection && (
                  <td className="sheet-select-col">
                    <input
                      type="checkbox"
                      checked={row?.id ? isSelected(row.id) : false}
                      onChange={() => {
                        if (!row?.id || !onToggleRow) return;
                        onToggleRow(row.id);
                      }}
                      aria-label="Select row"
                    />
                  </td>
                )}
                {columns.map((column, colIndex) => {
                  return (
                    <td key={column}>
                      <input
                        className={isInvalid(row, column) ? "cell-invalid" : ""}
                        type="text"
                        value={row[column] ?? ""}
                        readOnly={readOnly}
                        onChange={(event) =>
                          handleChange(rowIndex, column, event.target.value)
                        }
                        onClick={() => {
                          if (!onCellSelect) return;
                          const rowId = row?.id ?? `row-${rowIndex}`;
                          onCellSelect({
                            id: `${rowId}::${column}`,
                            rowId,
                            column,
                            value: row[column] ?? ""
                          });
                        }}
                        onFocus={() => {
                          if (!onCellSelect) return;
                          const rowId = row?.id ?? `row-${rowIndex}`;
                          onCellSelect({
                            id: `${rowId}::${column}`,
                            rowId,
                            column,
                            value: row[column] ?? ""
                          });
                        }}
                        onPaste={(event) => {
                          if (readOnly) return;
                          const pasteText = event.clipboardData.getData("text");
                          if (pasteText.includes("\n") || pasteText.includes("\t")) {
                            event.preventDefault();
                            handlePaste(rowIndex, colIndex, pasteText);
                          }
                        }}
                        data-selected={
                          selectedCellId === `${row?.id ?? `row-${rowIndex}`}::${column}`
                        }
                      />
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
