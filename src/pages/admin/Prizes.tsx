import { Gift, Trophy, Ticket, Package, Disc3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AdminPrizes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Prêmios</h1>
        <p className="text-slate-400 text-sm">Gerencie os prêmios dos sorteios</p>
      </div>
      <Card>
        <div className="text-center py-12 flex flex-col items-center justify-center">
          <Gift size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Selecione um sorteio para gerenciar seus prêmios.</p>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            Esta funcionalidade está disponível na tela de edição de cada sorteio.
          </p>
          <Button onClick={() => window.location.href = '/admin/sorteios'} variant="secondary">
            Ir para Sorteios
          </Button>
        </div>
      </Card>
    </div>
  )
}
