import { useEffect } from 'react'
import { useRouteError, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function ErrorPage() {
  const error = useRouteError() as any
  console.error(error)

  useEffect(() => {
    const errorMsg = error?.message || error?.statusText || ''
    if (errorMsg.includes('Failed to fetch dynamically imported module') || errorMsg.includes('Importing a module script failed')) {
      if (!sessionStorage.getItem('chunk_load_retried')) {
        sessionStorage.setItem('chunk_load_retried', 'true')
        window.location.reload()
      }
    }
  }, [error])

  const is404 = error?.status === 404 || error?.message?.includes('Not Found')

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-hero-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass p-8 rounded-2xl text-center shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-brand-500/20 blur-[50px] rounded-full" />
        
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 shadow-xl mb-6 text-brand-400">
          <AlertCircle size={32} />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {is404 ? 'Página não encontrada' : 'Ops, algo deu errado'}
        </h1>
        
        <p className="text-slate-400 mb-8 text-sm leading-relaxed">
          {is404 
            ? 'A página que você está tentando acessar não existe ou foi movida.' 
            : (error?.message || error?.statusText || 'Ocorreu um erro inesperado no sistema. Tente novamente mais tarde.')}
        </p>
        {error?.stack && (
          <pre className="text-xs text-left text-red-400 bg-black/50 p-4 rounded overflow-auto mb-8 max-h-40">
            {error.stack}
          </pre>
        )}

        <Link to="/">
          <Button variant="primary" size="lg" className="w-full" leftIcon={<Home size={18} />}>
            Voltar para o Início
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
