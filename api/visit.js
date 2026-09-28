const cms = require("../lib/cms");

// GET /api/visit            -> read-only: returns current total
// GET /api/visit?increment  -> records a visit and returns the new total
// Client pings with ?increment once per browser session (sessionStorage flag),
// so refreshes and in-session navigation don't inflate the counter.
module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return cms.json(res, { error: "method not allowed" }, 405);
  }
  try {
    const increment = "increment" in (req.query || {});
    const total = increment ? await cms.recordVisit() : (await cms.loadStats()).total;
    return cms.json(res, { ok: true, total: total });
  } catch (e) {
    // Never break the page because of analytics
    return cms.json(res, { ok: false, total: null });
  }
};
