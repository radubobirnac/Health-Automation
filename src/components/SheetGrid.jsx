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

export default function SheetGrid({ columns, rows, onRowsChange }) {
  const handleChange = (rowIndex, key, value) => {
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

  return (
    <div className="sheet-card">
      <div className="sheet-actions">
        <button className="btn btn-outline" type="button" onClick={handleAddRow}>
          Add row
        </button>
        <span className="sheet-meta">Live validation enabled</span>
      </div>
      <div className="sheet-table-wrapper">
        <table className="sheet-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row["Cell Reference"] || "row"}`}>
                {columns.map((column, colIndex) => {
                  return (
                    <td key={column}>
                      <input
                        className={isInvalid(row, column) ? "cell-invalid" : ""}
                        type="text"
                        value={row[column] ?? ""}
                        onChange={(event) =>
                          handleChange(rowIndex, column, event.target.value)
                        }
                        onPaste={(event) => {
                          const pasteText = event.clipboardData.getData("text");
                          if (pasteText.includes("\n") || pasteText.includes("\t")) {
                            event.preventDefault();
                            handlePaste(rowIndex, colIndex, pasteText);
                          }
                        }}
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
