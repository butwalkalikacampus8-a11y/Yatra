'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

const LOTTIE_PATHS: Record<string, string> = {
  gps: '/lottie/gps.json',
  blockchain: '/lottie/blockchain.json',
};

interface LottieAnimationProps {
  type: 'gps' | 'blockchain';
  fallback: React.ReactNode;
  className?: string;
}

export function LottieAnimation({ type, fallback, className }: LottieAnimationProps) {
  const [data, setData] = useState<object | null>(null);
  const url = LOTTIE_PATHS[type];

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [url]);

  if (!data) return <div className={className}>{fallback}</div>;

  return (
    <div className={className}>
      <Lottie animationData={data} loop style={{ width: 160, height: 160 }} />
    </div>
  );
}
