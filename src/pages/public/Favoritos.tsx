import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import { minigames } from '@/config/games'
import { useFavorites } from '@/hooks/useFavorites'

export default function Favoritos() {
  const { favorites, toggleFavorite } = useFavorites()
  const favoriteGames = minigames.filter(game => favorites.includes(game.id))

  return (
    <div className="min-h-screen bg-surface-950 pt-24 pb-20 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        <div className="text-center mb-14">
          <h1 className="font-display font-bold text-white text-3xl sm:text-4xl mb-3">
            Meus Favoritos
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto">
            Acesso rápido aos seus jogos preferidos.
          </p>
        </div>

        {favoriteGames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-surface-800 rounded-full flex items-center justify-center mb-6">
              <Star size={40} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum favorito ainda</h3>
            <p className="text-slate-400 text-center max-w-sm mb-8">
              Você ainda não adicionou nenhum jogo aos seus favoritos. Explore nossos minigames e clique na estrelinha para salvar!
            </p>
            <Link to="/" className="btn-primary">
              Explorar Jogos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteGames.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="h-full"
              >
                <Link to={game.to} className="block h-full group">
                  <div className="rounded-3xl overflow-hidden glass p-1 h-full hover:scale-[1.02] transition-transform duration-300 relative">
                    <button 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleFavorite(game.id)
                      }}
                      className="absolute top-4 left-4 z-30 p-2 rounded-full bg-surface-900/50 hover:bg-surface-800 transition-colors border border-white/5 shadow-lg backdrop-blur-sm"
                    >
                      <Star size={20} className="fill-yellow-400 text-yellow-400" />
                    </button>

                    <div className="rounded-2xl p-8 h-full flex flex-col items-center text-center border border-white/5 bg-surface-800/80 relative overflow-hidden">
                      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl ${game.theme.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                      
                      {game.isNew && (
                        <span className="absolute top-4 right-4 bg-brand-500 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg z-10">
                          Novo
                        </span>
                      )}
                      
                      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 relative z-10 group-hover:-translate-y-2 transition-transform duration-300 ${game.theme.iconBg}`}>
                        {game.icon}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-3 relative z-10">{game.title}</h3>
                      <p className="text-sm text-slate-400 relative z-10">{game.description}</p>
                      
                      <div className="mt-8 relative z-10 w-full mt-auto pt-4">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold text-white group-hover:text-brand-400 transition-colors">
                          Jogar Agora <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
