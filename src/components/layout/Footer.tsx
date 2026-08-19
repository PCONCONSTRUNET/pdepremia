import { Link } from 'react-router-dom'
import { Star, MessageCircle, Mail, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-surface-900 border-t border-white/5 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img 
                src="/logo-rodape.png" 
                alt="P DE PREMIA" 
                className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105" 
              />
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              Plataforma de sorteios promocionais com premiações instantâneas e roletas transparentes.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.instagram.com/pdepremia/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-pink-500/30 transition-all hover:bg-gradient-to-br hover:from-purple-500 hover:via-pink-500 hover:to-orange-500"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                aria-label="WhatsApp"
              >
                <MessageCircle size={16} />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center text-slate-400 hover:text-brand-400 hover:border-brand-500/30 transition-all"
                aria-label="E-mail"
              >
                <Mail size={16} />
              </a>
              <a
                href="https://t.me/pdepremia"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-surface-700/50 border border-surface-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-[#2AABEE]/30 transition-all hover:bg-[#2AABEE]"
                aria-label="Telegram"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.176-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.432.893-.65a146.36 146.36 0 0 1 8.527-3.582c3.31-1.39 4.025-1.636 4.475-1.645z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Navegação</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/', label: 'Início' },
                { to: '/ganhadores', label: 'Ganhadores' },
                { to: '/transparencia', label: 'Transparência' },
                { to: '/double', label: 'Double' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Conta */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Minha Conta</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/login', label: 'Entrar' },
                { to: '/cadastro', label: 'Criar Conta' },
                { to: '/meus-bilhetes', label: 'Meus Bilhetes' },
                { to: '/meus-premios', label: 'Meus Prêmios' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/termos', label: 'Termos de Uso' },
                { to: '/privacidade', label: 'Privacidade' },
                { to: '/transparencia', label: 'Auditoria' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center gap-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} P DE PREMIA. Todos os direitos reservados.
          </p>
          <p className="text-slate-600 text-xs flex items-center gap-1">
            Plataforma segura e auditável
            <ExternalLink size={10} />
          </p>
        </div>
      </div>
    </footer>
  )
}
