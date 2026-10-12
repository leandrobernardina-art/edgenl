function impliedProbability(decimalOdds) {
  const odds = Number(decimalOdds);
  if (!Number.isFinite(odds) || odds <= 1) return null;
  return 1 / odds;
}
function normalizeProbabilities(outcomes) {
  const rows = outcomes.map(o => ({ ...o, probability: impliedProbability(o.price) }));
  if (rows.some(r => r.probability === null)) return null;
  const total = rows.reduce((sum, r) => sum + r.probability, 0);
  if (!(total > 0)) return null;
  return { overround: total - 1, outcomes: rows.map(r => ({ ...r, normalizedProbability: r.probability / total })) };
}
function priceRange(prices) {
  const valid = prices.map(Number).filter(n => Number.isFinite(n) && n > 1);
  if (!valid.length) return null;
  return { min: Math.min(...valid), max: Math.max(...valid), count: valid.length, spread: Math.max(...valid) - Math.min(...valid) };
}
module.exports = { impliedProbability, normalizeProbabilities, priceRange };
