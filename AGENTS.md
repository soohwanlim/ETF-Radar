# ETF Radar — AGENTS.md

> Antigravity 2.0 에이전트가 이 프로젝트를 이해하고 일관되게 작업하기 위한 컨텍스트 문서입니다.
> 새 세션을 시작할 때마다 이 파일을 먼저 읽어주세요.

---

## 프로젝트 한 줄 요약

**국내 ETF 수익률 비교 + 구성종목 변경 감지 웹 서비스**
- 토스증권, 네이버금융에 없는 "ETF 구성종목 변경 감지"가 핵심 차별점
- 월 운영비 $0 목표 (Cloudflare Pages + Workers)
- Antigravity 2.0 + Gemini 3.5 Flash 기반으로 개발

---

## Antigravity 2.0 사용 가이드

### 새 기능 개발 시작 전 — 반드시 이것부터
```
/grill-me
```
AI가 먼저 질문을 쏟아내게 한다. 불명확한 것(색상, 데이터 구조, 예외 처리 등)을
미리 정리하고 시작해야 나중에 재작업이 없다.

### 큰 기능 단위로 작업할 때
```
/goal: [기능명] 구현
예) /goal: ETF 수익률 랭킹 페이지 구현 — RankingTable 컴포넌트, PeriodTab, API 연동 포함
```
중간에 끊지 않고 끝까지 완성시킨다.
완료 후 반드시 `/browser`로 확인.

### UI 작업 후 항상
```
/browser
```
실제 브라우저에서 렌더링, 클릭, 반응형 확인.
AI가 스스로 버그를 찾고 수정하게 둔다.

### 위험한 작업 전 (Workers 배포, KV 데이터 수정 등)
```json
// .antigravity/hooks.json — 고위험 작업 전 확인 요청
{
  "before_file_write": ["workers/", "wrangler.toml"],
  "action": "confirm",
  "message": "Cloudflare Workers 파일 수정 — 배포에 영향을 줍니다. 계속할까요?"
}
```

### 서브에이전트 활용 (큰 페이지 개발 시)
Antigravity 2.0은 병렬 서브에이전트를 자동으로 생성한다.
예) 비교 페이지 개발 시:
- Frontend Agent → CompareBar, LineChart 컴포넌트
- API Agent → /api/compare 엔드포인트
- Test Agent → /browser로 실제 동작 검증
→ 동시에 진행되므로 개입하지 말고 완료 보고를 기다릴 것

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 18 + Vite |
| 스타일 | Tailwind CSS |
| 차트 | Recharts |
| 라우팅 | React Router v6 |
| 상태관리 | Zustand |
| 패키지 매니저 | pnpm |
| 배포 | Cloudflare Pages |
| 서버리스 | Cloudflare Workers |
| 캐시·스토리지 | Cloudflare Workers KV |
| 스케줄러 | Cloudflare Workers Cron |
| 데이터 소스 | KRX 공공 데이터 API |

---

## 핵심 기능 (우선순위 순)

1. **기간별 수익률 랭킹** — 1주/1개월/3개월/1년 탭
2. **테마별 핫 ETF** — 섹터 클릭 시 구성종목 표시
3. **구성종목 변경 감지** ⭐ — 매일 KRX 스냅샷 비교, 변경사항 웹 표시
4. **ETF 비교** — 최대 4개 선택, 수익률 레이스 차트
5. **포트폴리오 시뮬레이터** — 비중 조절 + 백테스트 (Phase 2)
6. **내 ETF 알림** — 즐겨찾기 + 변경 시 알림 (Phase 3)

---

## 디렉토리 구조

```
etf-radar/
├── .antigravity/
│   └── hooks.json                # Antigravity 훅 설정 (고위험 작업 확인)
├── src/
│   ├── pages/
│   │   ├── Home.jsx              # 메인: 랭킹 + 오늘의 변경
│   │   ├── Theme.jsx             # 테마 핫 ETF
│   │   ├── Compare.jsx           # ETF 비교
│   │   ├── ETFDetail.jsx         # ETF 상세 + 변경 이력
│   │   └── Portfolio.jsx         # 포트폴리오 시뮬 (Phase 2)
│   ├── components/
│   │   ├── ETFCard.jsx           # ETF 카드 (랭킹용)
│   │   ├── RankingTable.jsx      # 수익률 랭킹 테이블
│   │   ├── ThemeCard.jsx         # 테마 카드
│   │   ├── CompareBar.jsx        # 하단 플로팅 비교 바
│   │   ├── PeriodTab.jsx         # 기간 탭 (1주/1개월/3개월/1년)
│   │   ├── ChangeAlert.jsx       # 구성종목 변경 알림 카드
│   │   ├── HoldingsTimeline.jsx  # 변경 이력 타임라인
│   │   └── charts/
│   │       ├── LineChart.jsx     # 수익률 꺾은선
│   │       ├── PieChart.jsx      # 섹터 비중 파이
│   │       └── BarChart.jsx      # 구성종목 비중 바
│   ├── store/
│   │   ├── compareStore.js       # 비교 선택 상태 (Zustand)
│   │   └── watchlistStore.js     # 즐겨찾기 (localStorage 연동)
│   ├── data/
│   │   ├── etf-list.json         # ETF 기본 정보 (정적, 월 1회 갱신)
│   │   ├── themes.json           # 테마-ETF 매핑
│   │   └── holdings.json         # 구성종목 초기 데이터
│   ├── hooks/
│   │   ├── useETFData.js         # ETF 시세·수익률 fetch
│   │   ├── useChanges.js         # 구성종목 변경 데이터 fetch
│   │   └── usePeriod.js          # 기간 탭 상태
│   └── utils/
│       └── format.js             # 숫자·날짜 포맷 유틸
├── workers/
│   ├── proxy.js                  # API 프록시 라우터 (CORS 우회)
│   └── scheduler.js              # Cron 스케줄러 (매일 오후 4시)
├── public/
├── wrangler.toml                 # Cloudflare 설정
├── AGENTS.md                     # 이 파일
└── package.json
```

---

## 코딩 컨벤션

- **컴포넌트**: 함수형 + hooks, class 컴포넌트 금지
- **스타일**: Tailwind CSS 유틸리티 클래스만, 별도 CSS 파일 최소화
- **상태**: 전역 → Zustand, 로컬 → useState/useReducer
- **API 호출**: 커스텀 훅으로 추상화
- **에러 처리**: 모든 fetch에 try/catch + 로딩/에러 상태 관리
- **타입**: TypeScript 미사용 (빠른 프로토타이핑 우선)
- **파일명**: 컴포넌트 PascalCase, 유틸·훅 camelCase
- **커밋**: feat / fix / chore / docs 컨벤션 준수

---

## API 구조

### Workers 엔드포인트

```
GET /api/etf/list                 # ETF 전체 목록
GET /api/etf/:code                # ETF 상세 정보
GET /api/etf/:code/price          # 시세·수익률 (?period=1w|1m|3m|1y)
GET /api/etf/:code/holdings       # 구성종목 현재
GET /api/etf/:code/changes        # 특정 ETF 변경 이력
GET /api/rankings                 # 수익률 랭킹 (?period=1w|1m|3m|1y)
GET /api/themes                   # 테마별 ETF
GET /api/changes                  # 오늘의 전체 구성종목 변경사항
```

### Workers KV 키 구조

```
etf:list                          # ETF 기본 정보 목록
etf:price:{code}:{period}         # 시세 캐시
etf:holdings:{code}               # 구성종목 현재
snapshot:{code}:{YYYY-MM-DD}      # 일별 구성종목 스냅샷 (90일 보존)
changes:{YYYY-MM-DD}              # 당일 전체 변경사항
```

---

## 구성종목 변경 감지 핵심 로직

```javascript
// workers/scheduler.js
// Cron: "0 7 * * 1-5" (평일 오후 4시 KST = UTC 7시)

async function detectChanges(etfCode, env) {
  const today = await fetchHoldingsFromKRX(etfCode);
  const yesterday = await env.KV.get(`snapshot:${etfCode}:${getYesterday()}`);

  if (!yesterday) {
    await env.KV.put(`snapshot:${etfCode}:${getToday()}`, JSON.stringify(today));
    return null;
  }

  const diff = compareHoldings(JSON.parse(yesterday), today);
  // diff: { newEntries, removedEntries, rankChanges, weightChanges }

  if (hasSignificantChange(diff)) {
    await env.KV.put(`changes:${getToday()}`, JSON.stringify(diff));
  }

  // 90일 이전 스냅샷 자동 삭제
  await env.KV.delete(`snapshot:${etfCode}:${get90DaysAgo()}`);
  await env.KV.put(`snapshot:${etfCode}:${getToday()}`, JSON.stringify(today));
  return diff;
}
```

---

## 데이터 소스 전략

### Phase별 사용 소스

| 데이터 | 소스 | 방식 | 비고 |
|--------|------|------|------|
| ETF 시세·수익률 | 네이버 금융 | Workers 크롤링 | MVP |
| ETF 기본 정보 | KRX 데이터시스템 | Workers 크롤링 | MVP |
| 구성종목 (변경 감지용) | KRX 데이터시스템 | Workers 크롤링 | MVP |
| 전체 데이터 | 한국투자증권 오픈API | 공식 REST API | 제휴 후 |

### 소스별 상세

**네이버 금융** (MVP 메인)
- URL 패턴: `https://finance.naver.com/fund/etfItemDetail.naver?itemCode={code}`
- ETF 수익률, 시세, 기본 정보 포함
- Workers에서 HTML 파싱 후 JSON 반환

**KRX 데이터시스템** (구성종목 전용)
- URL: `https://data.krx.co.kr`
- ETF 구성종목 데이터 제공 (공공기관 → 크롤링 법적으로 안전)
- 갱신: 장 마감 오후 3시 30분 → Workers Cron 오후 4시 실행
- 응답 형식: JSON API (헤더 설정 필요)

**한국투자증권 오픈API** (트래픽 생긴 후 전환)
- 개인 계정 API는 본인 계좌 전용 → 외부 서비스 사용 불가
- 외부 서비스 연동은 반드시 **제휴 신청** 필요 (사업자 등록 후 심사)
- 포털: `https://apiportal.koreainvestment.com`
- ⚠️ MVP 단계에서 사용 금지 — 제휴 승인 전까지 크롤링으로 대체

### 갱신 스케줄
```
평일 오후 4시 (KST) — Workers Cron: "0 7 * * 1-5"
  1. KRX에서 ETF 구성종목 fetch
  2. 전일 KV 스냅샷과 diff 계산
  3. 변경사항 KV 저장
  4. 네이버 금융에서 시세·수익률 fetch
  5. KV 캐시 갱신
```

---

## 주의사항

1. **투자 권유 문구 필수**: 모든 페이지 하단 면책 문구
2. **크롤링 소스 CORS**: 네이버·KRX 직접 호출 불가 → Workers 프록시 경유 필수
3. **데이터 지연**: EOD 기준임을 UI에 명시 ("전일 종가 기준")
4. **Workers KV 한도**: 무료티어 1GB — 스냅샷 크기 모니터링
5. **색맹 대응**: 수익률 표시 시 색상 + ▲▼ 기호 함께 사용
6. **한국투자증권 API 사용 금지 (MVP)**: 개인 계정 API는 본인 계좌 전용. 외부 서비스 연동은 제휴 계약 필수. 트래픽 생기고 사업자 등록 후 제휴 신청할 것
7. **네이버 금융 크롤링**: 상업적 규모 성장 시 이용약관 재검토 필요. MVP 수준에서만 사용

---

## 현재 개발 단계

**Phase 1 진행 중**
- [x] PRD 작성 완료
- [x] AGENTS.md 작성 완료
- [ ] GitHub 레포 생성 + 초기 커밋
- [ ] Antigravity 2.0 프로젝트 연결
- [ ] pnpm create vite (React + Tailwind 세팅)
- [ ] wrangler 설치 + Cloudflare 계정 연결
- [ ] Cloudflare Pages 첫 배포 (빈 앱)
- [ ] Workers 프록시 구현 + KRX API 연동 테스트
- [ ] 수익률 랭킹 메인 페이지
- [ ] 테마 페이지
- [ ] 구성종목 변경 감지 스케줄러
- [ ] ETF 상세 페이지

---

## 블로그 시리즈

| 편 | 제목 | 상태 |
|----|------|------|
| 1편 | 기획 — 왜 만들었고, 어떻게 설계했나 | ✍️ 작성 중 |
| 2편 | 환경 세팅 — Antigravity 2.0 + Cloudflare 첫 배포 | 예정 |
| 3편 | 데이터 연동 — KRX API + Workers 프록시 | 예정 |
| 4편 | 핵심 UI — ETF 랭킹 + 테마 + 변경 감지 | 예정 |
| 5편 | 비교 기능 + 포트폴리오 시뮬레이터 | 예정 |
| 6편 | 배포 최적화 + 회고 | 예정 |