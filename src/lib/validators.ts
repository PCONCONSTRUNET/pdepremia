import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

import { validateCPF, calculateAge } from './utils'

export const registerSchema = z
  .object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string()
      .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'Formato de CPF inválido')
      .refine((val) => validateCPF(val), { message: 'CPF inválido (matematicamente incorreto)' }),
    phone: z.string().regex(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/, 'Telefone inválido'),
    birth_date: z.string()
      .min(1, 'Data de nascimento é obrigatória')
      .refine((val) => {
        const age = calculateAge(val)
        return age >= 18
      }, { message: 'Você precisa ter pelo menos 18 anos para se cadastrar.' }),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    terms: z.boolean().refine((val) => val === true, {
      message: 'Você precisa concordar com os Termos de Uso.',
    }),
  })


// ─── Campaign ────────────────────────────────────────────────────────────────

export const campaignSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  slug: z.string().min(3, 'Slug deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  regulations: z.string().optional(),
  start_date: z.string().min(1, 'Data de início obrigatória'),
  end_date: z.string().min(1, 'Data de encerramento obrigatória'),
  ticket_price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  max_tickets: z.number().min(1, 'Quantidade mínima de 1 bilhete'),
  max_tickets_per_user: z.number().min(1).optional(),
  has_instant_prizes: z.boolean().default(false),
  has_boxes: z.boolean().default(false),
  box_spin_threshold: z.number().nullable().optional(),
  has_wheel: z.boolean().default(false),
  wheel_spin_threshold: z.number().nullable().optional(),
  has_main_draw: z.boolean().default(false),
  is_public: z.boolean().default(false),
})

// ─── Prize ───────────────────────────────────────────────────────────────────

export const prizeSchema = z.object({
  name: z.string().min(2, 'Nome do prêmio obrigatório'),
  description: z.string().optional(),
  prize_type: z.enum(['instant', 'draw', 'box', 'wheel', 'coupon', 'product', 'benefit']),
  quantity: z.number().min(1, 'Quantidade mínima de 1'),
  reference_value: z.number().min(0).optional(),
  is_public: z.boolean().default(true),
})

// ─── Order ───────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  campaign_id: z.string().uuid(),
  quantity: z.number().min(1),
  package_id: z.string().uuid().optional(),
})

// ─── Types (inferred) ────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CampaignInput = z.infer<typeof campaignSchema>
export type PrizeInput = z.infer<typeof prizeSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
