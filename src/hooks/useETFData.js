import { useState, useEffect } from 'react';
import { loadEtf, loadEtfHistory, loadEtfs, loadHoldings } from '../data/staticData';

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
        const data = await loadEtfs();
        const rateKey = `rate${period}`;
        const sorted = [...data].sort((a, b) => (b[rateKey] ?? -Infinity) - (a[rateKey] ?? -Infinity));
        if (active) {
          setEtfs(sorted);
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
        const data = await loadEtf(code);
        if (!data) throw new Error('ETF 상세 정보를 찾지 못했습니다.');
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
        const data = await loadHoldings(code);
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
        const data = await loadEtfHistory(code);
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
