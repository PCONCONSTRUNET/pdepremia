import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';

export interface Prize {
  id: string;
  name: string;
  color?: string;
  imageUrl?: string;
}

interface BoxGridProps {
  prizes: Prize[];
  onFinish?: (prize: Prize) => void;
}

export function MysteryBoxGrid({ prizes, onFinish }: BoxGridProps) {
  const [openingBoxId, setOpeningBoxId] = useState<number | null>(null);
  const [openedBoxId, setOpenedBoxId] = useState<number | null>(null);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);

  const handleBoxClick = (index: number) => {
    if (openingBoxId !== null || openedBoxId !== null) return;
    
    setOpeningBoxId(index);
    
    // Select a random prize
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const selectedPrize = prizes[randomIndex] || { id: 'default', name: 'Prêmio Especial', color: '#F59E0B' };
    setWinningPrize(selectedPrize);

    // Simulate opening animation
    setTimeout(() => {
      setOpeningBoxId(null);
      setOpenedBoxId(index);
      
      setTimeout(() => {
        if (onFinish) onFinish(selectedPrize);
      }, 1500); // Wait a bit before completing
    }, 2000); // 2 seconds of shaking/opening
  };

  const boxes = Array.from({ length: 6 }).map((_, i) => i);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-4xl mx-auto p-4">
      {boxes.map((index) => {
        const isOpening = openingBoxId === index;
        const isOpened = openedBoxId === index;
        const isOther = openedBoxId !== null && openedBoxId !== index;

        return (
          <motion.button
            key={index}
            onClick={() => handleBoxClick(index)}
            disabled={openingBoxId !== null || openedBoxId !== null}
            animate={
              isOpening
                ? {
                    rotate: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.05, 1.05, 1.05, 1.05, 1.1],
                    transition: { duration: 1.5, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
                  }
                : isOpened
                ? { scale: 1.1, opacity: 1 }
                : isOther
                ? { opacity: 0.4, scale: 0.95 }
                : { scale: 1, opacity: 1 }
            }
            whileHover={openingBoxId === null && openedBoxId === null ? { scale: 1.05, y: -5 } : {}}
            whileTap={openingBoxId === null && openedBoxId === null ? { scale: 0.95 } : {}}
            className={`relative aspect-[4/5] rounded-3xl flex flex-col items-center justify-center p-6 transition-all duration-300 ${
              isOpened 
                ? 'bg-surface-800 border-2 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.2)]' 
                : isOther
                ? 'bg-surface-900 border border-surface-800'
                : 'bg-gradient-to-b from-surface-800 to-surface-900 border border-surface-700 hover:border-amber-500/50 hover:shadow-[0_10px_30px_rgba(245,158,11,0.1)]'
            }`}
          >
            <AnimatePresence mode="wait">
              {isOpened && winningPrize ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex flex-col items-center text-center gap-4 w-full"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2)_0%,transparent_70%)] pointer-events-none rounded-3xl" />
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-xl z-10 overflow-hidden"
                    style={{ backgroundColor: `${winningPrize.color}20`, color: winningPrize.color, border: `1px solid ${winningPrize.color}50` }}
                  >
                    {winningPrize.imageUrl ? (
                      <img src={winningPrize.imageUrl} alt={winningPrize.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Sparkles size={40} />
                    )}
                  </div>
                  <span 
                    className="font-display font-bold text-xl md:text-2xl drop-shadow-md z-10"
                    style={{ color: winningPrize.color }}
                  >
                    {winningPrize.name}
                  </span>
                  <span className="text-sm text-slate-400 z-10 mt-2">Prêmio resgatado!</span>
                </motion.div>
              ) : (
                <motion.div
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex flex-col items-center gap-6 w-full"
                >
                  <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-surface-800 to-surface-950 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] relative overflow-hidden ${isOpening ? 'animate-pulse' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-transparent opacity-50"></div>
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent"></div>
                    <Package size={56} className={isOpening ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-slate-500'} strokeWidth={1.5} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`font-display font-bold tracking-wide ${isOpening ? 'text-amber-400' : 'text-slate-300'}`}>
                      {isOpening ? 'ABRINDO...' : 'CAIXA'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      Misteriosa
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
