const cms = require("../lib/cms");

module.exports = async (req, res) => {
  if (req.method !== "POST") return cms.json(res, { error: "method not allowed" }, 405);
  if (!cms.authorized(req)) return cms.json(res, { error: "unauthorized" }, 401);

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    try {
      const body = Buffer.concat(chunks);
      const parts = cms.parseMultipart(body, req.headers["content-type"] || "");
      const file = parts.file;
      if (!file || !file.data || !file.data.length) {
        return cms.json(res, { error: "no file" }, 400);
      }
      const saved = await cms.saveUpload(file.filename, file.data);
      return cms.json(res, saved);
    } catch (e) {
      return cms.json(res, { error: "upload failed: " + e.message }, 500);
    }
  });
};
