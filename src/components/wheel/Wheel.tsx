import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Trophy } from 'lucide-react'; // Ícone alternativo para o centro caso não tenha o logo

export interface Prize {
  id: string;
  name: string;
  color?: string;
}

interface WheelProps {
  prizes: Prize[];
  onFinish?: (prize: Prize) => void;
}

const DEFAULT_COLORS = [
  '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6', '#F97316'
];

export function Wheel({ prizes, onFinish }: WheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const controls = useAnimation();

  // Agora usamos a quantidade REAL de prêmios fornecida!
  // Se não vier nada, simulamos 4 fatias vazias por padrão para ficar bonito.
  const slots = prizes.length > 0 ? prizes : [
    { id: '1', name: 'Prêmio 1' },
    { id: '2', name: 'Prêmio 2' },
    { id: '3', name: 'Prêmio 3' },
    { id: '4', name: 'Prêmio 4' }
  ];

  const TOTAL_SLOTS = slots.length;
  const SLICE_ANGLE = 360 / TOTAL_SLOTS;

  // Gerar o background colorido nativo
  const gradientStops = slots.map((slot, index) => {
    const startAngle = index * SLICE_ANGLE;
    const endAngle = (index + 1) * SLICE_ANGLE;
    const color = slot.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    return `${color} ${startAngle}deg ${endAngle}deg`;
  }).join(', ');

  const spin = () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const winningIndex = Math.floor(Math.random() * TOTAL_SLOTS);
    const winningPrize = slots[winningIndex];

    const baseRotation = 360 * 6;
    const slotCenterAngle = (winningIndex * SLICE_ANGLE) + (SLICE_ANGLE / 2);
    const targetRotation = baseRotation + (360 - slotCenterAngle);

    const newTotalRotation = rotation + targetRotation;

    controls.start({
      rotate: newTotalRotation,
      transition: {
        duration: 5,
        ease: [0.25, 0.1, 0.25, 1],
      }
    }).then(() => {
      setIsSpinning(false);
      setRotation(newTotalRotation % 360);
      setTimeout(() => {
        if (onFinish) onFinish(winningPrize);
      }, 500);
    });
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* 
        Container Principal 
        O Aro Dourado estático
      */}
      <div 
        className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] rounded-full p-3 shadow-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #aa771c)',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5), inset 0 4px 10px rgba(0,0,0,0.5)'
        }}
      >
        {/* Aro interior escuro de acabamento */}
        <div className="w-full h-full rounded-full bg-surface-950 p-2 shadow-inner relative flex items-center justify-center">
          
          {/* Ponteiro Fixo (Estático no topo) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 drop-shadow-xl">
            <div 
              className="w-10 h-14"
              style={{
                clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                background: 'linear-gradient(to bottom, #fcf6ba, #b38728)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
              }}
            />
          </div>

          {/* O DISCO QUE GIRA (Textos, Cores e Divisórias de Metal) */}
          <motion.div 
            className="w-full h-full rounded-full overflow-hidden relative shadow-inner z-10"
            initial={{ rotate: rotation }}
            animate={controls}
          >
            {/* Fundo colorido fatiado */}
            <div 
              className="w-full h-full absolute inset-0 opacity-95"
              style={{ background: `conic-gradient(${gradientStops})` }}
            />

            {/* Renderizando as divisórias douradas e o texto de cada prêmio */}
            {slots.map((slot, index) => {
              // A linha divisória (começa exatamente em index * SLICE_ANGLE)
              const lineAngle = index * SLICE_ANGLE;
              // O texto (fica exatamente no MEIO da fatia)
              const textAngle = lineAngle + (SLICE_ANGLE / 2);

              return (
                <React.Fragment key={`${slot.id}-${index}`}>
                  {/* Linha (Aço Dourado) */}
                  <div 
                    className="absolute w-[4px] h-[50%] top-0 left-1/2 origin-bottom -translate-x-1/2"
                    style={{ 
                      transform: `rotate(${lineAngle}deg)`,
                      background: 'linear-gradient(to right, #b38728, #fcf6ba, #b38728)',
                      boxShadow: '0 0 5px rgba(0,0,0,0.3)'
                    }}
                  />

                  {/* Texto */}
                  <div 
                    className="absolute w-full h-full top-0 left-0 flex justify-center items-start pt-[12%] pb-[30%] px-1"
                    style={{ transform: `rotate(${textAngle}deg)` }}
                  >
                    <span 
                      className="text-white font-bold text-sm md:text-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate max-h-[80%]"
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        transform: 'rotate(180deg)' // Fix para ler do lado certo
                      }}
                    >
                      {slot.name}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </motion.div>
          
          {/* Círculo Central Estático (Logo) */}
          <div 
            className="absolute z-20 w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center drop-shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #131829, #1e293b)',
              border: '4px solid #fcf6ba',
              boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 15px rgba(0,0,0,0.5)'
            }}
          >
            {/* O "P" Dourado Premium */}
            <span 
              className="font-display font-black text-5xl md:text-7xl"
              style={{
                background: 'linear-gradient(to bottom right, #fcf6ba, #b38728, #bf953f)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.5))'
              }}
            >
              P
            </span>
          </div>
        </div>
      </div>

      <button 
        onClick={spin}
        disabled={isSpinning}
        className="mt-12 bg-brand-500 hover:bg-brand-600 text-white font-display font-bold text-xl px-12 py-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
      >
        {isSpinning ? 'GIRANDO...' : 'GIRAR ROLETA'}
      </button>
    </div>
  );
}
