import fs from "node:fs";
import path from "node:path";

const createId = () => `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const DB_PATH = path.resolve("scripts", "data", "db.json");
const DEFAULT_USER_ID = "default";

const ensureDbFile = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      users: {
        [DEFAULT_USER_ID]: createUserSeed()
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), "utf-8");
  }
};

const migrateLegacyDb = (raw) => {
  if (raw?.users) return raw;
  return {
    users: {
      [DEFAULT_USER_ID]: {
        sheets: Array.isArray(raw?.sheets) ? raw.sheets : clone(DEFAULT_SHEETS),
        nursesBySheet: raw?.nursesBySheet || { "sheet-main": clone(DEFAULT_NURSES) },
        shiftsBySheet: raw?.shiftsBySheet || { "sheet-main": clone(DEFAULT_SHIFTS) }
      }
    }
  };
};

const createLogsSheet = () => ({
  sheet_id: "logs",
  name: "Logs",
  client_name: "",
  created_at: new Date().toISOString()
});

const createUserSeed = () => {
  const seed = {
    sheets: clone(DEFAULT_SHEETS),
    nursesBySheet: {
      "sheet-main": clone(DEFAULT_NURSES)
    },
    shiftsBySheet: {
      "sheet-main": clone(DEFAULT_SHIFTS)
    }
  };
  if (!seed.sheets.some((sheet) => sheet.sheet_id === "logs")) {
    seed.sheets.push(createLogsSheet());
  }
  seed.nursesBySheet.logs = seed.nursesBySheet.logs || [];
  seed.shiftsBySheet.logs = seed.shiftsBySheet.logs || [];
  return seed;
};

const loadDb = () => {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = raw ? JSON.parse(raw) : {};
    return migrateLegacyDb(parsed);
  } catch (error) {
    return {
      users: {
        [DEFAULT_USER_ID]: createUserSeed()
      }
    };
  }
};

const saveDb = (db) => {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
};

const getDb = () => {
  if (!globalThis.__HR_DB__) {
    globalThis.__HR_DB__ = loadDb();
  }
  return globalThis.__HR_DB__;
};

const normalizeName = (value) => (value || "").trim();

const betweenDates = (date, start, end) => date >= start && date <= end;

const response = (status, payload, extraHeaders = {}) => ({
  status,
  headers: {
    "Content-Type": "application/json",
    ...extraHeaders
  },
  body: JSON.stringify(payload)
});

export const stripBase = (path, base) => {
  if (path.startsWith(base)) {
    const sliced = path.slice(base.length);
    return sliced.length ? sliced : "/";
  }
  return path;
};

export const handleApiRequest = ({ method, path, query = {}, body }) => {
  const db = getDb();
  const upperMethod = (method || "GET").toUpperCase();

  const getUserId = () => normalizeName(body?.user_id || query?.user_id);

  const getUserDb = (userId) => {
    if (!db.users) {
      db.users = {};
    }
    if (!db.users[userId]) {
      db.users[userId] = createUserSeed();
      saveDb(db);
    }
    return db.users[userId];
  };

  const ensureLogsSheet = (userDb) => {
    const exists = userDb.sheets.some(
      (sheet) => (sheet.name || "").toLowerCase() === "logs" || sheet.sheet_id === "logs"
    );
    if (!exists) {
      userDb.sheets.push(createLogsSheet());
    }
    if (!userDb.nursesBySheet.logs) {
      userDb.nursesBySheet.logs = [];
    }
    if (!userDb.shiftsBySheet.logs) {
      userDb.shiftsBySheet.logs = [];
    }
  };

  if (upperMethod === "OPTIONS") {
    return response(
      204,
      {},
      {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      }
    );
  }

  if (upperMethod === "GET" && path === "/sheets") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    ensureLogsSheet(userDb);
    saveDb(db);
    return response(200, { sheets: userDb.sheets });
  }

  if (upperMethod === "POST" && path === "/sheets/create") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const name = normalizeName(body?.name);
    if (!name) {
      return response(400, { error: "Sheet name is required." });
    }
    const sheet = {
      sheet_id: createId(),
      name,
      client_name: body?.client_name || "",
      created_at: new Date().toISOString()
    };
    userDb.sheets.push(sheet);
    userDb.nursesBySheet[sheet.sheet_id] = [];
    userDb.shiftsBySheet[sheet.sheet_id] = [];
    saveDb(db);
    return response(200, { sheet });
  }

  if (upperMethod === "POST" && path === "/sheets/duplicate") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const sourceId = body?.sheet_id;
    const source = userDb.sheets.find((sheet) => sheet.sheet_id === sourceId);
    if (!source) {
      return response(404, { error: "Sheet not found." });
    }
    const sheet = {
      ...clone(source),
      sheet_id: createId(),
      name: `${source.name} (Copy)`,
      created_at: new Date().toISOString()
    };
    userDb.sheets.push(sheet);
    userDb.nursesBySheet[sheet.sheet_id] = clone(userDb.nursesBySheet[sourceId] || []);
    userDb.shiftsBySheet[sheet.sheet_id] = clone(userDb.shiftsBySheet[sourceId] || []);
    saveDb(db);
    return response(200, { sheet });
  }

  if (upperMethod === "POST" && path === "/sheets/rename") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const name = normalizeName(body?.name);
    if (!body?.sheet_id || !name) {
      return response(400, { error: "Sheet id and name are required." });
    }
    const target = userDb.sheets.find((sheet) => sheet.sheet_id === body.sheet_id);
    if (!target) {
      return response(404, { error: "Sheet not found." });
    }
    target.name = name;
    saveDb(db);
    return response(200, { sheet_id: target.sheet_id, name: target.name });
  }

  if (upperMethod === "GET" && path === "/schedule") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const sheetId = query.sheet_id;
    const start = query.start;
    const end = query.end;
    if (!sheetId || !start || !end) {
      return response(400, { error: "Missing sheet_id, start, or end." });
    }
    const sheet = userDb.sheets.find((item) => item.sheet_id === sheetId);
    if (!sheet) {
      return response(404, { error: "Sheet not found." });
    }
    const nurses = userDb.nursesBySheet[sheetId] || [];
    const shifts = (userDb.shiftsBySheet[sheetId] || []).filter((shift) =>
      betweenDates(shift.date, start, end)
    );
    return response(200, { sheet, nurses, shifts });
  }

  if (upperMethod === "POST" && path === "/nurses/upsert") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const sheetId = body?.sheet_id;
    const rows = body?.nurses || (body?.nurse ? [body.nurse] : []);
    if (!sheetId || rows.length === 0) {
      return response(400, { error: "Sheet id and nurses are required." });
    }
    const list = userDb.nursesBySheet[sheetId] || [];
    rows.forEach((row) => {
      if (!row?.id) {
        row.id = createId();
      }
      const index = list.findIndex((nurse) => nurse.id === row.id);
      if (index >= 0) {
        list[index] = { ...list[index], ...row };
      } else {
        list.push({ ...row });
      }
    });
    userDb.nursesBySheet[sheetId] = list;
    saveDb(db);
    return response(200, { ok: true, nurses: rows });
  }

  if (upperMethod === "POST" && path === "/nurses/delete") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const sheetId = body?.sheet_id;
    const nurseIds = body?.nurse_ids || [];
    if (!sheetId || nurseIds.length === 0) {
      return response(400, { error: "Sheet id and nurse ids are required." });
    }
    userDb.nursesBySheet[sheetId] = (userDb.nursesBySheet[sheetId] || []).filter(
      (nurse) => !nurseIds.includes(nurse.id)
    );
    userDb.shiftsBySheet[sheetId] = (userDb.shiftsBySheet[sheetId] || []).filter(
      (shift) => !nurseIds.includes(shift.nurse_id)
    );
    saveDb(db);
    return response(200, { ok: true });
  }

  if (upperMethod === "POST" && path === "/schedule/update") {
    const userId = getUserId();
    if (!userId) {
      return response(400, { error: "Missing user_id." });
    }
    const userDb = getUserDb(userId);
    const sheetId = body?.sheet_id;
    const nurseId = body?.nurse_id;
    const date = body?.date;
    const shift = body?.shift;
    if (!sheetId || !nurseId || !date) {
      return response(400, { error: "Missing sheet_id, nurse_id, or date." });
    }
    const current = userDb.shiftsBySheet[sheetId] || [];
    const existingIndex = current.findIndex(
      (item) => item.nurse_id === nurseId && item.date === date
    );
    const trimmedShift = normalizeName(shift);
    if (!trimmedShift) {
      if (existingIndex >= 0) {
        current.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      current[existingIndex].shift = trimmedShift;
    } else {
      current.push({ nurse_id: nurseId, date, shift: trimmedShift });
    }
    userDb.shiftsBySheet[sheetId] = current;
    saveDb(db);
    return response(200, { ok: true });
  }

  return response(404, { error: "Not found." });
};

export const createViteMiddleware = () => {
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const path = url.pathname;

    if (
      !(
        path.startsWith("/sheets") ||
        path.startsWith("/schedule") ||
        path.startsWith("/nurses")
      )
    ) {
      next();
      return;
    }

    let body = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString("utf-8");
      body = raw ? JSON.parse(raw) : null;
    }

    const result = handleApiRequest({
      method: req.method,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      body
    });

    res.statusCode = result.status;
    Object.entries(result.headers || {}).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.end(result.body);
  };
};
const DEFAULT_SHEETS = [
  {
    sheet_id: "sheet-main",
    name: "Main Schedule",
    client_name: "Central Trust",
    created_at: "2026-02-01T09:00:00Z"
  }
];

const DEFAULT_NURSES = [
  {
    id: "nurse-1",
    locum_name: "Amelia Grant",
    client: "Central Trust",
    search_firstname: "Amelia",
    specialty: "ICU",
    keyword: "ICU",
    gender: "F",
    time: "Day"
  },
  {
    id: "nurse-2",
    locum_name: "James Patel",
    client: "Central Trust",
    search_firstname: "James",
    specialty: "A&E",
    keyword: "A&E",
    gender: "M",
    time: "Night"
  },
  {
    id: "nurse-3",
    locum_name: "Nadia Khan",
    client: "Central Trust",
    search_firstname: "Nadia",
    specialty: "Surgery",
    keyword: "Surg",
    gender: "F",
    time: "Late"
  }
];

const DEFAULT_SHIFTS = [
  { nurse_id: "nurse-1", date: "2026-02-17", shift: "LD" },
  { nurse_id: "nurse-2", date: "2026-02-18", shift: "N" },
  { nurse_id: "nurse-3", date: "2026-02-19", shift: "E" }
];
