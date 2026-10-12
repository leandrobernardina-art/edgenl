module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Methode niet toegestaan." });
  }
  const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 12) : [];
  if (!events.length) return res.status(400).json({ error: "Geen eventdata meegegeven." });
  const compact = events.map(e => ({
    sport: String(e.sport || "").slice(0, 60),
    matchup: `${String(e.home || "?").slice(0,80)} – ${String(e.away || "?").slice(0,80)}`,
    markets: Array.isArray(e.markets) ? e.markets.slice(0, 30).map(m => ({
      key: String(m.key || "").slice(0, 80),
      bookmaker: String(m.book || "").slice(0, 80),
      outcomes: Array.isArray(m.outcomes) ? m.outcomes.slice(0, 12).map(o => ({
        name: String(o.name || "").slice(0, 80),
        description: String(o.description || "").slice(0, 80),
        point: Number.isFinite(Number(o.point)) ? Number(o.point) : null,
        price: Number(o.price) > 1 ? Number(o.price) : null
      })) : []
    })) : []
  }));
  const marketMath = compact.map(e => {
    const markets = e.markets.slice(0,3).map(m => {
      const os = m.outcomes.filter(o => o.price);
      if (os.length < 2) return `${m.key}: onvoldoende uitkomsten voor margeanalyse.`;
      const sum = os.reduce((n,o) => n + 100/o.price, 0);
      return `${m.key}: ruwe impliciete kansen tellen op tot ${sum.toFixed(1)}% bij ${m.bookmaker}.`;
    });
    return `${e.matchup} (${e.sport}): ${markets.join(" ")}`;
  }).join("\n");
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(200).json({
    mode: "deterministisch",
    insight: `Marktsnapshot (geen onafhankelijke voorspelling):\n${marketMath}\n\nInterpretatie: odds bevatten doorgaans een marge. De huidige response toont geen historische beweging en bewijst geen voorspellend voordeel. Controleer de volledige markt, lijn, tijd en bookmakerregels.`
  });
  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "Je bent een voorzichtige Nederlandse sportmarkt-analist. Gebruik uitsluitend de aangeleverde data. Verzin geen uitslagen, blessures, opstellingen, spelersstatistieken, historische trends of externe feiten. Maak onderscheid tussen markt-implied kansen en modelkansen; er is geen onafhankelijk model verstrekt. Leg waar mogelijk bookmaker-marge, ontbrekende data en vergelijkbaarheidsproblemen uit. Geen wedadvies, geen gegarandeerde uitkomsten, geen aansporing tot gokken. Antwoord in helder Nederlands, maximaal 220 woorden.",
        input: `Analyseer deze marktdata. Benoem patronen die rechtstreeks uit de gegevens volgen en hun beperkingen. Data: ${JSON.stringify(compact)}`
      })
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) return res.status(502).json({ error: body?.error?.message || "AI-provider gaf een fout terug." });
    const insight = (body?.output || []).flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text).join("\n").trim();
    if (!insight) return res.status(502).json({ error: "AI-provider gaf geen tekst terug." });
    return res.status(200).json({ mode: "ai", insight });
  } catch {
    return res.status(502).json({ error: "AI-service niet bereikbaar." });
  }
};
