import React, { useState } from 'react'
import { Wheel } from '@/components/wheel'
import type { Prize } from '@/components/wheel'
import toast from 'react-hot-toast'

export default function WheelTest() {
  const [prizes] = useState<Prize[]>([
    { id: '1', name: 'iPhone 15 Pro Max', color: '#10B981' },
    { id: '2', name: 'R$ 1.000,00', color: '#3B82F6' },
    { id: '3', name: 'R$ 500,00', color: '#8B5CF6' },
    { id: '4', name: 'R$ 100,00', color: '#EC4899' },
  ])

  const handleFinish = (prize: Prize) => {
    toast.success(`Parabéns! Você ganhou: ${prize.name}`)
  }

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-display font-bold text-white mb-4">Roleta Premiada</h1>
        <p className="text-slate-400">Teste da roleta dinâmica P DE PREMIA.</p>
      </div>

      <div className="bg-surface-900 border border-surface-700 p-8 rounded-3xl shadow-2xl">
        <Wheel prizes={prizes} onFinish={handleFinish} />
      </div>
    </div>
  )
}
