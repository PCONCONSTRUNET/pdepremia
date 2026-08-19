import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import type { Prize } from './MysteryBoxGrid';

interface SingleMysteryBoxProps {
  prizes: Prize[];
  onFinish?: (prize: Prize) => void;
  isSpinning: boolean;
}

export function SingleMysteryBox({ prizes, onFinish, isSpinning }: SingleMysteryBoxProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);

  useEffect(() => {
    if (isSpinning && !isOpened) {
      // Select a random prize immediately
      const randomIndex = Math.floor(Math.random() * prizes.length);
      const selectedPrize = prizes[randomIndex] || { id: 'default', name: 'Prêmio Especial', color: '#F59E0B' };
      setWinningPrize(selectedPrize);

      // Wait for "shaking" animation to finish before opening
      const timer = setTimeout(() => {
        setIsOpened(true);
        setTimeout(() => {
          if (onFinish) onFinish(selectedPrize);
        }, 1500); // Wait a bit before completing
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isSpinning]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      <motion.div
        animate={
          isSpinning && !isOpened
            ? {
                rotate: [0, -10, 10, -10, 10, -5, 5, 0],
                scale: [1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.2],
                transition: { duration: 2, times: [0, 0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 1] }
              }
            : isOpened
            ? { scale: 1.1, opacity: 1 }
            : { scale: 1, opacity: 1 }
        }
        className={`relative aspect-square w-64 md:w-80 rounded-[40px] flex flex-col items-center justify-center p-6 transition-all duration-300 ${
          isOpened 
            ? 'bg-surface-800 border-4 border-amber-500 shadow-[0_0_60px_rgba(245,158,11,0.3)]' 
            : 'bg-gradient-to-b from-surface-800 to-surface-900 border-2 border-surface-700 shadow-2xl'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpened && winningPrize ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="flex flex-col items-center text-center gap-6 w-full z-10"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3)_0%,transparent_70%)] pointer-events-none rounded-[40px]" />
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center mb-2 shadow-2xl z-10"
                style={{ backgroundColor: `${winningPrize.color}20`, color: winningPrize.color, border: `2px solid ${winningPrize.color}50` }}
              >
                <Sparkles size={48} />
              </div>
              <span 
                className="font-display font-black text-2xl md:text-3xl drop-shadow-lg z-10"
                style={{ color: winningPrize.color }}
              >
                {winningPrize.name}
              </span>
              <span className="text-base text-slate-400 z-10 font-medium">Você ganhou!</span>
            </motion.div>
          ) : (
            <motion.div
              exit={{ opacity: 0, scale: 0.5 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-surface-800 to-surface-950 flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden ${isSpinning ? 'animate-pulse' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>
                <Package size={80} className={isSpinning ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]' : 'text-slate-500'} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className={`font-display font-bold text-2xl tracking-wide ${isSpinning ? 'text-amber-400' : 'text-slate-300'}`}>
                  {isSpinning ? 'ABRINDO...' : 'CAIXA'}
                </span>
                <span className="text-sm text-slate-500 font-bold uppercase tracking-[0.2em]">
                  Misteriosa
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
