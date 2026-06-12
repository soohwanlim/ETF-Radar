# ETF Radar - AGENTS.md

## Project

국내 주식형 현물 ETF의 종가 수익률 비교와 네이버 금융 TOP 10 구성자산 변경 감지 서비스.
월 운영비 0원을 목표로 하며 Cloudflare Pages에서 정적 React 앱과 JSON을 제공한다.

## Architecture

이 프로젝트는 실시간 서비스가 아니다. 별도 백엔드, Cloudflare Worker, KV를 사용하지 않는다.

```text
GitHub Actions (평일 18:10, 19:10 KST)
  -> KRX Open API ETF 종가 전체 수집
  -> 네이버 금융 국내 현물 ETF 목록/상세/TOP 10 수집
  -> public/data JSON 갱신
  -> 변경 시 Git 자동 커밋
  -> Cloudflare Pages 자동 재배포
```

프런트엔드는 `/api`를 호출하지 않고 `/data/*.json`만 읽는다.

## Data files

```text
public/data/manifest.json
public/data/etfs.json
public/data/holdings.json
public/data/price-series.json
public/data/changes/latest.json
public/data/changes/history.json
```

- `etfs.json`: 종가, NAV, 순자산, 기본정보, 기간 수익률
- `holdings.json`: ETF별 네이버 금융 TOP 10 최신 스냅샷
- `price-series.json`: 최근 400일 일별 + 이전 월말 가격
- `changes/history.json`: 최근 1년간 TOP 10 진입/이탈과 주요 비중 변화
- 최초 수집에서는 변경 이력을 만들지 않고 기준 스냅샷만 저장한다.

## Data sources

- 종가/NAV/순자산/기초지수: KRX Open API `etf_bydd_trd`
- ETF 대상 필터/기본정보/TOP 10/초기 가격 이력: 네이버 금융
- 구성종목은 전체 PDF가 아니라 TOP 10이므로 UI에서 전체 편입/편출로 표현하지 않는다.
- 현재 지원 범위는 국내 주식형 현물 ETF이며 해외, 채권, 원자재, 레버리지, 인버스, 커버드콜은 제외한다.

## Secrets

- `KRX_API_KEY`는 코드, JSON, 로그에 저장하지 않는다.
- GitHub Actions Repository Secret으로만 등록한다.
- 로컬 실행은 현재 셸 환경변수로만 전달한다.

## Commands

```bash
npm ci
npm test
npm run lint
npm run build
npm run collect:data
```

`npm run collect:data`에는 `KRX_API_KEY` 환경변수가 필요하다. 같은 KRX 기준일 데이터가 이미 있으면 즉시 종료한다.
강제 재생성은 로컬 점검용 `FORCE_COLLECT=1`을 사용할 수 있다.

## Stack

- React + Vite
- Tailwind CSS
- Recharts
- React Router
- Zustand
- GitHub Actions
- Cloudflare Pages

## Conventions

- 함수형 컴포넌트와 hooks 사용
- 전역 상태는 Zustand, 로컬 상태는 React hooks
- 데이터 접근은 `src/data/staticData.js`를 통해 처리
- UI에서 가격은 `현재가`가 아니라 `기준일 종가`로 표현
- 모든 데이터 화면에 기준일과 출처를 명확히 표시
- 투자 권유가 아니라는 면책 문구 유지
- UI 변경 후 브라우저 또는 실제 HTTP 경로로 검증
- 커밋 메시지는 `feat`, `fix`, `refactor`, `chore`, `docs` 형식 사용

## Deployment prerequisites

1. GitHub Actions Secret `KRX_API_KEY` 등록
2. Cloudflare Pages를 GitHub 저장소 `main` 브랜치에 연결
3. Build command: `npm run build`
4. Output directory: `dist`

Cloudflare API 토큰, KV namespace, Worker 배포는 필요하지 않다.
