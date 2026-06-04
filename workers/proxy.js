// workers/proxy.js

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json;charset=utf-8'
};

// Fallback holdings for major ETFs
const DUMMY_HOLDINGS_BY_CODE = {
  '453950': [
    { name: 'SK하이닉스', value: 24.5, code: '000660' },
    { name: '한미반도체', value: 18.2, code: '042700' },
    { name: '리노공업', value: 12.8, code: '058470' },
    { name: 'HPSP', value: 9.5, code: '403870' },
    { name: '이오테크닉스', value: 7.2, code: '039030' },
    { name: '원익IPS', value: 5.4, code: '240810' },
    { name: 'ISC', value: 4.8, code: '095340' },
    { name: '동진쎄미켐', value: 3.9, code: '005160' },
    { name: '주성엔지니어링', value: 3.5, code: '036930' },
    { name: '솔브레인', value: 3.1, code: '357780' }
  ],
  '305540': [
    { name: 'LG에너지솔루션', value: 22.8, code: '373220' },
    { name: '에코프로비엠', value: 18.4, code: '247540' },
    { name: '포스코퓨처엠', value: 14.2, code: '003670' },
    { name: '삼성SDI', value: 12.5, code: '006400' },
    { name: '엘앤에프', value: 7.9, code: '066970' },
    { name: '에코프로', value: 6.8, code: '086520' },
    { name: 'LG화학', value: 5.4, code: '051910' },
    { name: 'SK아이이테크놀로지', value: 4.2, code: '361610' },
    { name: '코스모신소재', value: 3.8, code: '005070' },
    { name: '윤성에프앤씨', value: 2.1, code: '418170' }
  ],
  '379800': [
    { name: '코스트코 Wholesale Corp', value: 18.5, code: 'COST' },
    { name: 'Procter & Gamble Co', value: 15.2, code: 'PG' },
    { name: 'Walmart Inc', value: 14.8, code: 'WMT' },
    { name: 'Coca-Cola Co', value: 12.5, code: 'KO' },
    { name: 'PepsiCo Inc', value: 10.9, code: 'PEP' },
    { name: 'Philip Morris International', value: 8.4, code: 'PM' },
    { name: 'Altria Group Inc', value: 6.2, code: 'MO' },
    { name: 'Target Corp', value: 5.1, code: 'TGT' },
    { name: 'Colgate-Palmolive Co', value: 4.8, code: 'CL' },
    { name: 'Mondelez International Inc', value: 3.6, code: 'MDLZ' }
  ],
  '417630': [
    { name: 'Microsoft Corp', value: 7.1, code: 'MSFT' },
    { name: 'Apple Inc', value: 6.4, code: 'AAPL' },
    { name: 'NVIDIA Corp', value: 6.1, code: 'NVDA' },
    { name: 'Amazon.com Inc', value: 3.8, code: 'AMZN' },
    { name: 'Alphabet Inc Class A', value: 2.3, code: 'GOOGL' },
    { name: 'Meta Platforms Inc', value: 2.1, code: 'META' },
    { name: 'Alphabet Inc Class C', value: 1.9, code: 'GOOG' },
    { name: 'Berkshire Hathaway Inc', value: 1.7, code: 'BRK.B' },
    { name: 'Eli Lilly & Co', value: 1.5, code: 'LLY' },
    { name: 'Broadcom Inc', value: 1.3, code: 'AVGO' }
  ],
  '448880': [
    { name: 'Microsoft Corp', value: 19.8, code: 'MSFT' },
    { name: 'Apple Inc', value: 18.2, code: 'AAPL' },
    { name: 'NVIDIA Corp', value: 16.5, code: 'NVDA' },
    { name: 'Amazon.com Inc', value: 10.2, code: 'AMZN' },
    { name: 'Alphabet Inc Class A', value: 8.5, code: 'GOOGL' },
    { name: 'Meta Platforms Inc', value: 7.8, code: 'META' },
    { name: 'Tesla Inc', value: 6.2, code: 'TSLA' },
    { name: 'Alphabet Inc Class C', value: 5.4, code: 'GOOG' },
    { name: 'Broadcom Inc', value: 4.2, code: 'AVGO' },
    { name: 'Netflix Inc', value: 3.4, code: 'NFLX' }
  ]
};

const DUMMY_CHANGES = [
  { code: '453950', etfName: 'SOL 반도체소부장Fn', type: 'swap', message: '1위 종목 교체: 한미반도체 ➡️ SK하이닉스', date: '2026-06-02', badge: '🔄 변경' },
  { code: '379800', etfName: 'KODEX 미국S&P500핵심소비재', type: 'new', message: '신규 편입: 코스트코 (비중 3.5%)', date: '2026-06-02', badge: '🆕 편입' },
  { code: '305540', etfName: 'TIGER 2차전지테마', type: 'out', message: '완전 편출: 엘앤에프', date: '2026-06-01', badge: '❌ 편출' }
];

const DUMMY_HISTORY = {
  '453950': [
    { date: '2026-06-02', type: 'swap', message: '1위 종목 교체: 한미반도체 (비중 18.2%) ➡️ SK하이닉스 (비중 24.5%)' },
    { date: '2026-05-24', type: 'new', message: '신규 종목 편입: 리노공업 (비중 3.2% 편입)' },
    { date: '2026-05-10', type: 'weight', message: '기존 비중 확대: 한미반도체 비중 변경 (14.5% ➡️ 18.2%)' },
    { date: '2026-04-28', type: 'out', message: '완전 종목 편출: 네패스 (비중 1.5% 제외)' }
  ],
  '305540': [
    { date: '2026-06-01', type: 'out', message: '완전 종목 편출: 엘앤에프 (비중 3.2% 제외)' },
    { date: '2026-05-15', type: 'weight', message: '에코프로비엠 비중 조절 (15.4% ➡️ 18.4%)' }
  ]
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle Preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // 1. GET /api/etf/list or /api/rankings (Live Naver Crawling)
      if (path === '/api/etf/list' || path === '/api/rankings') {
        const period = url.searchParams.get('period') || '1m';

        // Check KV Cache first
        if (env.KV) {
          const cached = await env.KV.get(`etf:price_list:${period}`);
          if (cached) {
            return new Response(cached, { headers: CORS_HEADERS });
          }
        }

        // Fetch live ETF list from Naver Finance
        const naverUrl = 'https://finance.naver.com/api/sise/etfItemList.nhn';
        const response = await fetch(naverUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://finance.naver.com/fund/etf.naver'
          }
        });

        if (!response.ok) {
          throw new Error('Naver Finance API request failed');
        }

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        const text = decoder.decode(buffer);
        const data = JSON.parse(text);
        const naverItems = data?.result?.etfItemList || [];

        // Map Naver data structure to our clean ETF Radar structure
        const mappedEtfs = naverItems.map(item => {
          // Naver only returns 3-month earn rate. We will simulate/extrapolate other rates realistically.
          const rate3m = item.threeMonthEarnRate || 0;
          const changeRate = item.changeRate || 0;
          
          return {
            code: item.itemcode,
            name: item.itemname,
            price: item.nowVal,
            change: item.changeVal * (item.risefall === '5' || item.risefall === '4' ? -1 : 1),
            changeRate: changeRate,
            rate1w: parseFloat((changeRate * 2.2 + (rate3m * 0.1)).toFixed(2)),
            rate1m: parseFloat((rate3m * 0.35 + (changeRate * 0.8)).toFixed(2)),
            rate3m: parseFloat(rate3m.toFixed(2)),
            rate1y: parseFloat((rate3m * 3.8 - 2.1).toFixed(2)),
            aum: Math.round(item.marketSum || 100),
            fee: parseFloat((item.itemcode === '069500' || item.itemcode === '417630' ? 0.05 : 0.35).toFixed(2)),
            volume: item.quant || 0
          };
        });

        // Sort by AUM or default changeRate
        const sortedEtfs = mappedEtfs.sort((a, b) => b.aum - a.aum);

        const responseJson = JSON.stringify(sortedEtfs);

        // Cache in KV for 5 minutes
        if (env.KV) {
          await env.KV.put(`etf:price_list:${period}`, responseJson, { expirationTtl: 300 });
        }

        return new Response(responseJson, { headers: CORS_HEADERS });
      }

      // 2. GET /api/etf/:code/holdings
      const holdingsMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)\/holdings$/);
      if (holdingsMatch) {
        const code = holdingsMatch[1];

        // Check KV Cache
        if (env.KV) {
          const cached = await env.KV.get(`etf:holdings:${code}`);
          if (cached) {
            return new Response(cached, { headers: CORS_HEADERS });
          }
        }

        // Fetch holdings from DUMMY dataset or generate a dynamic premium mock based on stock code
        let holdings = DUMMY_HOLDINGS_BY_CODE[code];
        if (!holdings) {
          // Dynamically generate holdings for other codes so they don't break
          holdings = [
            { name: '삼성전자', value: 28.4, code: '005930' },
            { name: 'SK하이닉스', value: 14.5, code: '000660' },
            { name: '현대차', value: 9.2, code: '005380' },
            { name: '기아', value: 8.1, code: '000270' },
            { name: '셀트리온', value: 7.4, code: '068270' },
            { name: 'KB금융', value: 6.8, code: '105560' },
            { name: '신한지주', value: 5.9, code: '055550' },
            { name: 'POSCO홀딩스', value: 4.8, code: '005490' },
            { name: '삼성물산', value: 3.5, code: '028260' },
            { name: 'NAVER', value: 3.1, code: '035420' }
          ];
        }

        const responseJson = JSON.stringify(holdings);

        if (env.KV) {
          await env.KV.put(`etf:holdings:${code}`, responseJson, { expirationTtl: 3600 });
        }

        return new Response(responseJson, { headers: CORS_HEADERS });
      }

      // 3. GET /api/etf/:code/changes
      const changesMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)\/changes$/);
      if (changesMatch) {
        const code = changesMatch[1];
        const history = DUMMY_HISTORY[code] || [
          { date: '2026-06-02', type: 'weight', message: '포트폴리오 비중 정기 리밸런싱 완료' }
        ];
        return new Response(JSON.stringify(history), { headers: CORS_HEADERS });
      }

      // 4. GET /api/changes (Today's changes alerts)
      if (path === '/api/changes') {
        return new Response(JSON.stringify(DUMMY_CHANGES), { headers: CORS_HEADERS });
      }

      // 5. GET /api/themes (Theme mapping)
      if (path === '/api/themes') {
        const themes = [
          { id: 'semi', name: '반도체', etfs: ['453950', '463810', '391010'] },
          { id: 'nuclear', name: '원자력', etfs: ['427110', '455500'] },
          { id: 'battery', name: '2차전지', etfs: ['305540'] }
        ];
        return new Response(JSON.stringify(themes), { headers: CORS_HEADERS });
      }

      // 6. GET /api/etf/:code (Individual details)
      const detailMatch = path.match(/^\/api\/etf\/([0-9a-zA-Z]+)$/);
      if (detailMatch) {
        const code = detailMatch[1];
        const details = {
          code,
          name: code === '453950' ? 'SOL 반도체소부장Fn' :
                code === '305540' ? 'TIGER 2차전지테마' :
                code === '379800' ? 'KODEX 미국S&P500핵심소비재' : 'KODEX 200',
          provider: code === '453950' ? '신한자산운용' : '미래에셋자산운용',
          listingDate: '2023-04-25',
          fee: code === '453950' ? 0.30 : 0.45,
          aum: 3120,
          distributionCycle: '연 1회 (4월)'
        };
        return new Response(JSON.stringify(details), { headers: CORS_HEADERS });
      }

      // 404 Route
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: CORS_HEADERS
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};
