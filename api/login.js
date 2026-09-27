const cms = require("../lib/cms");

module.exports = async (req, res) => {
  if (req.method !== "POST") return cms.json(res, { error: "method not allowed" }, 405);
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let creds = {};
    try { creds = JSON.parse(body || "{}"); } catch {}
    const cfg = cms.config();
    if (creds.username === cfg.username && creds.password === cfg.password) {
      return cms.json(res, { token: cms.issueToken(creds.username) });
    }
    cms.json(res, { error: "invalid credentials" }, 401);
  });
};
