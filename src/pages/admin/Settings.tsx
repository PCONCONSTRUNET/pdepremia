import { Settings, Star, Link as LinkIcon, CreditCard, Bell, Globe } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const handleSave = () => toast.success('Configurações salvas!')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-white text-2xl">Configurações</h1>
        <p className="text-slate-400 text-sm">Personalize a plataforma</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <Card>
          <h2 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <Star size={18} className="text-brand-400" />
            Identidade da Plataforma
          </h2>
          <div className="space-y-4">
            <Input label="Nome da plataforma" defaultValue="Premiajá" />
            <Input label="Slogan" defaultValue="Premiações instantâneas e transparentes" />
            <Input label="E-mail de contato" type="email" placeholder="contato@premiaja.com.br" />
            <Input label="WhatsApp (com DDD)" placeholder="(11) 99999-9999" />
          </div>
        </Card>

        <Card>
          <h2 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-emerald-400" />
            PIX Manual
          </h2>
          <div className="space-y-4">
            <Input label="Chave PIX" placeholder="email, CPF, CNPJ ou telefone" />
            <Input label="Nome do favorecido" placeholder="Nome que aparece no PIX" />
          </div>
        </Card>

        <Card>
          <h2 className="font-display font-semibold text-white text-lg mb-4 flex items-center gap-2">
            <Globe size={18} className="text-blue-400" />
            Redes Sociais
          </h2>
          <div className="space-y-4">
            <Input label="Instagram" placeholder="https://instagram.com/..." />
            <Input label="TikTok" placeholder="https://tiktok.com/@..." />
            <Input label="YouTube" placeholder="https://youtube.com/@..." />
          </div>
        </Card>

        <Button variant="primary" size="lg" onClick={handleSave}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
