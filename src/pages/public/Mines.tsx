import { Bomb } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'

export default function Mines() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="bg-surface-900 border border-surface-800 rounded-3xl p-8 sm:p-12 max-w-lg w-full text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500" />
        
        <div className="w-24 h-24 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center mx-auto mb-6 shadow-inner relative group">
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl group-hover:bg-red-500/30 transition-colors" />
          <Bomb size={48} className="text-red-400 group-hover:scale-110 transition-transform duration-300 relative z-10" />
        </div>

        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Mines</h1>
        
        <div className="bg-surface-800/50 rounded-xl p-4 mb-8 border border-white/5">
          <p className="text-brand-400 font-bold text-lg mb-1">Em breve</p>
          <p className="text-slate-400 text-sm">
            Estamos em desenvolvimento para trazer a melhor experiência de Mines para você. Fique ligado!
          </p>
        </div>

        <Link to="/">
          <Button variant="secondary" className="w-full">
            Voltar para o Início
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
