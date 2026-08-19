import type { Database } from './database.types'

// Shorthand Row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Prize = Database['public']['Tables']['prizes']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Ticket = Database['public']['Tables']['tickets']['Row']
export type Box = Database['public']['Tables']['boxes']['Row']
export type UserBox = Database['public']['Tables']['user_boxes']['Row']
export type Wheel = Database['public']['Tables']['wheels']['Row']
export type WheelItem = Database['public']['Tables']['wheel_items']['Row']
export type UserWheelSpin = Database['public']['Tables']['user_wheel_spins']['Row']
export type Draw = Database['public']['Tables']['draws']['Row']
export type Winner = Database['public']['Tables']['winners']['Row']
export type PrizeClaim = Database['public']['Tables']['prize_claims']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Extended types with joins
export type CampaignWithPrizes = Campaign & {
  prizes: Prize[]
  draws: Draw[]
}

export type OrderWithDetails = Order & {
  campaign: Pick<Campaign, 'id' | 'name' | 'slug' | 'banner_url'>
  payment: Payment | null
}

export type TicketWithCampaign = Ticket & {
  campaign: Pick<Campaign, 'id' | 'name' | 'slug'>
  prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value'> | null
}

export type WinnerWithDetails = Winner & {
  campaign: Pick<Campaign, 'id' | 'name' | 'slug'>
  prize: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value' | 'image_url'>
  prize_claim: PrizeClaim | null
}

export type UserBoxWithDefinition = UserBox & {
  box_definition: Box
  result_prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value' | 'image_url'> | null
}

export type UserSpinWithWheel = UserWheelSpin & {
  wheel: Wheel
  result_item?: WheelItem | null
  result_prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value'> | null
}

// UI state types
export type TicketStatus = Ticket['status']
export type CampaignStatus = Campaign['status']
export type OrderStatus = Order['status']
export type PrizeClaimStatus = PrizeClaim['status']
export type PrizeType = Prize['prize_type']
export type UserRole = Profile['role']

// Reveal result
export interface RevealResult {
  ticket_id: string
  has_prize: boolean
  prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value' | 'image_url'> | null
  winner_id?: string
}

// Box open result
export interface BoxOpenResult {
  user_box_id: string
  has_prize: boolean
  prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value' | 'image_url'> | null
  winner_id?: string
}

// Wheel spin result
export interface WheelSpinResult {
  spin_id: string
  winning_item_id: string
  has_prize: boolean
  prize?: Pick<Prize, 'id' | 'name' | 'prize_type' | 'reference_value' | 'image_url'> | null
  winner_id?: string
}

// Dashboard stats
export interface DashboardStats {
  total_users: number
  total_campaigns: number
  total_orders: number
  paid_orders: number
  total_revenue: number
  total_tickets: number
  prizes_distributed: number
  prizes_remaining: number
  next_draw: Draw | null
}

// Campaign participation package
export interface ParticipationPackage {
  id: string
  label: string
  quantity: number
  boxes: number
  spins: number
  price: number
  highlight?: boolean
  badge?: string
}
