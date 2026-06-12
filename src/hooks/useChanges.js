import { useState, useEffect } from 'react';
import { loadChangesHistory } from '../data/staticData';

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
        const history = await loadChangesHistory();
        const latestDate = history[0]?.date;
        const data = latestDate ? history.filter(change => change.date === latestDate).slice(0, 10) : [];
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
