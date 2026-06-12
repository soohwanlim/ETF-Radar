import { useState, useEffect } from 'react';

const API_BASE = '/api';

export function useETFData(period = '3m') {
  const [etfs, setEtfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchEtfs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/rankings?period=${period}`);
        if (!response.ok) {
          throw new Error('ETF 데이터를 불러오는 중 요류가 발생했습니다.');
        }
        const data = await response.json();
        if (active) {
          setEtfs(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEtfs();

    return () => {
      active = false;
    };
  }, [period]);

  return { etfs, loading, error };
}

export function useETFDetail(code) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/etf/${code}`);
        if (!response.ok) {
          throw new Error('ETF 상세 정보를 불러오는 중 오류가 발생했습니다.');
        }
        const data = await response.json();
        if (active) {
          setDetail(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      active = false;
    };
  }, [code]);

  return { detail, loading, error };
}

export function useETFHoldings(code) {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    let active = true;

    const fetchHoldings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/etf/${code}/holdings`);
        if (!response.ok) {
          throw new Error('구성종목 정보를 불러오는 중 오류가 발생했습니다.');
        }
        const data = await response.json();
        if (active) {
          setHoldings(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHoldings();

    return () => {
      active = false;
    };
  }, [code]);

  return { holdings, loading, error };
}

export function useETFHistory(code) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!code) return;
    let active = true;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/etf/${code}/changes`);
        if (!response.ok) {
          throw new Error('변경 이력을 불러오는 중 오류가 발생했습니다.');
        }
        const data = await response.json();
        if (active) {
          setHistory(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [code]);

  return { history, loading, error };
}
