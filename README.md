# ETF Radar

국내 주식형 현물 ETF의 종가 수익률과 네이버 금융 TOP 10 구성자산 변화를 보여주는 정적 웹 서비스입니다.

Site: https://etf-radar-834.pages.dev/

Repository description suggestion:

> 국내 ETF 종가 수익률과 TOP 10 구성자산 변화를 매일 자동 수집해 보여주는 정적 ETF 레이더

## Features

- 국내 주식형 현물 ETF 종가 수익률 랭킹
- 1일, 1주, 1개월, 3개월, 1년, 10년 수익률 비교
- 네이버 금융 TOP 10 구성자산 변경 감지
- 테마별 ETF 수익률과 공통 구성종목 변화 확인
- 즐겨찾기와 ETF 비교 분석
- GitHub Actions 기반 자동 수집 및 Cloudflare Pages 정적 배포

## Data flow

1. GitHub Actions runs at 18:10 and 19:10 KST on weekdays.
2. `npm run collect:data` reads KRX closing data and Naver ETF metadata/holdings.
3. Generated JSON is committed under `public/data`.
4. Cloudflare Pages redeploys the static React site.

No runtime backend, Cloudflare Worker, or external database is required.

## Notice

ETF Radar is an informational service only. It does not provide investment advice. All displayed prices are closing prices based on the data date, not real-time quotes.

## Local commands

```bash
npm ci
npm test
npm run build
KRX_API_KEY=your_key npm run collect:data
```
