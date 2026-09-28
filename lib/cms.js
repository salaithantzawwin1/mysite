// lib/cms.js — shared helpers for Vercel serverless functions (Node.js)
// Storage strategy:
//   - content (data.json)  -> Vercel Blob ("content/data.json") when BLOB_READ_WRITE_TOKEN is set,
//                             otherwise local filesystem (local dev via server.py).
//   - uploads              -> Vercel Blob ("uploads/<name>"), otherwise site/uploads/<name>.
// Auth: HMAC-signed stateless tokens (works on serverless — no session store needed).

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_LOCAL = path.join(ROOT, "data.json");
const UPLOADS_LOCAL = path.join(ROOT, "site", "uploads");

const HAS_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
let blobCache = null;
function blob() {
  if (!blobCache) blobCache = require("@vercel/blob");
  return blobCache;
}

// ---------------- visitor counter ----------------
const STATS_KEY = "stats/visits.json";

async function loadStats() {
  const empty = { total: 0, sections: {} };
  if (HAS_BLOB) {
    try {
      const res = await fetch((await blob().head(STATS_KEY)).url, { cache: "no-store" });
      const data = await res.json();
      return { total: data.total || 0, sections: data.sections || {} };
    } catch {
      return empty;
    }
  }
  try {
    const local = path.join(ROOT, "stats.json");
    const data = JSON.parse(await fs.promises.readFile(local, "utf-8"));
    return { total: data.total || 0, sections: data.sections || {} };
  } catch {
    return empty;
  }
}

async function saveStats(stats) {
  const text = JSON.stringify(stats);
  if (HAS_BLOB) {
    await blob().put(STATS_KEY, text, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return;
  }
  const local = path.join(ROOT, "stats.json");
  await fs.promises.writeFile(local, text, "utf-8");
}

async function recordVisit(section) {
  const stats = await loadStats();
  stats.total = (stats.total || 0) + 1;
  if (section && typeof section === "string" && /^[a-z-]{1,24}$/.test(section)) {
    stats.sections = stats.sections || {};
    stats.sections[section] = (stats.sections[section] || 0) + 1;
  }
  await saveStats(stats);
  return stats;
}

// ---------------- config ----------------
function config() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    secret:
      process.env.CMS_SECRET ||
      crypto.randomBytes(24).toString("hex"), // random per instance if unset (dev only)
  };
}

// ---------------- auth tokens ----------------
function sign(payload) {
  return crypto.createHmac("sha256", config().secret).update(payload).digest("hex");
}

function issueToken(username) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })
  ).toString("base64url");
  return payload + "." + sign(payload);
}

function checkToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  try {
    const expected = sign(payload);
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return false;
    }
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    return Date.now() < data.exp;
  } catch {
    return false;
  }
}

function authorized(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") && checkToken(auth.slice(7));
}

// ---------------- content storage ----------------
async function loadContent() {
  if (HAS_BLOB) {
    try {
      const { head } = blob();
      await head("content/data.json"); // throws if missing
      const res = await fetch(
        (await blob().head("content/data.json")).url
      );
      return await res.json();
    } catch {
      // not uploaded yet — fall through to local seed
    }
  }
  const raw = await fs.promises.readFile(DATA_LOCAL, "utf-8");
  return JSON.parse(raw);
}

async function saveContent(data) {
  const text = JSON.stringify(data, null, 2);
  if (HAS_BLOB) {
    await blob().put("content/data.json", text, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return;
  }
  const tmp = DATA_LOCAL + ".tmp";
  await fs.promises.writeFile(tmp, text, "utf-8");
  await fs.promises.rename(tmp, DATA_LOCAL);
}

// ---------------- uploads ----------------
function safeFilename(name) {
  name = path.basename(name || "file").replace(/[^A-Za-z0-9._-]/g, "_");
  return (name || "file").slice(0, 80);
}

async function saveUpload(filename, buffer) {
  const safe = safeFilename(filename);
  const base = safe.replace(/\.[^.]*$/, "");
  const ext = path.extname(safe);
  if (HAS_BLOB) {
    let candidate = "uploads/" + safe;
    let i = 1;
    // Blob put overwrites, so probe existence for a unique name
    while (true) {
      try {
        await blob().head(candidate);
        candidate = `uploads/${base}-${i++}${ext}`;
      } catch {
        break;
      }
    }
    const put = await blob().put(candidate, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return { url: put.url, name: candidate.replace("uploads/", "") };
  }
  await fs.promises.mkdir(UPLOADS_LOCAL, { recursive: true });
  let candidate = safe;
  let i = 1;
  while (fs.existsSync(path.join(UPLOADS_LOCAL, candidate))) {
    candidate = `${base}-${i++}${ext}`;
  }
  await fs.promises.writeFile(path.join(UPLOADS_LOCAL, candidate), buffer);
  return { url: "uploads/" + candidate, name: candidate };
}

async function listUploads() {
  if (HAS_BLOB) {
    const { list } = blob();
    const result = await list({ prefix: "uploads/" });
    return result.blobs.map((b) => ({
      name: decodeURIComponent(b.pathname.replace("uploads/", "")),
      url: b.url,
      size: b.size,
    }));
  }
  try {
    const files = await fs.promises.readdir(UPLOADS_LOCAL);
    const out = [];
    for (const f of files) {
      const st = await fs.promises.stat(path.join(UPLOADS_LOCAL, f));
      if (st.isFile()) out.push({ name: f, url: "uploads/" + f, size: st.size });
    }
    return out;
  } catch {
    return [];
  }
}

async function deleteUpload(name) {
  const safe = safeFilename(name);
  if (HAS_BLOB) {
    const { del, head } = blob();
    try {
      const h = await head("uploads/" + safe);
      await del(h.url);
      return true;
    } catch {
      return false;
    }
  }
  const p = path.join(UPLOADS_LOCAL, safe);
  try {
    await fs.promises.unlink(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------- multipart parsing ----------------
function parseMultipart(body, contentType) {
  const m = /boundary="?([^";]+)"?/i.exec(contentType);
  if (!m) return {};
  const boundary = Buffer.from("--" + m[1]);
  const parts = {};
  let start = body.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (body.slice(start, start + 2).toString() === "--") break;
    start += 2; // skip \r\n
    const headEnd = body.indexOf("\r\n\r\n", start);
    if (headEnd === -1) break;
    const head = body.slice(start, headEnd).toString("utf-8");
    let next = body.indexOf(boundary, headEnd + 4);
    let data = next === -1 ? body.slice(headEnd + 4) : body.slice(headEnd + 4, next - 2);
    const nameMatch = /name="([^"]*)"/.exec(head);
    const fileMatch = /filename="([^"]*)"/.exec(head);
    if (nameMatch) {
      parts[nameMatch[1]] = {
        filename: fileMatch ? fileMatch[1] : "",
        data,
      };
    }
    start = next;
  }
  return parts;
}

// ---------------- responses ----------------
function json(res, obj, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(obj));
}

module.exports = {
  config,
  issueToken,
  checkToken,
  authorized,
  loadContent,
  saveContent,
  saveUpload,
  listUploads,
  deleteUpload,
  parseMultipart,
  safeFilename,
  loadStats,
  recordVisit,
  json,
  HAS_BLOB,
};
