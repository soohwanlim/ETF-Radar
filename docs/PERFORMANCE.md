# ETF Radar 성능 측정 가이드

성능 측정은 Chrome DevTools Lighthouse의 모바일 기준을 기본값으로 사용한다. 자동화 전에는 기준점(baseline)을 먼저 만들고, 이후 UI 변경이나 데이터 크기 증가가 있을 때 같은 조건으로 다시 측정한다.

## 측정 대상

| 페이지 | URL | 목적 |
| --- | --- | --- |
| 홈 | `https://etf-radar.net/` | 첫 화면, 랭킹, 전체 ETF 접기 성능 |
| 테마 | `https://etf-radar.net/theme` | 테마 카드와 ETF 목록 |
| 비교 | `https://etf-radar.net/compare` | Recharts 차트 지연 로딩 영향 |
| 변경 감지 | `https://etf-radar.net/changes` | 변경 이력 목록 렌더링 |
| 정책 | `https://etf-radar.net/policy` | AdSense/SEO 필수 페이지 |
| 상세 | `https://etf-radar.net/etf/069500` | ETF 상세, holdings, 차트 |

## 목표 점수

| 항목 | 목표 |
| --- | --- |
| Performance | 85+ |
| Accessibility | 90+ |
| Best Practices | 90+ |
| SEO | 90+ |

핵심 지표는 LCP, CLS, TBT를 우선 확인한다.

## 수동 측정 절차

1. Chrome에서 측정 URL을 연다.
2. DevTools를 연다.
3. `Lighthouse` 탭으로 이동한다.
4. Mode는 `Navigation`, Device는 `Mobile`로 둔다.
5. Categories는 `Performance`, `Accessibility`, `Best Practices`, `SEO`를 선택한다.
6. `Analyze page load`를 실행한다.
7. 아래 기록표에 점수를 남긴다.

## 기준점 기록표

| 날짜 | 페이지 | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | 메모 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2026-06-18 | 홈 | 74 | 95 | 100 | 92 | 5.4 s | 0 | 0 ms | LCP/FCP 개선 필요 |
| 2026-06-18 | 테마 | 77 | 95 | 100 | 92 | 4.7 s | 0 | 0 ms | LCP 개선, 하위 경로 canonical 점검 |
| 2026-06-18 | 비교 | 88 | 100 | 100 | 92 | 2.9 s | 0.15 | 0 ms | CLS 점검 |
| 2026-06-18 | 변경 감지 | 64 | 93 | 100 | 92 | 4.8 s | 0 | 500 ms | 최우선 최적화 대상, TBT 개선 필요 |
| 2026-06-18 | 정책 | 83 | 100 | 100 | 92 | 3.9 s | 0 | 0 ms | LCP 소폭 개선 |
| 2026-06-18 | 상세 | 80 | 94 | 100 | 92 | 2.1 s | 0.412 | 30 ms | CLS 최우선 점검 |

측정 메모: PageSpeed Insights API는 429로 실패하여 로컬 Chrome + Lighthouse CLI로 모바일 조건을 측정했다. 일부 실행은 Chrome 임시 프로필 삭제 단계에서 EPERM을 반환했지만 JSON 결과 파일은 생성되어 점수 추출에 사용했다.

## 개선 우선순위

1. 메인 화면에서 불필요한 대량 렌더링 줄이기
2. Recharts가 필요한 상세/비교 페이지 지연 로딩 유지
3. 큰 JSON을 페이지별로 나누거나 필요한 필드만 로드
4. 이미지 크기와 favicon/OG asset 용량 점검
5. 접근성 경고가 있으면 버튼 이름, 대비, heading 순서부터 수정

## 자동화 후보

나중에 트래픽이 붙고 UI 변경이 잦아지면 Lighthouse CI를 GitHub Actions에 추가한다. 현재는 수동 측정으로 기준점을 만든 뒤, 문제가 보이는 페이지만 최적화하는 것이 더 가볍다.
