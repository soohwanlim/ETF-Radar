import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

const FAQS = [
  {
    question: 'ETF Radar는 어떤 사이트인가요?',
    answer: '국내 주식형 현물 ETF의 종가 수익률, TOP 10 구성종목 변화, 신규 상장 ETF, 액티브 ETF 공통 구성수량 증가 신호를 매일 정리해 보여주는 데이터 서비스입니다. 특정 ETF를 추천하기보다 사용자가 여러 ETF를 같은 기준으로 비교하도록 돕는 것이 목적입니다.',
  },
  {
    question: '데이터는 언제 업데이트되나요?',
    answer: 'KRX Open API와 네이버 금융 공개 데이터를 기준으로 다음 영업일 오전에 자동 수집합니다. 현재 운영상으로는 대체로 오전 9시 15분 전후에 전일 종가 기준 데이터가 반영됩니다. 공휴일, KRX 응답 지연, 외부 페이지 변경이 있으면 업데이트가 늦어질 수 있습니다.',
  },
  {
    question: '실시간 시세를 제공하나요?',
    answer: '아니요. ETF Radar는 실시간 시세 서비스가 아닙니다. 화면에 표시되는 가격과 수익률은 기준일 종가로 계산됩니다. 장중 매매 판단에는 증권사 실시간 시세와 공식 거래 화면을 확인해야 합니다.',
  },
  {
    question: 'TOP 10 구성종목 변화는 전체 편입·편출을 의미하나요?',
    answer: '아닙니다. ETF Radar는 네이버 금융에 표시되는 TOP 10 구성자산 스냅샷을 기준으로 변화를 감지합니다. TOP 10 이탈은 상위 10개 목록에서 빠졌다는 뜻이지, ETF 전체 포트폴리오에서 완전히 편출됐다는 뜻은 아닙니다.',
  },
  {
    question: '1CU당 구성수량 변화는 어떻게 해석해야 하나요?',
    answer: '1CU당 구성수량 변화는 같은 ETF의 이전 스냅샷과 최신 스냅샷을 비교해 특정 종목의 수량이 늘었는지 줄었는지를 보여줍니다. 다만 수량 변화는 운용사의 매매 의도뿐 아니라 설정·환매, 리밸런싱, 종목 가격 변동, 데이터 제공 방식의 영향을 받을 수 있습니다.',
  },
  {
    question: '액티브 ETF 공통 매수 신호는 매수 추천인가요?',
    answer: '아닙니다. 액티브 ETF 공통 매수 신호는 여러 액티브 ETF에서 같은 종목의 1CU당 구성수량이 함께 증가한 경우를 모아 보여주는 관찰 신호입니다. 운용사들의 공통 관심을 살피는 데 도움을 줄 수 있지만, 특정 종목이나 ETF의 매수를 권유하는 의미는 아닙니다.',
  },
  {
    question: '왜 해외 ETF, 채권형, 레버리지, 인버스 ETF는 제외되나요?',
    answer: '현재 ETF Radar는 국내 주식형 현물 ETF를 중심으로 비교합니다. 해외형, 채권형, 원자재, 레버리지, 인버스, 커버드콜 상품은 위험 구조와 수익률 해석 방식이 달라 같은 기준으로 비교하기 어렵기 때문에 주요 대상에서 제외했습니다.',
  },
  {
    question: '데이터 오류를 발견하면 어떻게 하나요?',
    answer: '오류로 보이는 데이터가 있다면 GitHub Issues로 ETF 코드, 기준일, 화면 경로를 남겨주세요. 공개 데이터 출처와 수집 결과를 비교해 확인할 수 있습니다.',
  },
];

function useFaqStructuredData() {
  useEffect(() => {
    const id = 'faq-structured-data';
    document.getElementById(id)?.remove();

    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}
export default function Faq() {
  useFaqStructuredData();
  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold text-blue-600"><HelpCircle size={16} /> FAQ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          ETF Radar 자주 묻는 질문
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ETF Radar의 데이터 기준, 업데이트 시간, 구성종목 변화 해석, 액티브 ETF 신호의 의미를 정리했습니다.
          처음 방문했다면 이 페이지와 <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">데이터 해석 안내</Link>를 함께 보면 각 지표를 더 안전하게 이해할 수 있습니다.
        </p>
      </section>

      <section className="space-y-4">
        {FAQS.map(item => (
          <article key={item.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-950">{item.question}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
        더 자세한 서비스 구조는 <Link to="/about" className="font-bold text-blue-600 hover:text-blue-700">서비스 소개</Link>,
        개인정보와 광고 관련 안내는 <Link to="/policy" className="font-bold text-blue-600 hover:text-blue-700">정책 및 이용 안내</Link>에서 확인할 수 있습니다.
      </section>
    </div>
  );
}