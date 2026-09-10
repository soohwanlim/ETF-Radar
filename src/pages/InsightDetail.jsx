import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, ShieldAlert } from 'lucide-react';
import { getInsightArticle, INSIGHT_ARTICLES } from '../data/insightArticles';

const SITE_URL = 'https://etf-radar.net';

function useArticleStructuredData(article) {
  useEffect(() => {
    if (!article) return undefined;
    const id = 'insight-article-structured-data';
    document.getElementById(id)?.remove();
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      inLanguage: 'ko-KR',
      mainEntityOfPage: `${SITE_URL}/insights/${article.slug}/`,
      author: { '@type': 'Organization', name: 'ETF Radar', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'ETF Radar', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-512.png` } },
      articleBody: article.sections.flatMap(section => [section.heading, ...section.paragraphs]).join('\n\n'),
    });
    document.head.appendChild(script);
    return () => document.getElementById(id)?.remove();
  }, [article]);
}

export default function InsightDetail() {
  const { slug } = useParams();
  const article = getInsightArticle(slug);
  useArticleStructuredData(article);

  if (!article) return (
    <section className="mx-auto max-w-xl py-24 text-center">
      <h1 className="text-2xl font-extrabold text-slate-950">인사이트를 찾을 수 없습니다</h1>
      <p className="mt-3 text-sm text-slate-600">주소를 확인하거나 인사이트 목록에서 다른 글을 선택해 주세요.</p>
      <Link to="/insights/" className="mt-6 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">인사이트 목록</Link>
    </section>
  );

  const currentIndex = INSIGHT_ARTICLES.findIndex(item => item.slug === article.slug);
  const nextArticle = INSIGHT_ARTICLES[(currentIndex + 1) % INSIGHT_ARTICLES.length];

  return (
    <article className="mx-auto max-w-4xl space-y-7 fade-in">
      <Link to="/insights/" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-blue-600">
        <ArrowLeft size={16} /> 인사이트 목록
      </Link>

      <header className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
        <p className="text-sm font-bold text-blue-600">{article.category}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-5xl">{article.title}</h1>
        <p className="mt-5 text-base font-medium leading-relaxed text-slate-600">{article.summary}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> 최초 작성 {article.publishedAt}</span>
          <span>최종 수정 {article.updatedAt}</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> 약 {article.readingMinutes}분</span>
        </div>
      </header>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm md:p-10">
        <div className="space-y-10">
          {article.sections.map((section, index) => (
            <section key={section.heading}>
              <p className="text-xs font-extrabold text-blue-600">{String(index + 1).padStart(2, '0')}</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{section.heading}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-700">
                {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="rounded-3xl border border-blue-100 bg-blue-50 p-6 md:p-8">
        <h2 className="text-xl font-extrabold text-slate-950">확인 체크리스트</h2>
        <ul className="mt-4 space-y-3">
          {article.checklist.map(item => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
              <CheckCircle2 className="mt-0.5 shrink-0 text-blue-600" size={17} /> {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm leading-relaxed text-slate-700">
        <div className="flex items-center gap-2 font-extrabold text-slate-900"><ShieldAlert size={17} /> 투자 유의사항</div>
        <p className="mt-3">이 글은 공개된 ETF 데이터를 해석하는 일반적인 방법을 설명하며 특정 상품이나 종목의 매수·매도를 권유하지 않습니다. 데이터 범위와 기준일을 확인하고 중요한 판단에는 운용사 공식 자료를 함께 사용하세요.</p>
      </section>

      <nav className="grid gap-3 sm:grid-cols-2" aria-label="관련 페이지">
        {article.relatedLinks.map(link => <Link key={link.to} to={link.to} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-600">{link.label}</Link>)}
      </nav>

      <Link to={`/insights/${nextArticle.slug}/`} className="flex items-center justify-between rounded-3xl bg-slate-900 p-6 text-white hover:bg-slate-800">
        <span><span className="block text-xs font-semibold text-slate-400">다음 인사이트</span><strong className="mt-1 block">{nextArticle.title}</strong></span>
        <ArrowRight className="shrink-0" size={20} />
      </Link>
    </article>
  );
}
