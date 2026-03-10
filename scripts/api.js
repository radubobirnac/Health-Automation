import { firestore } from "./firebase-admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const createId = () => `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const clone = (value) => JSON.parse(JSON.stringify(value));

const createLogsSheet = () => ({
  sheet_id: "logs",
  name: "Logs",
  client_name: "",
  created_at: new Date().toISOString()
});

const DEFAULT_SHIFT_TYPES = ["LD", "E", "N", "AE"];
const BOOKED_PREFIX = "B-";

const normalizeShiftType = (value) => (value || "").trim().toUpperCase();

const ensureBookedShiftTypes = (types = []) => {
  const ordered = [];
  const seen = new Set();

  const add = (value) => {
    const normalized = normalizeShiftType(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  };

  types.forEach((type) => {
    const normalized = normalizeShiftType(type);
    if (!normalized) return;
    if (normalized.startsWith(BOOKED_PREFIX)) {
      add(normalized);
      return;
    }
    add(normalized);
    add(`${BOOKED_PREFIX}${normalized}`);
  });

  return ordered;
};

const createUserSeed = (clientName = "") => {
  const seed = {
    sheets: clone(DEFAULT_SHEETS),
    nursesBySheet: {
      "sheet-main": clone(DEFAULT_NURSES)
    },
    shiftsBySheet: {
      "sheet-main": clone(DEFAULT_SHIFTS)
    },
    shiftTypes: ensureBookedShiftTypes(clone(DEFAULT_SHIFT_TYPES)),
    dataRows: []
  };
  if (!seed.sheets.some((sheet) => sheet.sheet_id === "logs")) {
    seed.sheets.push(createLogsSheet());
  }
  if (clientName) {
    seed.sheets = seed.sheets.map((sheet) =>
      sheet.sheet_id === "sheet-main"
        ? { ...sheet, client_name: clientName }
        : sheet
    );
    if (seed.nursesBySheet["sheet-main"]) {
      seed.nursesBySheet["sheet-main"] = seed.nursesBySheet["sheet-main"].map((nurse) => ({
        ...nurse,
        client: clientName
      }));
    }
  }
  seed.nursesBySheet.logs = seed.nursesBySheet.logs || [];
  seed.shiftsBySheet.logs = seed.shiftsBySheet.logs || [];
  seed.dataRows = seed.dataRows || [];
  return seed;
};

const AUTH_COLLECTION = "auth_users";

const getUserDoc = (userId) => firestore.collection("users").doc(userId);

const getAuthDoc = (username) =>
  firestore.collection(AUTH_COLLECTION).doc(normalizeName(username).toLowerCase());

const getAuthUser = async (username) => {
  const doc = await getAuthDoc(username).get();
  if (!doc.exists) return null;
  return doc.data();
};

const anyAdminExists = async () => {
  const snapshot = await firestore
    .collection(AUTH_COLLECTION)
    .where("role", "==", "admin")
    .limit(1)
    .get();
  return !snapshot.empty;
};

const loadUserDb = async (userId) => {
  const doc = await getUserDoc(userId).get();
  if (doc.exists) {
    const data = doc.data();
    data.dataRows = data.dataRows || [];
    data.shiftTypes = ensureBookedShiftTypes(
      data.shiftTypes?.length ? data.shiftTypes : clone(DEFAULT_SHIFT_TYPES)
    );
    return data;
  }
  const seed = createUserSeed();
  await getUserDoc(userId).set(seed);
  return seed;
};

const saveUserDb = async (userId, data) => {
  await getUserDoc(userId).set(data);
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

const getHeaderValue = (headers, name) => {
  if (!headers) return "";
  const match = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return match ? headers[match] : "";
};

const getIngestSecret = () =>
  normalizeName(process.env.API_INGEST_SECRET || process.env.API_SECRET);

const requireIngestSecret = (headers) => {
  const expected = getIngestSecret();
  if (!expected) {
    return { error: response(500, { error: "Ingest secret not configured." }) };
  }
  const provided =
    getHeaderValue(headers, "API_SECRET") || getHeaderValue(headers, "X-API-SECRET");
  if (!provided || normalizeName(provided) !== expected) {
    return { error: response(401, { error: "Invalid API secret." }) };
  }
  return { ok: true };
};

const getBearerToken = (headers) => {
  const authHeader = getHeaderValue(headers, "authorization");
  if (!authHeader) return "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
};

const getJwtSecret = () => process.env.AUTH_JWT_SECRET || "";

const signToken = (payload) => {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET not set");
  }
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

const verifyToken = (token) => {
  const secret = getJwtSecret();
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET not set");
  }
  return jwt.verify(token, secret);
};

const isAdminUser = (authUser) => authUser?.role === "admin";
const isClientOrAdmin = (authUser) => authUser?.role === "admin" || authUser?.role === "client";

const requireAuth = (headers) => {
  const token = getBearerToken(headers);
  if (!token) {
    return { error: response(401, { error: "Missing Authorization token." }) };
  }
  try {
    const decoded = verifyToken(token);
    return { user_id: decoded.sub, username: decoded.username, role: decoded.role };
  } catch (error) {
    return { error: response(401, { error: "Invalid Authorization token." }) };
  }
};

const logAudit = async (entry) => {
  try {
    await firestore.collection("audit_logs").add({
      ...entry,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error("Audit log write failed:", error?.message || error);
  }
};

const REQUIRED_INGEST_FIELDS = [
  "request_id",
  "unit",
  "request_grade",
  "start",
  "end",
  "date",
  "release",
  "disappeared",
  "sector",
  "client",
  "trust",
  "portal"
];

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return null;
};

const parseNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const validateIngestRow = (row) => {
  const errors = [];
  const normalized = {};

  if (!row || typeof row !== "object") {
    return { errors: ["Row must be an object."] };
  }

  REQUIRED_INGEST_FIELDS.forEach((field) => {
    if (row[field] === undefined || row[field] === null || row[field] === "") {
      errors.push(`${field} is required.`);
    }
  });

  const requestId = parseNumber(row.request_id);
  if (requestId === null) {
    errors.push("request_id must be a number.");
  }

  const requestGrade = parseNumber(row.request_grade);
  if (requestGrade === null) {
    errors.push("request_grade must be a number.");
  }

  const release = parseBoolean(row.release);
  if (release === null) {
    errors.push("release must be a boolean.");
  }

  const disappeared = parseBoolean(row.disappeared);
  if (disappeared === null) {
    errors.push("disappeared must be a boolean.");
  }

  const dateValue = normalizeName(row.date);
  if (dateValue && !isIsoDate(dateValue)) {
    errors.push("date must be in YYYY-MM-DD format.");
  }

  const startValue = normalizeName(row.start);
  const endValue = normalizeName(row.end);
  if (!startValue) {
    errors.push("start must be a non-empty string.");
  }
  if (!endValue) {
    errors.push("end must be a non-empty string.");
  }

  if (errors.length > 0) {
    return { errors };
  }

  normalized.request_id = requestId;
  normalized.unit = String(row.unit).trim();
  normalized.request_grade = requestGrade;
  normalized.start = startValue;
  normalized.end = endValue;
  normalized.date = dateValue;
  normalized.release = release;
  normalized.disappeared = disappeared;
  normalized.sector = String(row.sector).trim();
  normalized.client = String(row.client).trim();
  normalized.trust = String(row.trust).trim();
  normalized.portal = String(row.portal).trim();
  normalized.received_at = new Date().toISOString();

  return { errors: [], normalized };
};

const extractRows = (payload) => {
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (payload?.row) return [payload.row];
  if (Array.isArray(payload)) return payload;
  return [];
};

const normalizeLogRow = (row) => {
  if (!row || typeof row !== "object") return null;
  const copy = { ...row };
  if (!copy.id) {
    copy.id = createId();
  }
  copy.logged_at = copy.logged_at || new Date().toISOString();
  return copy;
};

export const stripBase = (path, base) => {
  if (path.startsWith(base)) {
    const sliced = path.slice(base.length);
    return sliced.length ? sliced : "/";
  }
  return path;
};

export const handleApiRequest = async ({ method, path, query = {}, body, headers = {} }) => {
  const upperMethod = (method || "GET").toUpperCase();

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
        "Access-Control-Allow-Headers": "Content-Type, Authorization, API_SECRET, X-API-SECRET",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      }
    );
  }

  if (upperMethod === "POST" && path === "/auth/login") {
    const username = normalizeName(body?.username).toLowerCase();
    const password = body?.password || "";
    if (!username || !password) {
      return response(400, { error: "Username and password are required." });
    }

    const bootstrapUsername = normalizeName(process.env.ADMIN_BOOTSTRAP_USERNAME).toLowerCase();
    const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || "";
    const isBootstrapAdmin =
      bootstrapUsername &&
      bootstrapPassword &&
      username === bootstrapUsername &&
      password === bootstrapPassword;

    if (isBootstrapAdmin) {
      const adminName = bootstrapUsername;
      const adminId = `bootstrap-${bootstrapUsername}`;
      const token = signToken({
        sub: adminId,
        username: adminName,
        role: "admin"
      });
      return response(200, {
        token,
        username: adminName,
        role: "admin"
      });
    }
    const authUser = await getAuthUser(username);
    if (!authUser) {
      return response(401, { error: "Invalid username or password." });
    }
    const ok = await bcrypt.compare(password, authUser.password_hash || "");
    if (!ok) {
      return response(401, { error: "Invalid username or password." });
    }
    try {
      const token = signToken({
        sub: authUser.user_id,
        username: authUser.username,
        role: authUser.role || "client"
      });
      return response(200, {
        token,
        username: authUser.username,
        role: authUser.role || "client"
      });
    } catch (error) {
      return response(500, { error: "Auth configuration missing." });
    }
  }

  if (upperMethod === "POST" && path === "/admin-api/bootstrap") {
    const setupToken = normalizeName(body?.setup_token);
    const expected = normalizeName(process.env.ADMIN_SETUP_TOKEN);
    if (!expected || setupToken !== expected) {
      return response(403, { error: "Invalid setup token." });
    }
    if (await anyAdminExists()) {
      return response(409, { error: "Admin already exists." });
    }
    const username = normalizeName(body?.username).toLowerCase();
    const password = body?.password || "";
    if (!username || !password) {
      return response(400, { error: "Username and password are required." });
    }
    if (password.length < 6) {
      return response(400, { error: "Password should be at least 6 characters." });
    }
    const existing = await getAuthUser(username);
    if (existing) {
      return response(409, { error: "Username already exists." });
    }
    const hash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await getAuthDoc(username).set({
      username,
      password_hash: hash,
      role: "admin",
      user_id: userId,
      created_at: new Date().toISOString()
    });
    return response(200, { ok: true, username });
  }

  if (upperMethod === "POST" && path === "/data/ingest") {
    const ingestAuth = requireIngestSecret(headers);
    if (ingestAuth.error) {
      await logAudit({
        action: "data_ingest",
        status: "unauthorized",
        user_id: "ingest-bot",
        role: "ingest"
      });
      return ingestAuth.error;
    }

    const rows = Array.isArray(body?.rows)
      ? body.rows
      : body?.row
        ? [body.row]
        : Array.isArray(body)
          ? body
          : [];

    if (!Array.isArray(rows) || rows.length === 0) {
      await logAudit({
        action: "data_ingest",
        status: "invalid_payload",
        user_id: "ingest-bot",
        role: "ingest"
      });
      return response(400, { error: "Payload must include rows." });
    }

    const errors = [];
    const normalizedRows = [];
    rows.forEach((row, index) => {
      const { errors: rowErrors, normalized } = validateIngestRow(row);
      if (rowErrors.length > 0) {
        errors.push({ index, errors: rowErrors });
      } else if (normalized) {
        normalizedRows.push(normalized);
      }
    });

    if (errors.length > 0) {
      await logAudit({
        action: "data_ingest",
        status: "validation_error",
        user_id: "ingest-bot",
        role: "ingest",
        error_count: errors.length
      });
      return response(400, { error: "Validation failed.", details: errors });
    }

    const ingestUserId = normalizeName(process.env.INGEST_USER_ID) || "ingest-bot";
    const userDb = await loadUserDb(ingestUserId);
    userDb.dataRows = userDb.dataRows || [];
    userDb.dataRows.push(...normalizedRows);
    await saveUserDb(ingestUserId, userDb);

    await logAudit({
      action: "data_ingest",
      status: "success",
      user_id: ingestUserId,
      role: "ingest",
      row_count: normalizedRows.length
    });

    return response(201, {
      ok: true,
      inserted: normalizedRows.length,
      rows: normalizedRows
    });
  }

  if (
    upperMethod === "POST" &&
    (path === "/logs" || path === "/logs/append" || path === "/log" || path === "/log/append")
  ) {
    const secretProvided =
      getHeaderValue(headers, "API_SECRET") || getHeaderValue(headers, "X-API-SECRET");

    if (secretProvided) {
      const ingestAuth = requireIngestSecret(headers);
      if (ingestAuth.error) {
        await logAudit({
          action: "logs_append",
          status: "unauthorized",
          user_id: "ingest-bot",
          role: "ingest"
        });
        return ingestAuth.error;
      }
      const ingestUserId = normalizeName(body?.user_id) ||
        normalizeName(process.env.INGEST_USER_ID) ||
        "ingest-bot";
      const userDb = await loadUserDb(ingestUserId);
      ensureLogsSheet(userDb);
      const rows = extractRows(body);
      if (!rows.length) {
        return response(400, { error: "Payload must include rows." });
      }
      const normalizedRows = rows.map(normalizeLogRow).filter(Boolean);
      if (!normalizedRows.length) {
        return response(400, { error: "Payload must include valid log rows." });
      }
      userDb.nursesBySheet.logs.push(...normalizedRows);
      await saveUserDb(ingestUserId, userDb);
      await logAudit({
        action: "logs_append",
        status: "success",
        user_id: ingestUserId,
        role: "ingest",
        row_count: normalizedRows.length
      });
      return response(201, { ok: true, inserted: normalizedRows.length });
    }

    const authResult = await requireAuth(headers);
    if (authResult.error) {
      return authResult.error;
    }
    const userDb = await loadUserDb(authResult.user_id);
    ensureLogsSheet(userDb);
    const rows = extractRows(body);
    if (!rows.length) {
      return response(400, { error: "Payload must include rows." });
    }
    const normalizedRows = rows.map(normalizeLogRow).filter(Boolean);
    if (!normalizedRows.length) {
      return response(400, { error: "Payload must include valid log rows." });
    }
    userDb.nursesBySheet.logs.push(...normalizedRows);
    await saveUserDb(authResult.user_id, userDb);
    return response(201, { ok: true, inserted: normalizedRows.length });
  }

  const authResult = await requireAuth(headers);
  if (authResult.error) {
    return authResult.error;
  }

  if (upperMethod === "GET" && path === "/auth/me") {
    return response(200, {
      user_id: authResult.user_id,
      username: authResult.username,
      role: authResult.role
    });
  }

  if (upperMethod === "GET" && path === "/admin-api/status") {
    return response(200, { is_admin: isAdminUser(authResult) });
  }

  if (upperMethod === "GET" && path === "/data/rows") {
    const ingestUserId = normalizeName(process.env.INGEST_USER_ID) || "ingest-bot";
    const userDb = await loadUserDb(ingestUserId);
    return response(200, { rows: userDb.dataRows || [] });
  }

  if (upperMethod === "POST" && path === "/admin-api/create-user") {
    if (!isAdminUser(authResult)) {
      return response(403, { error: "Admin access required." });
    }
    const username = normalizeName(body?.username).toLowerCase();
    const password = body?.password || "";
    const clientName = normalizeName(body?.client_name || body?.clientName);
    if (!username || !password) {
      return response(400, { error: "Username and password are required." });
    }
    if (password.length < 6) {
      return response(400, { error: "Password should be at least 6 characters." });
    }
    try {
      const existing = await getAuthUser(username);
      if (existing) {
        return response(409, { error: "Username already exists." });
      }
      const hash = await bcrypt.hash(password, 10);
      const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await getAuthDoc(username).set({
        username,
        password_hash: hash,
        role: "client",
        user_id: userId,
        created_at: new Date().toISOString()
      });
      const seed = createUserSeed(clientName);
      await getUserDoc(userId).set(seed);
      return response(200, {
        user_id: userId,
        username,
        client_name: clientName
      });
    } catch (error) {
      return response(500, { error: "Failed to create user." });
    }
  }

  const userId = authResult.user_id;

  if (upperMethod === "GET" && path === "/sheets") {
    const userDb = await loadUserDb(userId);
    ensureLogsSheet(userDb);
    await saveUserDb(userId, userDb);
    return response(200, { sheets: userDb.sheets });
  }

  if (upperMethod === "POST" && path === "/sheets/create") {
    const userDb = await loadUserDb(userId);
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
    await saveUserDb(userId, userDb);
    return response(200, { sheet });
  }

  if (upperMethod === "POST" && path === "/sheets/duplicate") {
    const userDb = await loadUserDb(userId);
    ensureLogsSheet(userDb);
    const sourceId = body?.sheet_id;
    const source = userDb.sheets.find((sheet) => sheet.sheet_id === sourceId);
    if (!source) {
      return response(404, { error: "Sheet not found." });
    }
    if (source.sheet_id === "logs" || (source.name || "").toLowerCase() === "logs") {
      return response(403, { error: "The Logs sheet cannot be duplicated." });
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
    await saveUserDb(userId, userDb);
    return response(200, { sheet });
  }

  if (upperMethod === "POST" && path === "/sheets/rename") {
    const userDb = await loadUserDb(userId);
    const name = normalizeName(body?.name);
    if (!body?.sheet_id || !name) {
      return response(400, { error: "Sheet id and name are required." });
    }
    const target = userDb.sheets.find((sheet) => sheet.sheet_id === body.sheet_id);
    if (!target) {
      return response(404, { error: "Sheet not found." });
    }
    target.name = name;
    await saveUserDb(userId, userDb);
    return response(200, { sheet_id: target.sheet_id, name: target.name });
  }

  if (upperMethod === "POST" && path === "/sheets/delete") {
    const userDb = await loadUserDb(userId);
    const sheetId = body?.sheet_id;
    if (!sheetId) {
      return response(400, { error: "Sheet id is required." });
    }
    const target = userDb.sheets.find((sheet) => sheet.sheet_id === sheetId);
    if (!target) {
      return response(404, { error: "Sheet not found." });
    }
    if (sheetId === "logs" || (target.name || "").toLowerCase() === "logs") {
      return response(403, { error: "The Logs sheet cannot be deleted." });
    }
    userDb.sheets = userDb.sheets.filter((sheet) => sheet.sheet_id !== sheetId);
    delete userDb.nursesBySheet[sheetId];
    delete userDb.shiftsBySheet[sheetId];
    await saveUserDb(userId, userDb);
    return response(200, { ok: true, deleted: sheetId });
  }

  if (upperMethod === "GET" && path === "/schedule") {
    const userDb = await loadUserDb(userId);
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
    const userDb = await loadUserDb(userId);
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
    await saveUserDb(userId, userDb);
    return response(200, { ok: true, nurses: rows });
  }

  if (upperMethod === "POST" && path === "/nurses/delete") {
    const userDb = await loadUserDb(userId);
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
    await saveUserDb(userId, userDb);
    return response(200, { ok: true });
  }

  if (upperMethod === "POST" && path === "/schedule/update") {
    const userDb = await loadUserDb(userId);
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
    await saveUserDb(userId, userDb);
    return response(200, { ok: true });
  }

  if (upperMethod === "GET" && path === "/shift-types") {
    const userDb = await loadUserDb(userId);
    const ensured = ensureBookedShiftTypes(
      userDb.shiftTypes?.length ? userDb.shiftTypes : clone(DEFAULT_SHIFT_TYPES)
    );
    userDb.shiftTypes = ensured;
    await saveUserDb(userId, userDb);
    return response(200, { shiftTypes: ensured });
  }

  if (upperMethod === "POST" && path === "/shift-types/upsert") {
    const oldName = normalizeShiftType(body?.old_name);
    const newName = normalizeShiftType(body?.new_name);
    if (!newName) {
      return response(400, { error: "new_name is required." });
    }
    if (newName.length > 6) {
      return response(400, { error: "Shift type name must be 6 characters or fewer." });
    }
    const userDb = await loadUserDb(userId);
    const types = ensureBookedShiftTypes(
      userDb.shiftTypes?.length ? userDb.shiftTypes : clone(DEFAULT_SHIFT_TYPES)
    );
    const removeType = (value) => {
      const idx = types.indexOf(value);
      if (idx >= 0) {
        types.splice(idx, 1);
      }
    };
    if (oldName) {
      const index = types.indexOf(oldName);
      if (index === -1) {
        return response(404, { error: "Shift type not found." });
      }
      if (newName !== oldName && types.includes(newName)) {
        return response(409, { error: "Shift type already exists." });
      }
      types[index] = newName;
      if (!oldName.startsWith(BOOKED_PREFIX)) {
        removeType(`${BOOKED_PREFIX}${oldName}`);
      }
    } else {
      if (types.includes(newName)) {
        return response(409, { error: "Shift type already exists." });
      }
      types.push(newName);
    }
    userDb.shiftTypes = ensureBookedShiftTypes(types);
    await saveUserDb(userId, userDb);
    return response(200, { shiftTypes: userDb.shiftTypes });
  }

  if (upperMethod === "POST" && path === "/shift-types/delete") {
    const name = normalizeShiftType(body?.name);
    if (!name) {
      return response(400, { error: "name is required." });
    }
    const userDb = await loadUserDb(userId);
    const types = ensureBookedShiftTypes(
      userDb.shiftTypes?.length ? userDb.shiftTypes : clone(DEFAULT_SHIFT_TYPES)
    );
    const index = types.indexOf(name);
    if (index === -1) {
      return response(404, { error: "Shift type not found." });
    }
    types.splice(index, 1);
    if (!name.startsWith(BOOKED_PREFIX)) {
      const booked = `${BOOKED_PREFIX}${name}`;
      const bookedIndex = types.indexOf(booked);
      if (bookedIndex >= 0) {
        types.splice(bookedIndex, 1);
      }
    }
    userDb.shiftTypes = ensureBookedShiftTypes(types);
    await saveUserDb(userId, userDb);
    return response(200, { shiftTypes: userDb.shiftTypes });
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
        path.startsWith("/nurses") ||
        path.startsWith("/data") ||
        path.startsWith("/admin-api") ||
        path.startsWith("/auth") ||
        path.startsWith("/shift-types") ||
        path.startsWith("/logs") ||
        path.startsWith("/log")
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

    const result = await handleApiRequest({
      method: req.method,
      path,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
      headers: req.headers
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
