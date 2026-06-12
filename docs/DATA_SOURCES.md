# ETF Radar data sources

## Architecture

ETF Radar is an end-of-day static data site. GitHub Actions runs the collector at 18:10 and 19:10 KST,
writes JSON files under `public/data`, and commits only changed data. Cloudflare Pages serves the React app
and those JSON files without a runtime Worker, KV namespace, or separate backend server.

## Secrets

`KRX_API_KEY` must never be committed or exposed to the browser.

- Local collector: set `KRX_API_KEY` only in the current shell before running `npm run collect:data`.
- GitHub Actions: add an Actions secret named `KRX_API_KEY`.

If a key is pasted into chat, an issue, a log, or a commit, revoke and reissue it before production use.

## Market data

The collector calls the official KRX Open API `etf_bydd_trd` endpoint. It provides closing price, NAV,
market capitalization, net assets, volume, and benchmark information. The API requires both an issued key
and approval for the ETF daily trading service.

Initial collection loads up to ten years of Naver daily closes. Later runs append the latest KRX close.
The generated `manifest.json` records the business date, generation time, item count, and sources.

## ETF metadata and holdings

Listing date, fund fee, asset manager, fund type, product description, and the previous-day TOP 10 holdings
are parsed from Naver Finance ETF detail pages. TOP 10 holdings are not a complete portfolio composition file.
Full holdings detection requires future adapters for each asset manager's PDF or CSV data.

The weekday workflow runs at 18:10 KST and retries at 19:10 KST. It processes every supported domestic
equity spot ETF sequentially with a request delay. Each ETF keeps its latest TOP 10 snapshot, while only
structured changes are retained for one year.
