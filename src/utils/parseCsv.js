export function parseCsv(text) {
  const rows = [];
  let current = "";
  let inQuotes = false;
  let row = [];

  const pushValue = () => {
    row.push(current);
    current = "";
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === "," || char === "\n")) {
      pushValue();
      if (char === "\n") {
        rows.push(row);
        row = [];
      }
      continue;
    }

    if (char === "\r") {
      continue;
    }

    current += char;
  }

  pushValue();
  if (row.length > 1 || row[0] !== "") {
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((value) => value.trim());
  return rows.slice(1).filter((r) => r.length > 1).map((values) => {
    const record = {};
    header.forEach((key, idx) => {
      record[key] = values[idx] ?? "";
    });
    return record;
  });
}
