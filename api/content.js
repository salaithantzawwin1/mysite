const cms = require("../lib/cms");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      const content = await cms.loadContent();
      return cms.json(res, content);
    } catch (e) {
      return cms.json(res, { error: "failed to load content" }, 500);
    }
  }

  if (req.method === "PUT") {
    if (!cms.authorized(req)) return cms.json(res, { error: "unauthorized" }, 401);
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        await cms.saveContent(data);
        return cms.json(res, { ok: true });
      } catch {
        return cms.json(res, { error: "invalid JSON" }, 400);
      }
    });
    return;
  }

  cms.json(res, { error: "method not allowed" }, 405);
};
