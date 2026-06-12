# ETF Radar data sources

## Secrets

`KRX_API_KEY` must never be committed or exposed to the browser.

- Local Worker: copy `.dev.vars.example` to `.dev.vars` and set the key.
- Cloudflare Worker: run `npx wrangler secret put KRX_API_KEY`.
- GitHub Actions: add an Actions secret named `KRX_API_KEY`.

If a key is pasted into chat, an issue, a log, or a commit, revoke and reissue it before production use.

## Market data

The Worker first calls the official KRX Open API `etf_bydd_trd` endpoint. It provides closing price, NAV,
market capitalization, net assets, volume, and benchmark information. The API requires both an issued key
and approval for the ETF daily trading service.

When KRX is unavailable or unauthorized, the Worker falls back to Naver Finance. The fallback provides
price, NAV, market capitalization, volume, and a three-month return, but it does not provide net assets.
API responses identify both the source and whether the displayed size is net assets or market capitalization.

Use `GET /api/health/data-source` to verify the active data source without exposing the key.

## ETF metadata

Listing date, fund fee, asset manager, fund type, benchmark, and product description are parsed from the
Naver Finance ETF detail page. The page attributes the product description to FnGuide.

## Holdings

The official KRX Open API currently does not expose ETF holdings. ETF Radar therefore uses Naver Finance's
previous-day top 10 holdings for the monitored ETFs. This is not a complete portfolio composition file.
Full holdings detection requires a future adapter for each asset manager's PDF or CSV data.
