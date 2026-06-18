import { Link } from 'react-router-dom';
import { Database, Mail, ShieldAlert, UserRound } from 'lucide-react';

const UPDATED_AT = '2026-06-16';

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
        <p className="text-sm font-bold text-blue-600">정책 및 안내</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 이용 안내
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 주식형 현물 ETF의 종가 기준 수익률과 네이버 금융 TOP 10 구성자산 변화를
          정적 데이터로 보여주는 정보 서비스입니다. 최종 수정일은 {UPDATED_AT}입니다.
        </p>
      </div>

      <Section title="개인정보처리방침" icon={UserRound}>
        <p>
          ETF Radar는 회원가입, 로그인, 댓글, 결제 기능을 제공하지 않으며 사용자의 이름, 연락처, 주민등록번호,
          금융계좌 정보 등 직접 식별 가능한 개인정보를 자체 서버에 저장하지 않습니다.
        </p>
        <p>
          서비스 품질 확인을 위해 Cloudflare Web Analytics를 사용할 수 있습니다. 이 분석 도구는 쿠키 없이
          페이지 조회, 국가, 기기 유형 등 집계 통계를 제공하며, 개별 사용자를 식별하기 위한 목적으로 사용하지 않습니다.
        </p>
        <p>
          향후 Google AdSense 등 광고 서비스가 적용되면 광고 제공 과정에서 Google 또는 제3자가 쿠키, 광고 식별자,
          유사 기술을 사용할 수 있습니다. 광고 적용 전 관련 고지를 본 페이지에 추가합니다.
        </p>
      </Section>

      <Section title="투자 유의사항 및 면책" icon={ShieldAlert}>
        <p>
          ETF Radar의 모든 정보는 참고용이며 특정 ETF, 주식, 금융상품의 매수·매도·보유를 권유하지 않습니다.
          투자 판단과 그 결과에 대한 책임은 투자자 본인에게 있습니다.
        </p>
        <p>
          수익률, 종가, NAV, 순자산, 구성종목 정보는 외부 공개 데이터를 기반으로 가공되며 지연, 누락, 오류가
          발생할 수 있습니다. 화면에 표시되는 가격은 실시간 시세가 아니라 기준일 종가입니다.
        </p>
        <p>
          구성종목 변경 감지는 네이버 금융의 TOP 10 구성자산을 기준으로 하므로 전체 편입·편출을 의미하지 않습니다.
          1CU당 구성수량 변화도 ETF 설정·환매, 기업행사, 데이터 제공 방식 변화의 영향을 받을 수 있습니다.
        </p>
      </Section>

      <Section title="데이터 출처와 업데이트" icon={Database}>
        <p>
          종가, NAV, 순자산 등 ETF 일별 매매정보는 KRX Open API를 사용합니다. ETF 기본정보와 TOP 10 구성자산은
          네이버 금융 공개 페이지를 기준으로 수집합니다.
        </p>
        <p>
          데이터는 다음날 06:00, 08:00 KST에 GitHub Actions로 자동 수집하고, 변경 사항이 있을 때 Cloudflare Pages에
          정적 파일로 재배포합니다. 별도 실시간 서버나 외부 데이터베이스를 사용하지 않습니다.
        </p>
      </Section>

      <Section title="문의" icon={Mail}>
        <p>
          오류 제보, 데이터 정정 요청, 서비스 문의는 GitHub 저장소의 Issue를 통해 남길 수 있습니다.
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
        메인 화면으로 돌아가려면 <Link to="/" className="font-bold text-blue-600 hover:text-blue-700">홈</Link>을 선택하세요.
      </div>
    </div>
  );
}
