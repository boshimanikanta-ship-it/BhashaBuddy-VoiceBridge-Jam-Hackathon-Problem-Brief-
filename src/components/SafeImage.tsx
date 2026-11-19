import React, { useState } from 'react';
import { Radio } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackLabel,
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#231942] via-[#171721] to-[#3B1D12] text-slate-300 select-none p-3 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Radio className="w-7 h-7 text-orange-400 mb-1.5 opacity-90" />
        {fallbackLabel && (
          <span className="text-xs font-medium text-slate-200 line-clamp-2">{fallbackLabel}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
