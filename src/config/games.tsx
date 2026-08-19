import { Dices } from 'lucide-react'

export const minigames = [
  {
    id: 'double',
    title: 'Double',
    description: 'Multiplique suas chances neste jogo rápido e emocionante.',
    icon: <Dices size={40} className="text-white drop-shadow-md" />,
    theme: {
      glow: 'bg-brand-500/30',
      iconBg: 'bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_0_20px_rgba(99,116,241,0.4)]'
    },
    to: '/double',
    isNew: true
  },
  {
    id: 'roleta',
    title: 'Roleta Diária',
    description: 'Gire a sorte e ganhe prêmios instantâneos.',
    icon: <img src="/roleta-p.png" alt="Roleta Diária" className="w-14 h-14 object-contain drop-shadow-lg group-hover:rotate-12 transition-transform duration-300" />,
    theme: {
      glow: 'bg-purple-500/30',
      iconBg: 'bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
    },
    to: '/roleta-diaria',
    isNew: false
  },
  {
    id: 'boxes',
    title: 'Boxes',
    description: 'Abra caixas misteriosas recheadas de bilhetes e prêmios.',
    icon: <img src="/boxes/box-epica.png" alt="Boxes" className="w-16 h-16 object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300" />,
    theme: {
      glow: 'bg-gold-500/30',
      iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
    },
    to: '/boxes',
    isNew: false
  }
]
