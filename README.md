# EDGE Sports Intelligence — Nederlands

Research-only sportdata- en marktanalyses. Geen betslip, weddenschappen, stortingen, betaalverwerking of bookmakertransacties.

## Huidige functionaliteit
- Responsive Nederlandstalige dashboardinterface.
- Backend vraagt de actieve sporten op bij The Odds API en probeert voor alle actieve sportkeys odds op te halen met begrensde paralleliteit.
- Ondersteunde markten in de standaardconfiguratie: `h2h,spreads,totals`. Provider, sport, regio en abonnement bepalen de werkelijke dekking.
- Event-, markt- en bookmakerfilters.
- Quotes, hoogste/laagste prijs, ruwe impliciete kans, complete-market overround en CSV-export.
- Spelerprops-weergave voor spelergerelateerde marktsleutels die werkelijk door de provider worden teruggestuurd.
- Deterministische analyse zonder AI-key; optionele OpenAI-samenvatting via server-side endpoint.
- Nederlandse nummer- en datumformaten.
- API-key blijft server-side. API-errors worden zichtbaar gemaakt in de UI.
- Unit tests voor impliciete kans, normalisatie en prijsbereik.

## Deploy naar Vercel + GitHub
1. Upload de volledige inhoud van deze map naar je GitHub repository. Behoud `api/`, `api/lib/`, `lib/`, `tests/`, `index.html`, `package.json` en `vercel.json`.
2. Importeer de repository via https://vercel.com/new. Framework Preset: **Other**. Geen build command nodig.
3. In Vercel → Project → Settings → Environment Variables: voeg `ODDS_API_KEY` toe (of behoud `ODDS_API_KEY` of `THE_ODDS_API_KEY`; beide namen worden ondersteund). Optioneel `ODDS_REGIONS`, `ODDS_MARKETS`, `ODDS_CONCURRENCY`. Standaard gebruikt EDGE alleen regio `eu` om onnodig quotumverbruik te beperken; breid dit bewust uit als je abonnement dit toelaat.
4. Optioneel `OPENAI_API_KEY` toevoegen om AI-uitleg te activeren. Zonder deze key is de deterministische uitleg actief.
5. Deploy of redeploy na het wijzigen van environment variables.

## Lokaal testen
Vereist Node.js 20+:
```bash
npm test
```
Voor lokale serverless API-testen kan Vercel CLI worden gebruikt (`vercel dev`) nadat de env-vars zijn ingesteld.

## API-kosten en dekking
De backend doet een `/sports`-request plus een odds-request voor iedere actieve sportkey. Dit kan je upstream API-quota snel verbruiken. Begin met beperkte regio's en controleer provider pricing/quotum. De concurrency-instelling begrenst gelijktijdige requests, maar niet het totale aantal. Voor productie adviseren we caching, een cron-gebaseerde data-ingestie en alleen markten ophalen die de gebruiker nodig heeft.

## Belangrijke beperkingen
- Deze eerste versie is geen model dat wedstrijden voorspelt. Odds-implied probabilities zijn afgeleid van marktprijzen en geen onafhankelijke modelkansen.
- Geen historische database, historische odds, blessures, line-ups of spelerstatistieken in deze eerste iteratie.
- Player props verschijnen alleen wanneer de upstream feed ze levert. De standaard odds-endpoint haalt momenteel `h2h,spreads,totals` op; player props vragen aparte market keys en vaak extra API-quota. Voeg pas sport-specifieke props toe nadat de provider ze voor jouw plan ondersteunt.
- De odds endpoint is een actuele snapshot, geen garantie op in-play/live data.
- De AI-output is uitsluitend een samenvatting van de meegegeven data en kan fouten maken; verifieer tegen de bron.
