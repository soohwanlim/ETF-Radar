import { createElement } from 'react';
import {
  Atom, BarChart3, BatteryCharging, Bot, Building2, Car, Cpu, Factory,
  HeartPulse, Landmark, Layers3, Leaf, Plane, Shield, Ship, ShoppingBag, Zap,
} from 'lucide-react';

const BRAND_STYLES = [
  { pattern: /^(RISE)/i, background: '#ffcc00', foreground: '#402f00' },
  { pattern: /^(KODEX)/i, background: '#2563eb', foreground: '#ffffff' },
  { pattern: /^(TIGER)/i, background: '#f97316', foreground: '#ffffff' },
  { pattern: /^(ACE)/i, background: '#2563eb', foreground: '#ffffff' },
  { pattern: /^(HANARO)/i, background: '#2878b8', foreground: '#ffffff' },
  { pattern: /^(SOL)/i, background: '#0f6fff', foreground: '#ffffff' },
  { pattern: /^(PLUS)/i, background: '#ef4444', foreground: '#ffffff' },
  { pattern: /^(KOSEF|KIWOOM)/i, background: '#16a34a', foreground: '#ffffff' },
  { pattern: /^(TIMEFOLIO)/i, background: '#7c3aed', foreground: '#ffffff' },
  { pattern: /^(WON)/i, background: '#2563eb', foreground: '#ffffff' },
  { pattern: /^(1Q)/i, background: '#e11d48', foreground: '#ffffff' },
  { pattern: /^(BNK)/i, background: '#dc2626', foreground: '#ffffff' },
  { pattern: /^(IBK)/i, background: '#2563eb', foreground: '#ffffff' },
  { pattern: /^(UNICORN)/i, background: '#7c3aed', foreground: '#ffffff' },
];

const THEME_ICONS = [
  { pattern: /원자력|원전|우라늄/, icon: Atom },
  { pattern: /반도체|하이닉스|삼성전자/, icon: Cpu },
  { pattern: /AI|인공지능|로봇|소프트웨어|디지털/, icon: Bot },
  { pattern: /2차전지|배터리|전기차|리튬/, icon: BatteryCharging },
  { pattern: /바이오|헬스|의료|제약|CDMO/, icon: HeartPulse },
  { pattern: /금융|은행|증권|보험|고배당|배당/, icon: Landmark },
  { pattern: /자동차|모빌리티/, icon: Car },
  { pattern: /방산|국방|우주/, icon: Shield },
  { pattern: /조선|해운/, icon: Ship },
  { pattern: /전력|전기|에너지|수소|태양광|ESS/, icon: Zap },
  { pattern: /건설|인프라|리츠|부동산/, icon: Building2 },
  { pattern: /소비|유통|화장품|여행|레저|게임|콘텐츠/, icon: ShoppingBag },
  { pattern: /농업|푸드|식품/, icon: Leaf },
  { pattern: /항공/, icon: Plane },
  { pattern: /산업|기계|철강|소재/, icon: Factory },
  { pattern: /200|코스피|코스닥|대표지수|밸류업/, icon: BarChart3 },
];

const FALLBACK_COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#0f766e', '#be123c', '#b45309'];

function getStyle(etf) {
  const name = etf?.name || '';
  const brand = BRAND_STYLES.find(item => item.pattern.test(name));
  if (brand) return brand;

  const seed = [...(etf?.provider || name || etf?.code || 'ETF')]
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return { background: FALLBACK_COLORS[seed % FALLBACK_COLORS.length], foreground: '#ffffff' };
}

function getIcon(etf) {
  const keywords = `${etf?.name || ''} ${etf?.fundType || ''} ${etf?.benchmark || ''}`;
  return THEME_ICONS.find(item => item.pattern.test(keywords))?.icon || Layers3;
}

export default function ETFIcon({ etf, size = 'md', className = '' }) {
  const Icon = getIcon(etf);
  const style = getStyle(etf);
  const sizes = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  const iconSize = size === 'lg' ? 25 : size === 'sm' ? 17 : 20;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-black/5 ${sizes} ${className}`}
      style={{ backgroundColor: style.background, color: style.foreground }}
      aria-hidden="true"
    >
      {createElement(Icon, { size: iconSize, strokeWidth: 2.2 })}
    </span>
  );
}
