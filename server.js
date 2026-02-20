import "dotenv/config";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { handleApiRequest } from "./scripts/api.js";

const distDir = path.resolve(process.cwd(), "dist");
const port = Number(process.env.PORT || 8080);

const apiPrefixes = ["/auth", "/admin-api", "/sheets", "/schedule", "/nurses"];

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

const sendJson = (res, status, payload, headers = {}) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    ...headers
  });
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return null;
  return JSON.parse(raw);
};

const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const handleContact = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end();
    return;
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: "Invalid JSON payload" });
    return;
  }

  const { fullName, workEmail, trustOrHospital, message } = payload || {};

  if (!fullName || !workEmail) {
    sendJson(res, 400, { error: "Full name and work email are required." });
    return;
  }

  try {
    const host = getEnv("SMTP_HOST");
    const port = Number(getEnv("SMTP_PORT"));
    const user = getEnv("SMTP_USER");
    const pass = getEnv("SMTP_PASS");
    const from = process.env.SMTP_FROM || user;
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const text = [
      `Full Name: ${fullName}`,
      `Work Email: ${workEmail}`,
      `Trust or Hospital: ${trustOrHospital || "N/A"}`,
      "",
      "Message:",
      message || "(no message provided)"
    ].join("\n");

    await transporter.sendMail({
      from,
      to: "radubobirnac@gmail.com, virinchiaddanki@gmail.com",
      subject: `HealthRoster Demo Request - ${fullName}`,
      replyTo: workEmail,
      text
    });

    sendJson(res, 200, { ok: true });
  } catch (error) {
    sendJson(res, 500, { error: error?.message || "Email send failed." });
  }
};

const serveStatic = (req, res, pathname) => {
  if (!fs.existsSync(distDir)) {
    sendJson(res, 500, { error: "Build output not found. Run npm run build." });
    return;
  }

  const safePath = path.normalize(path.join(distDir, pathname));
  if (!safePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end();
    return;
  }

  let filePath = safePath;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, "index.html");
  }

  const ext = path.extname(filePath).toLowerCase();
  const type = contentTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname || "/";

  if (pathname === "/contact" || pathname === "/api/contact") {
    await handleContact(req, res);
    return;
  }

  const isApiRoute = apiPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (isApiRoute || req.method === "OPTIONS") {
    let body = null;
    try {
      body = await readBody(req);
    } catch (error) {
      sendJson(res, 400, { error: "Invalid JSON payload" });
      return;
    }

    const result = await handleApiRequest({
      method: req.method,
      path: pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      body,
      headers: req.headers
    });

    res.statusCode = result.status;
    Object.entries(result.headers || {}).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.end(result.body);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res, pathname);
    return;
  }

  res.writeHead(405, { Allow: "GET,HEAD,POST,OPTIONS" });
  res.end();
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
