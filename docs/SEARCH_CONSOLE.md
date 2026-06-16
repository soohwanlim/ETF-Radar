# Google Search Console 등록 가이드

공식 도메인은 `https://etf-radar.net`이다. Search Console은 도메인 소유권 확인, sitemap 제출, 색인 상태 확인을 위해 사용한다.

## 추천 방식

`Domain property`를 추천한다.

- `etf-radar.net`
- `www.etf-radar.net`
- `http`와 `https`

위 변형을 한 번에 포함해서 관리할 수 있다. Cloudflare에서 도메인을 샀으므로 DNS TXT 인증이 가장 깔끔하다.

## 등록 절차

1. Google Search Console에 접속한다.
2. `속성 추가`를 선택한다.
3. 왼쪽 `도메인` 유형에 `etf-radar.net`을 입력한다.
4. Google이 보여주는 TXT 레코드를 복사한다.
5. Cloudflare Dashboard로 이동한다.
6. `etf-radar.net` 도메인 > `DNS` > `Records`로 이동한다.
7. `Add record`를 누르고 아래처럼 추가한다.

```text
Type: TXT
Name: @
Content: google-site-verification=...
TTL: Auto
```

8. Google Search Console로 돌아가 `확인`을 누른다.
9. DNS 전파 때문에 바로 실패하면 5~30분 뒤 다시 확인한다.

## Sitemap 제출

소유권 확인 후:

1. Search Console의 `Sitemaps` 메뉴로 이동한다.
2. 아래 주소를 제출한다.

```text
https://etf-radar.net/sitemap.xml
```

3. 상태가 `성공`으로 바뀌는지 확인한다.

## 색인 요청

초기에는 아래 URL을 URL 검사로 한 번씩 요청한다.

```text
https://etf-radar.net/
https://etf-radar.net/theme
https://etf-radar.net/changes
https://etf-radar.net/policy
```

ETF 상세 페이지는 동적 라우트가 많으므로 대표 상세 하나만 먼저 요청한다.

```text
https://etf-radar.net/etf/069500
```

## 확인할 항목

- `페이지 색인 생성`에서 제외 사유가 있는지
- `Sitemaps`가 성공인지
- `모바일 사용 편의성` 문제가 있는지
- `robots.txt`가 정상인지
- `https://etf-radar.net/policy`가 색인 가능한지

## AdSense 전 체크

- Search Console 소유권 확인 완료
- Sitemap 제출 완료
- `/policy` 접근 가능
- 사이트 상단에 기준일/데이터 상태 표시
- 푸터에 면책/개인정보/문의 링크 노출
- 며칠간 자동 수집과 헬스체크 정상 동작
