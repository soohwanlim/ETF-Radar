import { useState, useEffect } from 'react';

const API_BASE = '/api';

export function useChanges() {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchChanges = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/changes`);
        if (!response.ok) {
          throw new Error('구성종목 변경사항을 불러오는 중 오류가 발생했습니다.');
        }
        const data = await response.json();
        if (active) {
          setChanges(data);
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

    fetchChanges();

    return () => {
      active = false;
    };
  }, []);

  return { changes, loading, error };
}
