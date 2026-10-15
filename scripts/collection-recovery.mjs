export async function retryHoldings(load, { wait = ms => new Promise(resolve => setTimeout(resolve, ms)), warn = console.warn } = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const items = await load();
      if (!items.length) throw new Error('Naver ETF analysis returned no TOP 10 holdings');
      return items;
    } catch (error) {
      if (attempt === 3) throw error;
      warn(`[holdings retry ${attempt}/3] ${error.message}`);
      await wait(attempt * 1000);
    }
  }
}

export function recoveryPlan(manifest, status, date, history) {
  const sameDate = manifest.asOf === date;
  return {
    sameDate,
    failedCodes: new Set(sameDate ? (status.failures || []).map(item => item.code) : []),
    changes: sameDate ? history.filter(item => item.date === date) : [],
  };
}
