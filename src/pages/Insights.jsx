import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, GitBranch, Layers3, SearchCheck, ShieldAlert } from 'lucide-react';
import { INSIGHT_ARTICLES } from '../data/insightArticles';

const ARTICLE_ICONS = {
  'top10-holdings-change': Layers3,
  'per-cu-quantity': BarChart3,
  'active-etf-common-increase': Activity,
  'static-etf-data': GitBranch,
};

const checks = [
  '특정 ETF의 수익률이 높다면 같은 테마 ETF와 구성종목 차이를 함께 확인합니다.',
  'TOP 10 진입·이탈은 전체 편입·편출이 아니라 상위 10개 구성자산의 변화로 해석합니다.',
  '1CU당 수량 변화는 종목 가격 상승·하락과 비중 변화까지 함께 봅니다.',
  '액티브 ETF 공통 증가 종목은 매수 추천이 아니라 운용 변화 관찰용 참고 지표로 사용합니다.',
];

const SITE_URL = 'https://etf-radar.net';

function useInsightsStructuredData() {
  useEffect(() => {
    const id = 'insights-structured-data';
    document.getElementById(id)?.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'ETF Radar 인사이트',
      description: 'ETF TOP 10 구성종목 변화, 1CU당 구성수량 변화, 액티브 ETF 공통 증가 종목을 읽는 독립 해설을 모았습니다.',
      url: `${SITE_URL}/insights/`,
      hasPart: INSIGHT_ARTICLES.map((article, index) => ({
        '@type': 'Article',
        position: index + 1,
        headline: article.title,
        description: article.description,
        url: `${SITE_URL}/insights/${article.slug}/`,
      })),
    });
    document.head.appendChild(script);

    return () => document.getElementById(id)?.remove();
  }, []);
}

export default function Insights() {
  useInsightsStructuredData();

  return (
    <div className="mx-auto max-w-5xl space-y-8 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">ETF 해석 노트</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">ETF Radar 인사이트</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          수익률과 구성종목 변화는 숫자 하나만으로 의미를 단정하기 어렵습니다. ETF Radar가 사용하는 지표의 계산 범위,
          올바른 해석 순서와 한계를 주제별 독립 문서로 정리했습니다.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {INSIGHT_ARTICLES.map(article => {
          const Icon = ARTICLE_ICONS[article.slug];
          return (
            <article key={article.slug} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-slate-100 p-2.5 text-slate-700"><Icon size={20} /></span>
                <div>
                  <p className="text-xs font-bold text-blue-600">{article.category}</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-950">{article.title}</h2>
                </div>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{article.summary}</p>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">약 {article.readingMinutes}분 · {article.updatedAt} 수정</span>
                <Link to={`/insights/${article.slug}/`} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700">
                  전문 읽기 <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-center gap-2">
          <SearchCheck className="text-blue-600" size={19} />
          <h2 className="text-xl font-extrabold text-slate-950">ETF Radar를 볼 때의 기본 체크리스트</h2>
        </div>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          {checks.map(check => <li key={check} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" /><span>{check}</span></li>)}
        </ul>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-slate-800"><ShieldAlert size={17} /> 투자 유의사항</div>
        <p className="mt-3">
          인사이트는 ETF 데이터를 읽는 방법에 대한 일반적인 안내입니다. 특정 ETF나 종목의 매수·매도·보유를 권유하지 않으며,
          실제 판단에는 운용사 공식 자료, KRX, 상품 설명서와 개인의 투자 목적을 함께 고려해야 합니다.
        </p>
      </section>
    </div>
  );
}
