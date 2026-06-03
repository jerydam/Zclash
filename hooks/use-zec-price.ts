import { useState, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://zclash-backend.onrender.com";

interface ZecPriceData {
  zecUsd: number;
  minimums: {
    duelStakeZec: number;
    duelPlatformFeeZec: number;
    tournamentPoolUsd: number;
  };
  loading: boolean;
}

export function useZecPrice(): ZecPriceData {
  const [data, setData] = useState<ZecPriceData>({
    zecUsd: 30,
    minimums: { duelStakeZec: 0.033, duelPlatformFeeZec: 0.0083, tournamentPoolUsd: 5 },
    loading: true,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/prices`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setData({
            zecUsd:   d.zecUsd,
            minimums: d.minimums,
            loading:  false,
          });
        }
      })
      .catch(() => setData(prev => ({ ...prev, loading: false })));

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/prices`)
        .then(r => r.json())
        .then(d => { if (d.success) setData({ zecUsd: d.zecUsd, minimums: d.minimums, loading: false }); })
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return data;
}