const { getOdds } = require("./lib/odds");
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Methode niet toegestaan." });
  }
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) return res.status(503).json({
    error: "Voeg THE_ODDS_API_KEY toe bij Vercel → Settings → Environment Variables en deploy opnieuw."
  });
  const regions = String(req.query.regions || process.env.ODDS_REGIONS || "eu,uk,us")
    .split(",").map(s => s.trim()).filter(Boolean).filter(s => ["us","us2","uk","eu","au"].includes(s));
  if (!regions.length) return res.status(400).json({ error: "Geen geldige oddsregio gekozen." });
  try {
    const payload = await getOdds({ key, regions: regions.join(",") });
    res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=90");
    return res.status(200).json(payload);
  } catch (e) {
    return res.status(e.statusCode || 502).json({ error: e.publicMessage || "De oddsprovider is niet bereikbaar." });
  }
};
