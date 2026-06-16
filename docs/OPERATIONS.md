# ETF Radar 운영 체크리스트

ETF Radar는 별도 백엔드 없이 GitHub Actions가 데이터를 갱신하고 Cloudflare Pages가 정적 파일을 배포하는 구조다. 운영 목표는 자동 수집 실패를 빨리 발견하고, 페이지 성능과 정책 리스크를 주기적으로 확인하는 것이다.

## 매일 확인

- GitHub Actions `Collect daily ETF data`가 18:10, 19:10 KST 중 한 번 이상 성공했는지 확인한다.
- GitHub Actions `Check deployed ETF data health`가 21:10 KST에 성공했는지 확인한다.
- 사이트 상단 상태 바의 기준일이 최신 거래일 종가인지 확인한다.
- 실패 시 GitHub Issue가 자동 생성된다. 같은 날짜 실패가 반복되면 기존 Issue에 실행 링크가 댓글로 추가된다.
- KRX 데이터 공개 지연이면 수동 재실행 전에 10~30분 기다린다.

## Cloudflare Web Analytics

- Cloudflare Dashboard > Workers & Pages > `etf-radar` > Metrics 또는 Web Analytics에서 확인한다.
- 초기에는 방문 데이터가 없거나 적을 수 있다. 배포 직후에는 다음 배포부터 수집이 반영될 수 있다.
- 주로 확인할 지표:
  - 방문자 수와 페이지뷰 추세
  - 상위 방문 페이지
  - 국가/디바이스 비중
  - 오류 또는 비정상적인 트래픽 급증

## GitHub Actions 실패 알림

- 코드상 자동 알림: 수집 워크플로우 실패 시 GitHub Issue 생성
- 배포 데이터 알림: 21:10 KST에 배포된 `/data/status.json`이 최신이 아니거나 `failedCount > 0`이면 GitHub Issue 생성
- 공식 헬스체크 주소: `https://etf-radar.net/data/status.json`
- GitHub Actions Repository Variable을 쓴다면 `STATUS_URL=https://etf-radar.net/data/status.json`로 설정한다.
- GitHub 기본 알림: 저장소 Watch 설정에서 `All Activity` 또는 Actions 관련 이메일 알림을 켠다.
- 실패 Issue를 닫는 기준:
  - 재실행 성공
  - 원인이 KRX/Naver 일시 장애로 확인됨
  - 코드 수정 후 다음 스케줄 성공 확인

### GitHub 앱 알림

GitHub 모바일 앱에서도 Issue 생성 알림을 받을 수 있다.

1. 저장소 페이지에서 `Watch`를 `All Activity` 또는 최소 `Issues` 알림을 받을 수 있는 상태로 설정한다.
2. GitHub 모바일 앱 > Settings > Notifications에서 push 알림을 켠다.
3. 휴대폰 OS 설정에서도 GitHub 앱 알림을 허용한다.

## 성능 측정

- Chrome DevTools Lighthouse에서 모바일 기준으로 먼저 측정한다.
- 측정 대상과 기록표는 `docs/PERFORMANCE.md`를 따른다.
- 우선 목표:
  - Performance 85+
  - Accessibility 90+
  - Best Practices 90+
  - SEO 90+
- 번들 최적화 후보:
  - Recharts가 들어간 상세/비교 페이지 지연 로딩 유지
  - 메인 화면에 필요한 데이터만 먼저 렌더링
  - 큰 JSON 파일 분리 또는 페이지별 로딩

## 광고와 정책

Google AdSense 신청 전 최소 정비 항목:

- 개인정보처리방침 페이지: `/policy`
- 투자 정보 면책 페이지: `/policy`
- 문의 수단 또는 운영자 소개: `/policy`
- 광고/쿠키 사용 안내: 광고 적용 전 `/policy`에 보강
- 데이터 출처와 기준일 표시: 각 화면 및 `/policy`

금융 데이터 서비스이므로 모든 화면에서 실시간 시세가 아니며 투자 권유가 아니라는 문구를 유지한다.

Search Console 등록과 sitemap 제출은 `docs/SEARCH_CONSOLE.md`를 따른다.

## 추가 운영 목표 후보

- Cloudflare Pages 커스텀 도메인 연결
- Actions 실패 Issue에 최근 `status.json` 상태 첨부
- 월 1회 Lighthouse 결과 기록
- 사용자 피드백 수집 폼 또는 GitHub Discussions 연결
- Google AdSense 신청 전 커스텀 도메인, 충분한 콘텐츠, 정책 페이지 최종 점검
