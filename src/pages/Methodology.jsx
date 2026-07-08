import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Database, FileSearch, GitCommitHorizontal, Layers3 } from 'lucide-react';

const steps = [
  {
    title: 'ETF 대상 선정',
    icon: FileSearch,
    body: 'ETF Radar는 국내 주식형 현물 ETF를 중심으로 비교합니다. 해외형, 채권형, 원자재형, 레버리지·인버스, 커버드콜처럼 위험 구조와 수익률 해석 방식이 크게 다른 상품은 주요 비교 대상에서 제외합니다.',
  },
  {
    title: '종가 데이터 수집',
    icon: Database,
    body: '종가, NAV, 순자산총액, 기초지수 등 기본 가격 데이터는 KRX Open API를 기준으로 수집합니다. 화면의 수익률은 실시간 시세가 아니라 기준일 종가를 바탕으로 계산한 값입니다.',
  },
  {
    title: 'TOP 10 구성종목 스냅샷',
    icon: Layers3,
    body: '구성종목 변화는 네이버 금융에 공개된 TOP 10 구성자산을 기준으로 감지합니다. 전체 PDF 편입 내역이 아니므로, TOP 10 밖의 종목 변화나 전체 편입·편출을 완전하게 보여주는 데이터는 아닙니다.',
  },
  {
    title: '변경 감지와 발행',
    icon: GitCommitHorizontal,
    body: 'GitHub Actions가 평일 아침에 데이터를 수집하고, 이전 스냅샷과 비교해 JSON을 갱신합니다. 변경이 있으면 Git 커밋으로 저장되고 Cloudflare Pages가 정적 파일로 다시 배포합니다.',
  },
];

const qualityChecks = [
  'KRX 기준일과 ETF 기준일을 비교해 새 데이터 여부를 확인합니다.',
  'ETF 코드가 KRX와 네이버 금융 양쪽에서 매칭되는지 확인합니다.',
  '수집 실패가 있으면 상태 JSON과 GitHub Actions 결과에서 확인할 수 있도록 남깁니다.',
  '동일 기준일 데이터가 이미 반영된 경우 불필요한 재생성을 피합니다.',
];

const limitations = [
  '실시간 시세, 호가, 거래량 기반 매매 신호를 제공하지 않습니다.',
  'TOP 10 구성자산은 전체 포트폴리오가 아니므로 전체 편입·편출로 해석하면 안 됩니다.',
  '공개 데이터 지연, KRX 또는 네이버 금융 응답 변화에 따라 업데이트 시간이 달라질 수 있습니다.',
  '수익률은 보수, 세금, 분배금, 실제 체결 비용을 모두 반영한 개인별 투자 성과가 아닙니다.',
];

export default function Methodology() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">데이터 방법론</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 데이터는 이렇게 만들어집니다
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
          ETF Radar는 매일 공개 데이터를 수집해 국내 ETF의 종가 수익률과 TOP 10 구성종목 변화를 정리합니다.
          이 페이지는 어떤 데이터를 쓰는지, 어떤 기준으로 계산하는지, 어디까지 신뢰하고 어디서 주의해야 하는지 설명합니다.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {steps.map(({ title, icon: Icon, body }) => (
          <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-100 p-2.5 text-slate-700">
                <Icon size={20} />
              </span>
              <h2 className="text-lg font-extrabold text-slate-950">{title}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarClock className="text-blue-600" size={19} />
          <h2 className="text-xl font-extrabold text-slate-950">업데이트 시간과 기준일</h2>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            ETF Radar는 보통 다음 영업일 오전 9시 15분 전후에 전일 종가 기준 데이터를 반영합니다.
            KRX 데이터가 늦게 열리거나 일시적으로 응답하지 않으면 업데이트가 지연될 수 있습니다.
          </p>
          <p>
            화면 상단의 기준일은 현재 사이트에 반영된 종가 기준일입니다. 기준일이 오늘 날짜가 아니더라도,
            장중 실시간 시세를 보여주는 서비스가 아니기 때문에 전일 또는 직전 영업일 종가 기준으로 보는 것이 맞습니다.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600" size={19} />
            <h2 className="text-xl font-extrabold text-slate-950">데이터 품질 확인</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
            {qualityChecks.map(item => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={19} />
            <h2 className="text-xl font-extrabold text-slate-950">해석상 한계</h2>
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
            {limitations.map(item => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        데이터 해석 방법은 <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">데이터 해석 안내</Link>,
        실제 활용 관점은 <Link to="/insights" className="font-bold text-blue-600 hover:text-blue-700">ETF 인사이트</Link>,
        개인정보와 광고 안내는 <Link to="/policy" className="font-bold text-blue-600 hover:text-blue-700">정책 안내</Link>에서 함께 확인할 수 있습니다.
      </section>
    </div>
  );
}
