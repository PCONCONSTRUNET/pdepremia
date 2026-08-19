import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

type ColorType = 'red' | 'white' | 'black'

type HistoryItem = {
  color: ColorType
  number: number | string
  timestamp: string // Formato "DD/MM/YYYY HH:MM:SS"
  hash?: string
  roundId?: number
}

interface DoubleHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  history: HistoryItem[]
  onItemClick?: (item: HistoryItem) => void
}

export function DoubleHistoryModal({ isOpen, onClose, history, onItemClick }: DoubleHistoryModalProps) {
  // O histórico é local para a sessão, então só temos o que está na prop.
  // Vamos paginar o histórico local. 
  // Na referência, o grid parece ter 12 colunas e 4 ou 5 linhas.
  const itemsPerPage = 48
  const [currentPage, setCurrentPage] = React.useState(1)
  
  // Como as bolinhas entram pela direita, as mais recentes estão no fim do array.
  // Vamos inverter para o modal mostrar a mais recente primeiro.
  const reversedHistory = [...history].reverse()
  const totalPages = Math.max(1, Math.ceil(reversedHistory.length / itemsPerPage))
  
  const currentItems = reversedHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1)
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1)
  }

  // Pegar data atual para o filtro estético (como na foto)
  const today = new Date()
  const formatDate = (date: Date) => {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = date.getFullYear()
    return `${d}-${m}-${y}`
  }
  const dateFrom = new Date(today)
  dateFrom.setDate(dateFrom.getDate() - 30) // 30 dias atrás

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-6xl bg-[#15191D] border border-surface-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-surface-800 bg-[#1A1F24] pr-4">
            <div className="flex">
              <button className="px-6 py-4 text-sm font-bold text-white border-b-2 border-[#F12C4C] uppercase tracking-wider">
                Histórico
              </button>
              <button className="px-6 py-4 text-sm font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors cursor-not-allowed">
                Padrões
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center bg-[#0F1317] border border-surface-800 rounded-lg px-4 py-2 text-xs font-medium">
                <span className="text-slate-400 mr-2">De</span>
                <span className="text-white">{formatDate(dateFrom)}</span>
                <span className="text-slate-400 mx-2">Até</span>
                <span className="text-white">{formatDate(today)}</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-surface-800/50 hover:bg-surface-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Grid Content */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#111418]">
            {reversedHistory.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p>Nenhum histórico disponível nesta sessão.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-x-2 gap-y-4">
                {currentItems.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => onItemClick?.(item)}
                    className="flex flex-col items-center justify-center p-2 bg-[#1A1F24] rounded-xl border border-surface-800/50 hover:border-surface-600 transition-colors cursor-pointer"
                  >
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-inner mb-3
                        ${item.color === 'red' ? 'bg-[#F12C4C] text-white shadow-black/20' : 
                          item.color === 'white' ? 'bg-white text-[#1A1F24] shadow-black/10' : 
                          'bg-[#2B3139] text-white border-2 border-surface-700 shadow-black/40'}`}
                    >
                      {item.color === 'white' ? <img src="/favicon.png" alt="W" className="w-6 h-6 object-contain opacity-90" /> : item.number}
                    </div>
                    
                    <div className="flex flex-col items-center text-[10px] text-slate-500 leading-tight">
                      <span>{item.timestamp.split(' ')[0]}</span>
                      <span>{item.timestamp.split(' ')[1]}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Pagination */}
          <div className="p-4 border-t border-surface-800 bg-[#1A1F24] flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#2B3139] text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-[#2B3139] text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
