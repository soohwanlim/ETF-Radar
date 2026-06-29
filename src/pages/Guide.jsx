import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Layers3, RefreshCw, TrendingUp } from 'lucide-react';

function GuideSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-2xl bg-slate-100 p-2 text-slate-700">
          <Icon size={18} />
        </span>
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function Guide() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">데이터 해석 안내</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 지표를 읽는 방법
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ETF Radar는 여러 출처의 공개 데이터를 같은 기준일로 모아 비교합니다.
          아래 설명은 수익률, TOP 10 구성 변화, 1CU당 수량 변화, 액티브 ETF 신호를 해석할 때 필요한 기준입니다.
        </p>
      </section>

      <GuideSection title="종가 기준 수익률" icon={BarChart3}>
        <p>
          화면의 가격과 수익률은 실시간 시세가 아니라 기준일 종가로 계산합니다.
          장중 변동은 반영하지 않으며, KRX 데이터가 안정적으로 제공된 뒤 업데이트됩니다.
        </p>
        <p>
          1일, 1주, 1개월, 3개월, 1년, 10년 수익률은 가능한 과거 가격과 기준일 종가를 비교해 계산합니다.
          신규 상장 ETF처럼 과거 데이터가 부족한 경우 일부 기간 수익률은 비어 있을 수 있습니다.
        </p>
      </GuideSection>

      <GuideSection title="TOP 10 구성종목 변화" icon={Layers3}>
        <p>
          구성종목 변화는 네이버 금융에 표시되는 상위 10개 구성자산 스냅샷을 기준으로 감지합니다.
          따라서 TOP 10 밖의 종목 변화나 전체 PDF 기준 편입·편출을 모두 보여주는 기능은 아닙니다.
        </p>
        <p>
          TOP 10 진입은 새 종목이 상위 10개 목록에 들어온 경우이고, TOP 10 이탈은 이전 상위 10개 목록에 있던 종목이 빠진 경우입니다.
          실제 ETF 전체 포트폴리오에서는 해당 종목을 계속 보유하고 있을 수도 있습니다.
        </p>
      </GuideSection>

      <GuideSection title="1CU당 구성수량 변화" icon={RefreshCw}>
        <p>
          1CU당 구성수량 변화는 같은 ETF의 이전 TOP 10 스냅샷과 최신 스냅샷을 비교해,
          특정 구성종목의 1CU당 주식 수가 얼마나 늘거나 줄었는지를 보여줍니다.
        </p>
        <p>
          수량 증가가 항상 적극적인 매수 판단을 의미하지는 않습니다. 설정·환매, 종목 가격 변동,
          기업행사, 데이터 제공 방식 변화가 함께 영향을 줄 수 있습니다.
        </p>
        <p>
          반대로 1CU당 수량은 줄었지만 비중이 유지되거나 늘어난 경우는 주가 상승 효과가 반영된 것일 수 있어,
          ETF가 비중 제한을 맞추기 위해 수량을 조정했을 가능성도 함께 봐야 합니다.
        </p>
      </GuideSection>

      <GuideSection title="액티브 ETF 공통 매수 신호" icon={TrendingUp}>
        <p>
          액티브 ETF 공통 매수 신호는 최근 7일 동안 여러 액티브 ETF에서 같은 종목의 1CU당 구성수량이 증가한 경우를 모아 보여줍니다.
          많은 액티브 ETF에서 동시에 늘린 종목일수록 운용자들이 공통으로 관심을 둔 후보로 해석할 수 있습니다.
        </p>
        <p>
          이 신호는 투자 추천이 아니라 관찰 신호입니다. 종목의 가격, 섹터 환경, ETF별 운용 목적,
          리밸런싱 시점까지 함께 확인해야 합니다.
        </p>
      </GuideSection>

      <GuideSection title="주의해서 봐야 할 한계" icon={AlertTriangle}>
        <p>
          ETF Radar는 국내 주식형 현물 ETF를 중심으로 다루며, 해외형, 채권형, 원자재, 레버리지, 인버스,
          커버드콜 등은 현재 주요 비교 대상에서 제외합니다.
        </p>
        <p>
          데이터는 공개 페이지와 API에 의존하므로 지연, 누락, 일시적 오류가 생길 수 있습니다.
          중요한 투자 판단에는 반드시 운용사, KRX, 금융투자협회 등 공식 자료를 함께 확인해야 합니다.
        </p>
      </GuideSection>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        서비스 구조와 운영 방식은{' '}
        <Link to="/about" className="font-bold text-blue-600 hover:text-blue-700">
          ETF Radar 소개
        </Link>
        에서 확인할 수 있습니다.
      </section>
    </div>
  );
}
