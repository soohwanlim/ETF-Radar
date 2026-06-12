# ETF Radar

국내 주식형 현물 ETF의 종가 수익률과 네이버 금융 TOP 10 구성자산 변화를 보여주는 정적 웹 서비스입니다.

## Data flow

1. GitHub Actions runs at 18:10 and 19:10 KST on weekdays.
2. `npm run collect:data` reads KRX closing data and Naver ETF metadata/holdings.
3. Generated JSON is committed under `public/data`.
4. Cloudflare Pages redeploys the static React site.

No runtime backend, Cloudflare Worker, or external database is required.

## Local commands

```bash
npm ci
npm test
npm run build
KRX_API_KEY=your_key npm run collect:data
```
