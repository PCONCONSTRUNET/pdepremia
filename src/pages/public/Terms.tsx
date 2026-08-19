import { Shield, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-500/20 shadow-inner">
          <FileText size={32} className="text-brand-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
          Termos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Uso</span>
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
            <Shield className="text-brand-400" />
            1. Aceitação e Vinculação Legal
          </h2>
          <p className="mb-4">
            Ao acessar e utilizar a plataforma <strong>PREMIA</strong>, você concorda expressamente e sem ressalvas com todos os termos aqui descritos, celebrando um contrato vinculativo. O uso continuado após quaisquer alterações constitui aceitação tácita. 
          </p>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-200 text-sm">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <p>
              A plataforma PREMIA opera em estrita observância ao Código Civil Brasileiro (Lei 10.406/2002), à Lei Geral de Proteção de Dados - LGPD (Lei 13.709/2018), com suas atualizações até 2026, e às normativas da Secretaria de Prêmios e Apostas (SPA) do Ministério da Fazenda.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-400" />
            2. Capacidade Civil e KYC
          </h2>
          <ul className="list-disc pl-6 space-y-3 mb-4">
            <li><strong>Maioridade Exclusiva:</strong> A participação é absolutamente restrita a indivíduos maiores de 18 (dezoito) anos e em pleno gozo de sua capacidade civil. Ao aceitar estes termos, você atesta, sob as penas da lei (art. 299 do Código Penal), sua maioridade.</li>
            <li><strong>Verificação KYC (Know Your Customer):</strong> Em conformidade com a Lei de Prevenção à Lavagem de Dinheiro (Lei 9.613/1998, atualizada), a PREMIA exige o envio de documentos de identificação com foto (RG/CNH) para a liberação de saques. Documentos alterados, rasurados ou de terceiros configurarão fraude, resultando no banimento imediato e bloqueio irreversível do saldo.</li>
            <li><strong>Conta Única e Intransferível:</strong> É permitida apenas 1 (uma) conta por CPF. A tentativa de burlar este limite através de dados de terceiros resultará na perda de quaisquer direitos sobre prêmios ou saldos, sem prejuízo de denúncia às autoridades competentes.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            3. Funcionamento, Probabilidades e Auditabilidade
          </h2>
          <p className="mb-4">
            A PREMIA comercializa produtos e/ou títulos digitais que garantem a participação gratuita em sorteios promocionais e distribuição de prêmios.
          </p>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong>Sorteios:</strong> A apuração dos ganhadores ocorre de maneira totalmente aleatória e criptografada (geração via RNG e Hash Criptográfico validado em Blockchain ou métodos equivalentes), garantindo a imparcialidade dos resultados.</li>
            <li><strong>Ausência de Garantia:</strong> A compra não assegura, em hipótese alguma, a vitória. Trata-se de uma probabilidade matemática diretamente proporcional à quantidade de bilhetes/títulos adquiridos pelo usuário frente ao total de títulos da campanha.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            4. Regras Financeiras: Depósitos, Saques e Estornos
          </h2>
          <div className="space-y-4">
            <p><strong>4.1 Titularidade Obrigatória:</strong> Todos os depósitos e saques (obrigatoriamente via PIX) devem ser efetuados a partir de contas bancárias de mesma titularidade (CPF) da conta cadastrada na PREMIA. Contas em nome de terceiros serão recusadas e o saque será cancelado.</p>
            <p><strong>4.2 PLD (Prevenção à Lavagem de Dinheiro):</strong> Saldos depositados na plataforma só poderão ser sacados após a utilização integral (100% de rollover) para aquisição de campanhas. Não operamos como carteira financeira; o depósito visando apenas "guardar dinheiro" com posterior saque sem consumo violará nossa política de PLD e resultará no bloqueio dos fundos para averiguação.</p>
            <p><strong>4.3 Contestação e Chargeback:</strong> Por tratar-se de produtos digitais de consumo imediato atrelados a sorteios, a contestação de compras (Chargeback) diretamente com administradoras de cartão ou bancos, sem tentativa de resolução prévia com o suporte, será considerada <strong>fraude contra o sistema financeiro</strong>, sujeitando o usuário a sanções legais, civis e criminais, bem como registro negativo nos órgãos de proteção ao crédito.</p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            5. Isenção de Responsabilidades
          </h2>
          <ul className="list-disc pl-6 space-y-3">
            <li>A PREMIA não se responsabiliza por problemas técnicos de operadoras de internet, falhas no PIX provenientes do Banco Central ou interrupções de serviço fora de seu controle.</li>
            <li>As obrigações tributárias, como Declaração de Imposto de Renda (IRPF) sobre os prêmios recebidos, são de <strong>inteira e exclusiva responsabilidade do usuário vencedor</strong>. A plataforma fornecerá os comprovantes de transação para as devidas escriturações contábeis.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            6. Foro de Eleição
          </h2>
          <p className="mb-4">
            Fica eleito o foro da Comarca sede da empresa operadora da PREMIA (indicada nos dados cadastrais oficiais do website), com exclusão de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou litígios oriundos deste termo.
          </p>
        </section>

        {/* Section 7 */}
        <section className="bg-surface-900 rounded-2xl p-6 md:p-8 border border-white/5">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            7. Isenção de Responsabilidade
          </h2>
          <p>
            A PREMIA emprega os melhores esforços para manter a plataforma contínua e segura. No entanto, não nos responsabilizamos por instabilidades técnicas decorrentes de provedores de internet, gateways de pagamento, indisponibilidade temporária de sistemas ou perdas financeiras indiretas.
          </p>
        </section>
        
      </div>
    </div>
  )
}
