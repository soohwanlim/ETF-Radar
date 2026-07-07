import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, Layers3, RefreshCw, SearchCheck, TrendingUp } from 'lucide-react';

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
          ETF Radar는 여러 출처의 공개 데이터를 같은 기준일로 모아 비교합니다. 이 페이지는 수익률, TOP 10 구성종목 변화,
          1CU당 구성수량 변화, 액티브 ETF 공통 신호를 해석할 때 필요한 기준과 한계를 설명합니다.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          ETF는 같은 이름의 테마를 갖고 있어도 추종 지수, 운용 방식, 리밸런싱 주기, 보수, 구성종목 비중이 다릅니다.
          따라서 단순 수익률 순위만 보는 것보다 어떤 종목이 들어오고 나갔는지, 어떤 ETF들이 같은 종목을 함께 늘렸는지까지 함께 확인하는 것이 좋습니다.
        </p>
      </section>

      <GuideSection title="종가 기준 수익률" icon={BarChart3}>
        <p>
          ETF Radar의 가격과 수익률은 실시간 시세가 아니라 기준일 종가로 계산합니다. 장중 변동은 반영하지 않으며,
          KRX 데이터가 안정적으로 제공된 뒤 다음 영업일 오전에 갱신됩니다.
        </p>
        <p>
          1일, 1주, 1개월, 3개월, 1년, 10년 수익률은 가능한 과거 가격과 최신 종가를 비교해 계산합니다.
          신규 상장 ETF처럼 과거 데이터가 부족한 경우 일부 기간 수익률이 비어 있을 수 있습니다.
        </p>
        <p>
          기간 수익률은 ETF의 성과를 빠르게 비교하는 데 유용하지만, 분배금, 세금, 추적오차, 괴리율, 거래비용까지 모두 반영하는 투자 성과와는 다를 수 있습니다.
          실제 투자 판단에는 운용보수, 순자산, 거래량, 추종 지수도 함께 확인해야 합니다.
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
        <p>
          TOP 10 변화는 운용사의 관심 변화나 주가 상승에 따른 비중 변화가 드러나는 구간입니다. 다만 이 신호만으로 매수·매도 의도를 단정할 수 없고,
          구성종목 가격 변화, 리밸런싱 일정, 추종 지수 변경 여부를 함께 봐야 합니다.
        </p>
      </GuideSection>

      <GuideSection title="1CU당 구성수량 변화" icon={RefreshCw}>
        <p>
          1CU당 구성수량 변화는 같은 ETF의 이전 TOP 10 스냅샷과 최신 스냅샷을 비교해 특정 구성종목의 1CU당 주식 수가 얼마나 늘거나 줄었는지를 보여줍니다.
        </p>
        <p>
          수량 증가가 항상 적극적인 매수를 의미하지는 않습니다. ETF 설정·환매, 지수 리밸런싱, 기업 이벤트, 데이터 제공 방식 변화가 함께 영향을 줄 수 있습니다.
          반대로 수량은 줄었지만 비중이 유지되는 경우에는 주가 상승 영향이나 비중 관리 가능성을 함께 봐야 합니다.
        </p>
        <p>
          ETF Radar는 이런 해석 차이를 줄이기 위해 단순 수량 증가·감소 외에도 “수량 감소 · 비중 유지” 유형을 별도로 표시합니다.
          이 표시는 매매 의도를 확정하는 것이 아니라 사용자가 변화의 성격을 구분하도록 돕는 참고 신호입니다.
        </p>
      </GuideSection>

      <GuideSection title="액티브 ETF 공통 매수 신호" icon={TrendingUp}>
        <p>
          액티브 ETF 공통 매수 신호는 최근 7일 동안 여러 액티브 ETF에서 같은 종목의 1CU당 구성수량이 증가한 경우를 모아 보여줍니다.
          액티브 ETF는 운용사의 판단이 더 많이 반영될 수 있으므로, 여러 액티브 ETF에서 동시에 늘어난 종목은 관찰 가치가 있습니다.
        </p>
        <p>
          다만 이 신호는 투자 추천이 아니라 관찰 신호입니다. 운용사별 전략, ETF의 테마, 종목 가격 변화, 리밸런싱 시점이 모두 다르기 때문에
          해당 종목을 바로 매수해야 한다는 의미로 해석하면 안 됩니다.
        </p>
        <p>
          ETF Radar는 많은 액티브 ETF에서 함께 증가한 종목을 먼저 보여주고, 평균 증가율도 함께 표시합니다. 사용자는 이 정보를 통해
          특정 산업이나 종목에 대한 운용사들의 공통 관심이 생겼는지 살펴볼 수 있습니다.
        </p>
      </GuideSection>

      <GuideSection title="검색과 비교 기능 활용" icon={SearchCheck}>
        <p>
          홈 검색에서는 ETF 이름이나 종목코드로 국내 주식형 현물 ETF를 찾을 수 있습니다. 여러 ETF를 선택하면 비교 페이지에서 기간 수익률과 구성종목을 함께 볼 수 있습니다.
        </p>
        <p>
          같은 테마 ETF라도 구성종목 비중이 다르면 수익률 흐름이 달라질 수 있습니다. 예를 들어 반도체 ETF끼리 비교할 때도
          삼성전자, SK하이닉스, 장비주, 소재주 비중이 다르기 때문에 단순 테마명만으로 동일한 상품처럼 보기 어렵습니다.
        </p>
      </GuideSection>

      <GuideSection title="주의해서 봐야 할 한계" icon={AlertTriangle}>
        <p>
          ETF Radar는 국내 주식형 현물 ETF를 중심으로 다루며, 해외형, 채권형, 원자재, 레버리지, 인버스, 커버드콜 등은 주요 비교 대상에서 제외합니다.
        </p>
        <p>
          데이터는 공개 페이지와 API에 의존하므로 지연, 누락, 일시적 오류가 생길 수 있습니다. 중요한 투자 판단에는 반드시 KRX, 금융투자협회,
          운용사 공식 PDF, 증권사 정보를 함께 확인해야 합니다.
        </p>
        <p>
          이 사이트의 모든 정보는 참고용입니다. ETF Radar는 특정 금융상품의 매수·매도·보유를 권유하지 않으며,
          투자 결과에 대한 최종 책임은 투자자 본인에게 있습니다.
        </p>
      </GuideSection>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        서비스 구조와 데이터 출처가 궁금하다면{' '}
        <Link to="/about" className="font-bold text-blue-600 hover:text-blue-700">
          ETF Radar 소개
        </Link>
        에서 운영 방식과 업데이트 기준을 확인할 수 있습니다.
      </section>
    </div>
  );
}
