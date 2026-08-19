import { Shield, Lock, Eye, Database } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-500/20 shadow-inner">
          <Shield size={32} className="text-brand-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Privacidade</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-8 text-slate-300 leading-relaxed">
        
        {/* Section 1 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
            <Lock className="text-brand-400" />
            1. Compromisso com a LGPD (Lei 13.709/2018 e atualizações)
          </h2>
          <p className="mb-4">
            A PREMIA tem o compromisso absoluto com a proteção da sua privacidade e dos seus dados pessoais. Atuamos em rigorosa conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD), incluindo as regulamentações normativas da Autoridade Nacional de Proteção de Dados (ANPD) em vigor no ano de 2026.
          </p>
        </section>

        {/* Section 2 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
            <Database className="text-emerald-400" />
            2. Coleta e Finalidade dos Dados
          </h2>
          <p className="mb-4">Coletamos exclusivamente os dados estritamente necessários para o funcionamento seguro da plataforma e para o cumprimento de obrigações legais:</p>
          <ul className="list-disc pl-6 space-y-3 mb-4">
            <li><strong>Dados Cadastrais (Nome, CPF, Data de Nascimento, E-mail, Telefone):</strong> Utilizados para criação da conta, verificação de maioridade (18+), e emissão dos bilhetes eletrônicos. O CPF é a chave primária antifraude.</li>
            <li><strong>Biometria e Imagens (KYC):</strong> A foto do documento de identidade é coletada com o único propósito de Prevenção à Lavagem de Dinheiro (PLD) e verificação de identidade antes da autorização de saques. Estas imagens são armazenadas em servidores criptografados de alta segurança e acessíveis apenas por pessoal autorizado, nunca sendo comercializadas.</li>
            <li><strong>Dados Financeiros (Chave PIX):</strong> Armazenados exclusivamente para processamento do pagamento de prêmios e saques de carteira.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
            <Eye className="text-blue-400" />
            3. Compartilhamento de Dados
          </h2>
          <p className="mb-4">
            Garantimos que seus dados <strong>jamais serão vendidos</strong> a terceiros para fins de marketing. O compartilhamento ocorre estritamente nos seguintes cenários:
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li>Com gateways de pagamento homologados pelo Banco Central para o processamento de transações (PIX).</li>
            <li>Com o Ministério da Fazenda / Secretaria de Prêmios e Apostas (SPA), quando requisitado para fins de auditoria, fiscalização ou recolhimento de impostos.</li>
            <li>Mediante ordem judicial expedida por autoridade competente.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            4. Seus Direitos (Art. 18 da LGPD)
          </h2>
          <p className="mb-4">Como titular dos dados, você tem o direito, a qualquer momento e mediante requisição formal, de obter:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>A confirmação da existência de tratamento de dados.</li>
            <li>O acesso aos seus dados.</li>
            <li>A correção de dados incompletos, inexatos ou desatualizados.</li>
            <li>A eliminação dos dados pessoais, <strong>exceto</strong> naqueles casos em que a retenção é exigida por lei (como registros de transações financeiras e IPs de acesso, que devem ser guardados por no mínimo 6 meses a 5 anos de acordo com o Marco Civil da Internet e normas do Banco Central).</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            5. Segurança e Retenção
          </h2>
          <p className="mb-4">
            Adotamos medidas técnicas, administrativas e de segurança da informação (como criptografia de ponta a ponta e protocolos SSL/TLS) para proteger seus dados de acessos não autorizados. Os dados KYC e documentos são deletados automaticamente 5 anos após a última atividade do usuário, conforme obrigações de Prevenção à Lavagem de Dinheiro.
          </p>
        </section>

      </div>
    </div>
  )
}
