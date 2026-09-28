const cms = require("../lib/cms");

// GET  /api/visit                       -> read-only: { ok, total, sections }
// GET  /api/visit?increment             -> record a visit: returns new totals
// GET  /api/visit?increment&section=X   -> also count a section view (X: site section id)
// POST /api/visit  body {section:"x"}   -> same as GET ?increment&section=x
// Privacy-friendly: no cookies, no IPs, no fingerprints — just counters.
const VALID_SECTIONS = /^(home|about|experience|projects|skills|certs|education|contact)$/;

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return cms.json(res, { error: "method not allowed" }, 405);
  }
  try {
    let section = "";
    let increment = false;
    if (req.method === "POST") {
      let body = "";
      await new Promise((done) => {
        req.on("data", (c) => (body += c));
        req.on("end", done);
      });
      try { const j = JSON.parse(body || "{}"); section = j.section || ""; increment = true; } catch { increment = true; }
    } else {
      const q = req.query || {};
      increment = "increment" in q;
      section = q.section || "";
    }
    if (!increment) {
      const stats = await cms.loadStats();
      return cms.json(res, { ok: true, total: stats.total, sections: stats.sections || {} });
    }
    if (section && !VALID_SECTIONS.test(section)) section = "";
    const stats = await cms.recordVisit(section);
    return cms.json(res, { ok: true, total: stats.total, sections: stats.sections || {} });
  } catch (e) {
    // Never break the page because of analytics
    return cms.json(res, { ok: false, total: null, sections: {} });
  }
};
