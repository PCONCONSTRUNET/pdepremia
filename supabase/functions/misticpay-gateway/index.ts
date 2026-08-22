import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inicializa o cliente do Supabase usando a chave de serviço (Service Role)
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getMisticPayConfig() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'misticpay_config')
    .single()

  if (error || !data) {
    throw new Error('Configurações da MisticPay não encontradas no banco de dados.')
  }
  
  return data.value as { ci: string, cs: string }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop() // ex: 'test', 'checkout', 'webhook'

    // 1. ROTA DE TESTE (Usada no Painel Admin)
    if (path === 'test' && req.method === 'POST') {
      const { ci: reqCi, cs: reqCs } = await req.json()
      
      // Se não vier na requisição, pega do banco
      let ci = reqCi
      let cs = reqCs
      
      if (!ci || !cs) {
        const config = await getMisticPayConfig()
        ci = config.ci
        cs = config.cs
      }

      const misticRes = await fetch('https://api.misticpay.com/api/users/info', {
        headers: { 'ci': ci, 'cs': cs }
      })

      if (!misticRes.ok) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas ou erro na MisticPay' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const misticData = await misticRes.json()
      return new Response(JSON.stringify({ success: true, data: misticData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. ROTA DE CHECKOUT (Gera o QRCode PIX)
    if (path === 'checkout' && req.method === 'POST') {
      // Autenticação básica do usuário usando o token JWT do header
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('Não autorizado')
      }
      
      // Verifica usuário real (opcional dependendo de como você constrói o frontend, mas recomendado)
      // Para este protótipo vamos aceitar os dados do body se confiarmos na origem.
      const { amount, payerName, payerDocument, description, orderId } = await req.json()

      const config = await getMisticPayConfig()

      const payload = {
        amount: Number(amount),
        payerName: payerName || "Cliente",
        payerDocument: (payerDocument || "00000000000").replace(/\D/g, ''),
        transactionId: orderId || `order_${Date.now()}`,
        description: description || "Pagamento de Bilhetes/Depósito",
        projectWebhook: `${supabaseUrl}/functions/v1/misticpay-gateway/webhook?token=${config.cs}` // Webhook dinâmico com Token Seguro
      }

      const misticRes = await fetch('https://api.misticpay.com/api/transactions/create', {
        method: 'POST',
        headers: {
          'ci': config.ci,
          'cs': config.cs,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const misticData = await misticRes.json()
      
      if (!misticRes.ok || !misticData.data) {
        console.error('Erro MisticPay:', misticData)
        throw new Error(misticData.message || 'Erro ao gerar PIX')
      }

      // Opcional: Atualizar a tabela payments com a intenção (pending)
      // await supabase.from('payments').insert({ order_id: orderId, amount, pix_qrcode: misticData.data.copyPaste, gateway_id: misticData.data.transactionId })

      return new Response(JSON.stringify({ success: true, pix: misticData.data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. ROTA DE WEBHOOK (Recebe notificação da MisticPay)
    if (path === 'webhook' && req.method === 'POST') {
      const config = await getMisticPayConfig()
      const token = url.searchParams.get('token')
      
      if (token !== config.cs) {
        return new Response(JSON.stringify({ error: 'Acesso Negado. Token de webhook inválido.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const payload = await req.json()
      
      console.log('Recebido Webhook MisticPay:', payload)

      // Payload MisticPay: { transactionId, transactionType, status, value, ... }
      if (payload.status === 'COMPLETO' && payload.transactionType === 'DEPOSITO') {
        const orderId = payload.transactionId // Assumindo que enviamos orderId em transactionId
        
        // Chama a RPC SQL para processamento seguro e atômico (evita Race Conditions)
        const { error } = await supabase.rpc('process_payment_webhook', {
          p_order_id: orderId
        })
        
        if (error) {
          console.error('Erro na RPC de Webhook:', error)
          // Mesmo com erro interno, não devolvemos erro pra MisticPay ficar tentando eternamente
          // A menos que queiramos que ela faça retries (re-tentativas) em caso de falha do banco.
          throw new Error('Falha ao processar webhook via RPC')
        }
      }

      // Retorna sucesso rápido para a MisticPay não reenviar
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fallback 404
    return new Response(JSON.stringify({ error: 'Rota não encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Edge Function Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
