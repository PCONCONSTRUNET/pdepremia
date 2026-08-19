import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { Prize } from './MysteryBoxGrid';

interface HorizontalRouletteProps {
  prizes: Prize[];
  isSpinning: boolean;
  onFinish?: (prize: Prize) => void;
}

const TOTAL_ITEMS = 100;
const WINNER_IDX = 70;
const GAP = 16; // gap-4 = 16px

export function HorizontalRoulette({ prizes, isSpinning, onFinish }: HorizontalRouletteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const animRef = useRef<any>(null);
  const hasSpunRef = useRef(false);
  const idleRunningRef = useRef(false);

  const available = prizes.length > 0 ? prizes : [{ id: 'dummy', name: 'Prêmio', color: '#F59E0B' }];

  const [items, setItems] = useState<Prize[]>(() =>
    Array.from({ length: TOTAL_ITEMS }, () => available[Math.floor(Math.random() * available.length)])
  );
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);

  // Helper: get actual rendered item width from DOM
  const getItemWidth = () => {
    if (firstItemRef.current) {
      return firstItemRef.current.getBoundingClientRect().width + GAP;
    }
    return (window.innerWidth < 768 ? 140 : 160) + GAP;
  };

  const getContainerWidth = () => {
    return containerRef.current?.clientWidth || window.innerWidth;
  };

  // Idle scrolling loop
  const startIdle = () => {
    if (idleRunningRef.current) return;
    idleRunningRef.current = true;

    const itemWidth = getItemWidth();
    const containerWidth = getContainerWidth();
    const boxWidth = itemWidth - GAP;

    // Position so item 5 is centered, loop every 20 items
    const loopBlock = 20 * itemWidth;
    const startX = (containerWidth / 2) - (5 * itemWidth + boxWidth / 2);
    const endX = startX - loopBlock;

    x.set(startX);

    const loop = () => {
      animRef.current = animate(x, endX, {
        duration: 25,
        ease: 'linear',
        onComplete: () => {
          x.set(startX);
          loop();
        }
      });
    };
    loop();
  };

  const stopIdle = () => {
    idleRunningRef.current = false;
    animRef.current?.stop();
  };

  // Start idle when not spinning
  useEffect(() => {
    if (!isSpinning) {
      hasSpunRef.current = false;
      setWinnerIndex(null);
      // Small delay to let DOM render first so we can measure item width
      const timeout = setTimeout(startIdle, 80);
      return () => {
        clearTimeout(timeout);
        stopIdle();
      };
    }
  }, [isSpinning]);

  // Trigger spin
  useEffect(() => {
    if (!isSpinning || hasSpunRef.current) return;
    hasSpunRef.current = true;
    stopIdle();

    const selectedPrize = available[Math.floor(Math.random() * available.length)];

    // Place winner at WINNER_IDX
    const newItems = [...items];
    newItems[WINNER_IDX] = selectedPrize;
    setItems(newItems);
    setWinnerIndex(WINNER_IDX);

    // Use requestAnimationFrame to ensure DOM has updated with new items before measuring
    requestAnimationFrame(() => {
      const itemWidth = getItemWidth();
      const containerWidth = getContainerWidth();
      const boxWidth = itemWidth - GAP;

      // The track starts at x=0 in DOM. After translateX, item[i] center is:
      //   x + i * itemWidth + boxWidth / 2
      // We want item[WINNER_IDX] center = containerWidth / 2:
      //   targetX + WINNER_IDX * itemWidth + boxWidth / 2 = containerWidth / 2
      const targetX = (containerWidth / 2) - (WINNER_IDX * itemWidth + boxWidth / 2);

      animRef.current = animate(x, targetX, {
        duration: 8,
        ease: [0.12, 0.85, 0.12, 1],
        onComplete: () => {
          if (onFinish) onFinish(selectedPrize);
        }
      });
    });
  }, [isSpinning]);

  return (
    <div
      ref={containerRef}
      className="w-full relative py-8 overflow-hidden bg-surface-900 border-y border-surface-800 rounded-3xl shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
    >
      {/* Center Marker Line — precisely at 50% */}
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-500 to-transparent z-20 shadow-[0_0_15px_rgba(245,158,11,1)]" />

      <motion.div
        style={{ x }}
        className="flex w-max"
      >
        {items.map((item, index) => {
          const isWinner = index === winnerIndex && isSpinning;
          return (
            <div
              key={index}
              ref={index === 0 ? firstItemRef : undefined}
              style={{ marginRight: `${GAP}px` }}
              className={`w-[140px] h-[140px] md:w-[160px] md:h-[160px] shrink-0 rounded-2xl border flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors ${
                isWinner
                  ? 'bg-surface-800 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
                  : 'bg-surface-800/80 border-surface-700'
              }`}
            >
              {isWinner && (
                <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />
              )}
              {item.imageUrl ? (
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center mb-3 z-10">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
              ) : (
                <div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-3 shadow-inner z-10 overflow-hidden"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  <Sparkles size={32} />
                </div>
              )}
              <p
                className="text-xs md:text-sm font-bold text-center z-10"
                style={{ color: item.color || '#fff' }}
              >
                {item.name}
              </p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
