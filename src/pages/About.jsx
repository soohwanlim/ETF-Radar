import { Link } from 'react-router-dom';
import { Activity, Database, ShieldCheck, Target, Workflow } from 'lucide-react';

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
          국내 ETF를 수익률과 구성종목 변화로 비교하는 데이터 서비스
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 주식형 현물 ETF를 매일 같은 기준으로 모아 비교하기 위해 만든 정적 데이터 서비스입니다.
          종가 수익률, 신규 상장 ETF, 네이버 금융 TOP 10 구성자산 변화, 액티브 ETF의 공통 매수 신호를 한 화면에서 확인할 수 있도록 정리합니다.
          특정 상품을 추천하기보다 사용자가 ETF의 성과와 포트폴리오 변화를 스스로 비교할 수 있게 돕는 것이 목적입니다.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          국내 ETF 정보는 여러 사이트에 흩어져 있고, 수익률과 구성종목 변화를 동시에 보기 어렵습니다. ETF Radar는 이 반복 확인 과정을 자동화해
          “어떤 ETF가 올랐는지”, “최근 어떤 종목이 여러 ETF에서 함께 늘었는지”, “액티브 ETF 운용 방향에 공통점이 있는지”를 빠르게 훑어볼 수 있게 합니다.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard title="제공하는 정보" icon={Activity}>
          <p>
            ETF별 기간 수익률, KOSPI200·KOSDAQ150 비교 수익률, 테마별 대표 ETF, 액티브 ETF의 공통 구성수량 증가 신호,
            최근 TOP 10 구성종목 진입·이탈과 1CU당 구성수량 변화를 제공합니다.
          </p>
          <p>
            모든 화면에는 기준일을 표시하며, 가격은 현재가가 아니라 기준일 종가입니다. 실시간 주문이나 매매 판단을 위한 도구가 아니라,
            장 마감 이후 ETF 흐름을 비교하고 복기하기 위한 서비스입니다.
          </p>
        </InfoCard>

        <InfoCard title="운영 방식" icon={Workflow}>
          <p>
            GitHub Actions가 평일 오전 KST 기준으로 KRX Open API와 네이버 금융 공개 데이터를 수집합니다.
            수집한 데이터는 JSON 파일로 정리되어 GitHub 저장소에 자동 커밋되고, Cloudflare Pages가 정적 파일로 배포합니다.
          </p>
          <p>
            별도 백엔드 서버, 데이터베이스, 로그인 시스템을 두지 않았습니다. 데이터가 실시간이 아닌 종가 기준이기 때문에 정적 배포 구조가 적합했고,
            운영 비용과 장애 지점을 줄일 수 있었습니다.
          </p>
        </InfoCard>

        <InfoCard title="데이터 출처" icon={Database}>
          <p>
            종가, NAV, 순자산, 시가총액 등 일별 매매정보는 KRX Open API를 사용합니다. ETF 기본정보와 TOP 10 구성자산은 네이버 금융 공개 페이지를 기준으로 수집합니다.
          </p>
          <p>
            구성종목 정보는 전체 PDF가 아니라 TOP 10 스냅샷입니다. 따라서 TOP 10 이탈은 전체 포트폴리오에서 완전히 편출됐다는 뜻이 아니며,
            상위 10개 목록 밖으로 이동했다는 의미로 해석해야 합니다.
          </p>
        </InfoCard>

        <InfoCard title="투자 유의사항" icon={ShieldCheck}>
          <p>
            ETF Radar의 정보는 참고용이며 특정 ETF, 주식, 금융상품의 매수·매도·보유를 권유하지 않습니다. 투자 판단과 결과에 대한 책임은 투자자 본인에게 있습니다.
          </p>
          <p>
            공개 데이터 기반 서비스이므로 지연, 누락, 오류가 발생할 수 있습니다. 실제 투자 전에는 KRX, 금융투자협회, 운용사 공식 자료와 증권사 정보를 함께 확인해야 합니다.
          </p>
        </InfoCard>
      </div>

      <InfoCard title="ETF Radar가 다르게 보는 것" icon={Target}>
        <p>
          일반적인 ETF 비교 서비스는 가격, 수익률, 보수, 순자산 같은 정적인 지표를 중심으로 보여줍니다. ETF Radar는 여기에 더해
          TOP 10 구성자산이 어떻게 바뀌었는지, 같은 종목을 여러 ETF가 동시에 늘렸는지, 액티브 ETF 사이에서 공통으로 나타나는 변화가 있는지를 함께 보여줍니다.
        </p>
        <p>
          예를 들어 1CU당 보유 수량은 줄었지만 비중이 유지되는 경우가 있습니다. 이때 단순히 “매도”로만 해석하면 오해가 생길 수 있어,
          주가 상승이나 비중 관리 가능성을 함께 볼 수 있도록 “수량 감소 · 비중 유지” 신호를 별도로 분류합니다.
        </p>
      </InfoCard>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        지표 해석 기준이 궁금하다면{' '}
        <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">
          데이터 해석 안내
        </Link>
        에서 수익률, TOP 10 구성종목 변화, 1CU당 구성수량 변화, 액티브 ETF 신호의 의미와 한계를 확인할 수 있습니다.
      </section>
    </div>
  );
}
