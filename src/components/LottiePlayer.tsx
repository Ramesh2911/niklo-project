import React, { useEffect, useRef } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';

interface LottiePlayerProps {
  animationData: object;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  autoplay?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

const LottiePlayer: React.FC<LottiePlayerProps> = ({
  animationData, className, style, loop = true, autoplay = true, onClick, ariaLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    animRef.current = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop,
      autoplay,
      animationData,
    });
    return () => animRef.current?.destroy();
  }, [animationData, loop, autoplay]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    />
  );
};

export default LottiePlayer;
