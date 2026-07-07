import { Link } from 'react-router-dom';
import { Cookie, Database, Mail, ShieldAlert, UserRound } from 'lucide-react';

const UPDATED_AT = '2026-07-07';

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-2xl bg-blue-50 p-2 text-blue-600">
          <Icon size={18} />
        </span>
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function Policy() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">정책 및 이용 안내</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 개인정보처리방침과 이용 안내
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 주식형 현물 ETF의 종가 기준 수익률과 네이버 금융 TOP 10 구성자산 변화를 정적 데이터로 보여주는 정보 서비스입니다.
          이 페이지는 개인정보 처리, 광고와 쿠키, 데이터 출처, 투자 유의사항, 문의 방법을 안내합니다. 최종 수정일은 {UPDATED_AT}입니다.
        </p>
      </div>

      <Section title="개인정보처리방침" icon={UserRound}>
        <p>
          ETF Radar는 회원가입, 로그인, 댓글, 결제 기능을 제공하지 않습니다. 사용자의 이름, 연락처, 주민등록번호, 금융계좌 정보처럼
          개인을 직접 식별할 수 있는 정보를 자체 서버에 저장하지 않습니다.
        </p>
        <p>
          서비스 품질 확인을 위해 Cloudflare Web Analytics와 Google Analytics를 사용할 수 있습니다. 이 분석 도구들은 페이지 조회,
          접속 국가, 기기 유형, 브라우저 등 통계 정보를 제공하며, ETF Radar는 이 정보를 개별 사용자를 식별하기 위한 목적으로 사용하지 않습니다.
        </p>
        <p>
          브라우저나 광고 플랫폼 설정에 따라 일부 쿠키 또는 유사 기술이 사용될 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키 저장을 제한하거나 삭제할 수 있습니다.
        </p>
      </Section>

      <Section title="광고와 쿠키" icon={Cookie}>
        <p>
          ETF Radar는 Google AdSense 등 광고 서비스를 적용할 수 있습니다. 광고가 노출되는 경우 Google과 제3자 광고 제공업체는
          광고 제공, 빈도 제한, 부정 사용 방지, 성과 측정을 위해 쿠키나 유사 기술을 사용할 수 있습니다.
        </p>
        <p>
          사용자는 Google 광고 설정 또는 브라우저 개인정보 설정을 통해 맞춤형 광고 사용 여부를 관리할 수 있습니다. 광고가 표시되더라도
          ETF Radar의 데이터, 순위, 신호는 광고주로부터 영향을 받지 않습니다.
        </p>
      </Section>

      <Section title="투자 유의사항 및 면책" icon={ShieldAlert}>
        <p>
          ETF Radar의 모든 정보는 참고용입니다. 특정 ETF, 주식, 금융상품의 매수·매도·보유를 권유하지 않으며,
          투자 자문이나 투자 일임 서비스를 제공하지 않습니다.
        </p>
        <p>
          화면에 표시되는 가격은 실시간 시세가 아니라 기준일 종가입니다. 수익률, NAV, 순자산, 구성종목 정보는 공개 데이터를 기반으로 가공되며
          지연, 누락, 오류가 발생할 수 있습니다.
        </p>
        <p>
          구성종목 변경 감지는 네이버 금융 TOP 10 구성자산을 기준으로 합니다. 따라서 TOP 10 이탈은 ETF 전체 포트폴리오에서 완전히 편출됐다는 뜻이 아니며,
          1CU당 구성수량 변화도 ETF 설정·환매, 리밸런싱, 주가 변동, 데이터 제공 방식의 영향을 받을 수 있습니다.
        </p>
        <p>
          실제 투자 전에는 KRX, 금융투자협회, 운용사 공식 PDF, 증권사 리서치와 거래 화면을 함께 확인해야 합니다. 투자 판단과 결과에 대한 최종 책임은 투자자 본인에게 있습니다.
        </p>
      </Section>

      <Section title="데이터 출처와 업데이트" icon={Database}>
        <p>
          종가, NAV, 순자산, 시가총액 등 ETF 일별 매매정보는 KRX Open API를 사용합니다. ETF 기본정보와 TOP 10 구성자산은 네이버 금융 공개 페이지를 기준으로 수집합니다.
        </p>
        <p>
          데이터는 GitHub Actions를 통해 평일 오전 KST 기준으로 자동 수집됩니다. 수집한 JSON 파일은 Cloudflare Pages에서 정적 파일로 배포되며,
          별도 실시간 백엔드 서버나 사용자 데이터베이스를 운영하지 않습니다.
        </p>
        <p>
          KRX 또는 네이버 금융의 응답 지연, 공휴일, 데이터 형식 변경이 있을 경우 업데이트가 늦어질 수 있습니다. 사이트 상단의 상태 영역에서 기준일과 마지막 확인 시간을 확인할 수 있습니다.
        </p>
      </Section>

      <Section title="문의와 정정 요청" icon={Mail}>
        <p>
          오류 제보, 데이터 정정 요청, 서비스 문의는 GitHub 저장소의 Issue를 통해 남길 수 있습니다. 가능한 경우 기준일, ETF 코드, 확인한 화면을 함께 적어주면 더 빠르게 확인할 수 있습니다.
        </p>
        <p>
          <a
            href="https://github.com/soohwanlim/ETF-Radar/issues"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-blue-600 hover:text-blue-700"
          >
            ETF Radar GitHub Issues
          </a>
        </p>
      </Section>

      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        서비스 소개는 <Link to="/about" className="font-bold text-blue-600 hover:text-blue-700">About</Link>,
        지표 해석 기준은 <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">데이터 해석 안내</Link>에서 확인할 수 있습니다.
      </div>
    </div>
  );
}