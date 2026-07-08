import { Link } from 'react-router-dom';
import { Activity, BarChart3, GitBranch, Layers3, SearchCheck, ShieldAlert } from 'lucide-react';

const articles = [
  {
    title: 'ETF TOP 10 구성종목 변화는 무엇을 말해줄까',
    icon: Layers3,
    summary: 'TOP 10 진입과 이탈은 ETF 전체 포트폴리오의 완전한 편입·편출이 아니라, 비중 상위권에서 관심이 이동한 흔적입니다.',
    paragraphs: [
      '국내 ETF를 볼 때 수익률만 비교하면 같은 테마 안에서도 왜 차이가 나는지 놓치기 쉽습니다. 반도체 ETF라 하더라도 삼성전자, SK하이닉스, 장비주, 소재주 비중이 다르고, 2차전지 ETF도 셀, 소재, 장비, 완성차 노출도가 서로 다릅니다.',
      'ETF Radar는 네이버 금융에 공개된 TOP 10 구성자산을 매일 비교해 어떤 종목이 상위권에 새로 들어왔고 빠졌는지 보여줍니다. 이 정보는 전체 PDF 편입 내역은 아니지만, 일반 투자자가 ETF 성격 변화를 빠르게 파악하는 데 유용한 요약 신호가 됩니다.',
      '다만 TOP 10 이탈은 해당 종목을 완전히 팔았다는 뜻이 아닙니다. 주가 변동, 리밸런싱, 다른 종목의 비중 상승 때문에 순위가 밀렸을 수도 있습니다. 그래서 ETF Radar에서는 TOP 10 변화와 함께 1CU당 구성수량 변화를 같이 보도록 설계했습니다.',
    ],
  },
  {
    title: '1CU당 구성수량 변화와 비중 변화를 함께 봐야 하는 이유',
    icon: BarChart3,
    summary: '수량은 줄었지만 비중이 유지되는 경우, 단순 매도라기보다 가격 상승에 따른 비중 관리일 수 있습니다.',
    paragraphs: [
      'ETF 구성종목 변화에서 중요한 것은 “수량이 늘었는가”만이 아닙니다. 예를 들어 특정 종목 가격이 크게 오르면 같은 비중을 유지하기 위해 1CU당 보유 수량을 줄일 수 있습니다. 이 경우 수량 감소만 보면 매도처럼 보이지만, 실제로는 비중을 유지하려는 운용일 수 있습니다.',
      '반대로 수량이 늘었는데 비중 변화가 작다면 가격 하락 구간에서 비중을 유지하거나 조금 높인 것일 수 있습니다. ETF Radar는 이런 차이를 줄이기 위해 1CU당 구성수량 변화, TOP 10 진입·이탈, 비중 유지형 변화를 구분해 표시합니다.',
      '이 방식은 특히 액티브 ETF를 볼 때 의미가 큽니다. 액티브 ETF는 지수를 기계적으로 따라가기보다 운용역의 판단이 더 반영될 수 있기 때문에, 여러 액티브 ETF가 같은 종목을 동시에 늘리는지 살펴보면 시장의 공통 관심사를 읽는 보조 신호가 됩니다.',
    ],
  },
  {
    title: '액티브 ETF 공통 매수 신호를 해석하는 방법',
    icon: Activity,
    summary: '여러 액티브 ETF에서 같은 종목의 1CU당 수량이 늘어난 경우를 모아, 최근 운용자 관심이 겹친 종목을 보여줍니다.',
    paragraphs: [
      '액티브 ETF 페이지의 공통 매수 신호는 최근 7일 동안 여러 액티브 ETF에서 1CU당 구성수량이 증가한 종목을 우선 보여줍니다. 짧은 기간을 쓰는 이유는 액티브 ETF의 장점이 빠른 대응에 있기 때문입니다.',
      '이 신호는 매수 추천이 아니라 “여러 운용 전략에서 동시에 관찰된 변화”입니다. 같은 삼성전자를 늘렸더라도 AI 인프라 ETF, 밸류업 ETF, 코스피 액티브 ETF에서 늘린 이유는 서로 다를 수 있습니다. 따라서 어떤 ETF들이 늘렸는지 펼쳐서 확인하는 과정이 중요합니다.',
      'ETF Radar는 많은 액티브 ETF에서 증가한 순서와 평균 증가율을 함께 보여줍니다. 참여 ETF 수가 많으면 공통 관심이 넓다는 뜻이고, 평균 증가율이 높으면 일부 ETF에서 강하게 비중을 조정했을 가능성이 있습니다.',
    ],
  },
  {
    title: '국내 ETF 데이터를 매일 정적으로 발행하는 이유',
    icon: GitBranch,
    summary: '실시간 시세 서비스가 아니라 종가 기준 스냅샷을 매일 발행해, 운영비와 장애 지점을 줄이는 구조를 선택했습니다.',
    paragraphs: [
      'ETF Radar는 서버에서 실시간 조회를 처리하는 서비스가 아닙니다. GitHub Actions가 KRX Open API와 네이버 금융 데이터를 수집하고, 결과를 JSON 파일로 저장한 뒤 Cloudflare Pages가 정적 파일로 제공합니다.',
      '이 구조의 장점은 단순함입니다. 별도 서버, 데이터베이스, 캐시 서버가 없어도 매일 업데이트되는 ETF 레이더를 운영할 수 있고, 사용자는 빠르게 정적 파일을 받아 볼 수 있습니다. 운영비 0원에 가까운 구조라 개인 프로젝트에서도 지속 운영이 가능합니다.',
      '단점도 명확합니다. KRX API가 다음날 오전에 안정적으로 갱신되는 특성이 있어, ETF Radar도 보통 다음 영업일 오전 9시 15분 전후에 전일 종가 기준 데이터가 반영됩니다. 따라서 화면의 날짜와 “실시간 시세가 아님” 안내를 항상 함께 표시합니다.',
    ],
  },
];

const checks = [
  '특정 ETF의 수익률이 높다면 같은 테마 ETF와 구성종목 차이를 함께 확인합니다.',
  'TOP 10 진입·이탈은 전체 편입·편출이 아니라 상위 10개 구성자산의 변화로 해석합니다.',
  '1CU당 수량 변화는 종목 가격 상승·하락과 비중 변화까지 함께 봅니다.',
  '액티브 ETF 공통 신호는 매수 추천이 아니라 운용 변화 관찰용 참고 지표로 사용합니다.',
];

export default function Insights() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">ETF 해석 노트</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 인사이트
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 주식형 현물 ETF의 종가 수익률과 TOP 10 구성종목 변화를 보여주는 도구입니다.
          이 페이지는 숫자를 어떻게 읽어야 하는지, 어떤 한계가 있는지, 액티브 ETF 신호를 어떤 관점으로 봐야 하는지 정리한 해설 페이지입니다.
        </p>
      </section>

      <div className="grid gap-5">
        {articles.map(({ title, icon: Icon, summary, paragraphs }) => (
          <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
                <Icon size={20} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">{summary}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-600">
              {paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-center gap-2">
          <SearchCheck className="text-blue-600" size={19} />
          <h2 className="text-xl font-extrabold text-slate-950">ETF Radar를 볼 때의 기본 체크리스트</h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          {checks.map(check => (
            <li key={check} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <ShieldAlert size={17} />
          투자 유의사항
        </div>
        <p className="mt-3">
          이 페이지의 설명은 ETF 데이터를 읽는 방법에 대한 일반적인 안내입니다. 특정 ETF나 종목의 매수·매도·보유를 권유하지 않으며,
          실제 투자 판단에는 운용사 공식 자료, KRX, 금융투자협회, 상품 설명서, 개인의 투자 목적과 위험 감내 수준을 함께 고려해야 합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/guide" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
            데이터 해석 안내
          </Link>
          <Link to="/compare" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600">
            ETF 비교하기
          </Link>
        </div>
      </section>
    </div>
  );
}
