const BASE = "https://api.the-odds-api.com/v4";
async function getOdds({ key, regions }) {
  const sportsUrl = new URL(`${BASE}/sports`);
  sportsUrl.searchParams.set("apiKey", key);
  const sportsRes = await fetch(sportsUrl);
  const sportsData = await sportsRes.json().catch(() => null);
  if (!sportsRes.ok) {
    const err = new Error("Sportlijst ophalen mislukt.");
    err.statusCode = sportsRes.status === 401 ? 502 : sportsRes.status;
    err.publicMessage = sportsData?.message || "De provider weigert de aanvraag. Controleer API-key, abonnement en quotum.";
    throw err;
  }
  const sports = (Array.isArray(sportsData) ? sportsData : []).filter(s => s.active);
  // Current feed: collect available sport keys first; odds request covers all active sports in parallel,
  // with bounded concurrency to reduce burst pressure and to respect upstream quotas.
  const limit = Math.max(1, Math.min(8, Number(process.env.ODDS_CONCURRENCY || 4)));
  const all = [];
  const failures = [];
  let cursor = 0;
  async function worker() {
    while (cursor < sports.length) {
      const sport = sports[cursor++];
      const url = new URL(`${BASE}/sports/${encodeURIComponent(sport.key)}/odds`);
      url.searchParams.set("apiKey", key);
      url.searchParams.set("regions", regions);
      url.searchParams.set("markets", process.env.ODDS_MARKETS || "h2h,spreads,totals");
      url.searchParams.set("oddsFormat", "decimal");
      url.searchParams.set("dateFormat", "iso");
      try {
        const r = await fetch(url);
        const body = await r.json().catch(() => null);
        if (r.ok && Array.isArray(body)) all.push(...body.map(e => ({ ...e, sport_key: e.sport_key || sport.key, sport_title: e.sport_title || sport.title })));
        else failures.push({ sport: sport.key, status: r.status, message: body?.message || "Providerfout" });
      } catch { failures.push({ sport: sport.key, status: 502, message: "Netwerkfout" }); }
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  const deduped = new Map();
  for (const event of all) deduped.set(event.id, event);
  const events = [...deduped.values()].sort((a,b) => new Date(a.commence_time) - new Date(b.commence_time));
  if (!events.length && failures.length) {
    const err = new Error("Geen odds konden worden opgehaald.");
    err.statusCode = 502;
    err.publicMessage = failures.some(f => f.status === 401 || f.status === 403)
      ? "De provider heeft toegang geweigerd. Controleer API-key, abonnement en toegestane markten."
      : failures[0].message;
    throw err;
  }
  return {
    events,
    fetchedAt: new Date().toISOString(),
    provider: "The Odds API",
    sportCount: sports.length,
    partial: failures.length > 0,
    failedSports: failures.length,
    note: "Beschikbaarheid hangt af van abonnement, regio en upstream quotas.",
    regions,
    markets: process.env.ODDS_MARKETS || "h2h,spreads,totals",
    failureDetails: failures.slice(0, 5).map(f => ({ sport: f.sport, status: f.status, message: f.message }))
  };
}
module.exports = { getOdds };
