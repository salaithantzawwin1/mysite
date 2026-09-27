const cms = require("../lib/cms");

module.exports = async (req, res) => {
  if (!cms.authorized(req)) return cms.json(res, { error: "unauthorized" }, 401);

  if (req.method === "GET") {
    const files = await cms.listUploads();
    return cms.json(res, { files });
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url, "http://x");
    const name = url.searchParams.get("name") || "";
    const ok = await cms.deleteUpload(name);
    return cms.json(res, ok ? { ok: true } : { error: "not found" }, ok ? 200 : 404);
  }

  cms.json(res, { error: "method not allowed" }, 405);
};
