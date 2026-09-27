const cms = require("../lib/cms");

module.exports = async (req, res) => {
  // Tokens are stateless; the client simply discards it.
  cms.json(res, { ok: true });
};
