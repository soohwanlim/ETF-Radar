import { Link } from 'react-router-dom';
import { Code2, Mail, MessageSquareWarning } from 'lucide-react';

function ContactCard({ title, icon: Icon, children }) {
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

export default function Contact() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 fade-in">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
        <p className="text-sm font-bold text-blue-600">Contact</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
          문의와 오류 제보
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          ETF Radar는 국내 ETF 데이터를 자동 수집해 정리하는 개인 운영 정보 서비스입니다. 데이터 오류, 화면 문제, 기능 제안,
          정책 관련 문의가 있으면 GitHub Issues를 통해 남길 수 있습니다.
        </p>
      </section>

      <ContactCard title="문의 방법" icon={Code2}>
        <p>
          가장 빠른 문의 경로는 GitHub Issues입니다. 별도 회원 정보나 금융 정보를 받지 않으며, 공개적으로 확인 가능한 오류 제보와 기능 제안을 중심으로 처리합니다.
        </p>
        <p>
          <a
            href="https://github.com/soohwanlim/ETF-Radar/issues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            ETF Radar GitHub Issues 열기
          </a>
        </p>
      </ContactCard>

      <ContactCard title="오류 제보에 포함하면 좋은 정보" icon={MessageSquareWarning}>
        <p>
          데이터 오류로 보이는 항목은 기준일, ETF 코드, ETF 이름, 문제가 발생한 페이지 주소, 기대한 값과 실제 표시값을 함께 적어주세요.
          예를 들어 “2026-07-06 기준 069500 KODEX 200의 TOP 10 구성종목 표시가 네이버 금융과 다릅니다”처럼 남기면 확인이 쉽습니다.
        </p>
        <p>
          KRX나 네이버 금융의 원본 데이터가 지연되거나 변경된 경우에는 사이트 반영도 늦어질 수 있습니다. 중요한 투자 판단 전에는 반드시 공식 자료를 함께 확인해야 합니다.
        </p>
      </ContactCard>

      <ContactCard title="광고·정책 관련 문의" icon={Mail}>
        <p>
          개인정보처리방침, 광고와 쿠키, 투자 유의사항은 <Link to="/policy" className="font-bold text-blue-600 hover:text-blue-700">정책 및 이용 안내</Link>에 정리되어 있습니다.
          데이터 해석 기준은 <Link to="/guide" className="font-bold text-blue-600 hover:text-blue-700">데이터 해석 안내</Link>와 <Link to="/faq" className="font-bold text-blue-600 hover:text-blue-700">FAQ</Link>를 참고해주세요.
        </p>
        <p>
          ETF Radar는 특정 ETF, 주식, 금융상품의 매수·매도·보유를 권유하지 않으며 투자 자문을 제공하지 않습니다.
        </p>
      </ContactCard>
    </div>
  );
}