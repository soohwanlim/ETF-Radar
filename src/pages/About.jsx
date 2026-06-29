import { Link } from 'react-router-dom';
import { Activity, Database, RefreshCw, ShieldCheck } from 'lucide-react';

function InfoCard({ title, icon: Icon, children }) {
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

export default function About() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">About ETF Radar</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          국내 ETF를 종가 데이터와 구성 변화로 읽는 도구
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 주식형 현물 ETF의 종가 수익률, 신규 상장, TOP 10 구성자산 변화,
          액티브 ETF의 1CU당 구성수량 변화를 매일 정적 데이터로 정리합니다.
          특정 상품 추천보다 ETF 간 비교와 변화 감지를 더 쉽게 만드는 것이 목적입니다.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="무엇을 보여주나요" icon={Activity}>
          <p>
            ETF별 기간 수익률, KOSPI200·KOSDAQ150 비교 수익률, 테마별 대표 ETF,
            액티브 ETF의 공통 매수 신호, 최근 TOP 10 구성종목 변화를 제공합니다.
          </p>
          <p>
            실시간 호가나 주문 기능이 아니라, 장마감 후 업데이트되는 기준일 종가 데이터 중심 서비스입니다.
          </p>
        </InfoCard>

        <InfoCard title="어떻게 업데이트하나요" icon={RefreshCw}>
          <p>
            GitHub Actions가 평일 오전 KST 기준으로 KRX와 네이버 금융 공개 데이터를 수집하고,
            변경된 JSON 파일을 Cloudflare Pages에 정적 파일로 배포합니다.
          </p>
          <p>
            별도 백엔드 서버, 로그인, 결제, 실시간 데이터베이스 없이 운영비 0원에 가깝게 운영하는 구조입니다.
          </p>
        </InfoCard>

        <InfoCard title="데이터 출처" icon={Database}>
          <p>
            종가, NAV, 순자산, 시가총액 등 일별 매매정보는 KRX Open API를 사용합니다.
            ETF 기본정보와 TOP 10 구성자산은 네이버 금융 공개 페이지를 기준으로 수집합니다.
          </p>
          <p>
            구성종목은 전체 PDF가 아니라 TOP 10 스냅샷이므로 전체 편입·편출로 해석하면 안 됩니다.
          </p>
        </InfoCard>

        <InfoCard title="투자 유의사항" icon={ShieldCheck}>
          <p>
            ETF Radar의 정보는 참고용이며 특정 ETF, 주식, 금융상품의 매수·매도·보유를 권유하지 않습니다.
            투자 판단과 결과에 대한 책임은 투자자 본인에게 있습니다.
          </p>
          <p>
            데이터 지연, 누락, 오류가 발생할 수 있으므로 실제 투자 전 운용사, KRX, 금융투자협회 등 공식 자료를 함께 확인해야 합니다.
          </p>
        </InfoCard>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        지표 해석 방법이 궁금하다면{' '}
        <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">
          데이터 해석 안내
        </Link>
        를 확인하세요.
      </section>
    </div>
  );
}
