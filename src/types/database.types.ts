export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boxes: {
        Row: {
          campaign_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          quantity_per_order: number
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          quantity_per_order?: number
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          quantity_per_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "boxes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audit_hash: string | null
          audit_hash_generated_at: string | null
          banner_url: string | null
          box_spin_threshold: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          has_boxes: boolean
          has_instant_prizes: boolean
          has_main_draw: boolean
          has_wheel: boolean
          id: string
          is_public: boolean
          max_tickets: number
          max_tickets_per_user: number | null
          name: string
          regulations: string | null
          slug: string
          start_date: string
          status: string
          ticket_price: number
          type: string
          updated_at: string
          wheel_spin_threshold: number | null
        }
        Insert: {
          audit_hash?: string | null
          audit_hash_generated_at?: string | null
          banner_url?: string | null
          box_spin_threshold?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          has_boxes?: boolean
          has_instant_prizes?: boolean
          has_main_draw?: boolean
          has_wheel?: boolean
          id?: string
          is_public?: boolean
          max_tickets?: number
          max_tickets_per_user?: number | null
          name: string
          regulations?: string | null
          slug: string
          start_date: string
          status?: string
          ticket_price?: number
          type?: string
          updated_at?: string
          wheel_spin_threshold?: number | null
        }
        Update: {
          audit_hash?: string | null
          audit_hash_generated_at?: string | null
          banner_url?: string | null
          box_spin_threshold?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          has_boxes?: boolean
          has_instant_prizes?: boolean
          has_main_draw?: boolean
          has_wheel?: boolean
          id?: string
          is_public?: boolean
          max_tickets?: number
          max_tickets_per_user?: number | null
          name?: string
          regulations?: string | null
          slug?: string
          start_date?: string
          status?: string
          ticket_price?: number
          type?: string
          updated_at?: string
          wheel_spin_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          campaign_id: string
          created_at: string
          draw_date: string
          drawn_at: string | null
          external_reference: string | null
          id: string
          method: string
          name: string
          prize_id: string
          result_ticket_number: string | null
          rules_hash: string | null
          status: string
          total_entries: number
          winner_user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          draw_date: string
          drawn_at?: string | null
          external_reference?: string | null
          id?: string
          method?: string
          name: string
          prize_id: string
          result_ticket_number?: string | null
          rules_hash?: string | null
          status?: string
          total_entries?: number
          winner_user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          draw_date?: string
          drawn_at?: string | null
          external_reference?: string | null
          id?: string
          method?: string
          name?: string
          prize_id?: string
          result_ticket_number?: string | null
          rules_hash?: string | null
          status?: string
          total_entries?: number
          winner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draws_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draws_winner_user_id_fkey"
            columns: ["winner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instant_prize_assignments: {
        Row: {
          assigned_at: string
          campaign_id: string
          id: string
          prize_id: string
          revealed_at: string | null
          ticket_id: string | null
          ticket_number: string
        }
        Insert: {
          assigned_at?: string
          campaign_id: string
          id?: string
          prize_id: string
          revealed_at?: string | null
          ticket_id?: string | null
          ticket_number: string
        }
        Update: {
          assigned_at?: string
          campaign_id?: string
          id?: string
          prize_id?: string
          revealed_at?: string | null
          ticket_id?: string | null
          ticket_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "instant_prize_assignments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instant_prize_assignments_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instant_prize_assignments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          box_id: string | null
          campaign_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          payment_method: string
          quantity: number
          status: string
          tickets_generated: boolean
          total_amount: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          quantity: number
          status?: string
          tickets_generated?: boolean
          total_amount: number
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          quantity?: number
          status?: string
          tickets_generated?: boolean
          total_amount?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          gateway_id: string | null
          gateway_payload: Json | null
          id: string
          method: string
          order_id: string
          pix_expiration: string | null
          pix_key: string | null
          pix_qrcode: string | null
          status: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gateway_id?: string | null
          gateway_payload?: Json | null
          id?: string
          method?: string
          order_id: string
          pix_expiration?: string | null
          pix_key?: string | null
          pix_qrcode?: string | null
          status?: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          gateway_id?: string | null
          gateway_payload?: Json | null
          id?: string
          method?: string
          order_id?: string
          pix_expiration?: string | null
          pix_key?: string | null
          pix_qrcode?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_claims: {
        Row: {
          created_at: string
          handled_by: string | null
          id: string
          notes: string | null
          redemption_code: string | null
          status: string
          tracking_code: string | null
          updated_at: string
          winner_id: string
        }
        Insert: {
          created_at?: string
          handled_by?: string | null
          id?: string
          notes?: string | null
          redemption_code?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          winner_id: string
        }
        Update: {
          created_at?: string
          handled_by?: string | null
          id?: string
          notes?: string | null
          redemption_code?: string | null
          status?: string
          tracking_code?: string | null
          updated_at?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_claims_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prize_claims_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: true
            referencedRelation: "winners"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          box_id: string | null
          campaign_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_public: boolean
          name: string
          prize_type: string
          quantity: number
          reference_value: number | null
          remaining: number
          status: string
        }
        Insert: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name: string
          prize_type: string
          quantity?: number
          reference_value?: number | null
          remaining?: number
          status?: string
        }
        Update: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean
          name?: string
          prize_type?: string
          quantity?: number
          reference_value?: number | null
          remaining?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prizes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prizes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance: number
          birth_date: string | null
          cpf: string | null
          cpf_hash: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          kyc_status: string
          kyc_document_url: string | null
          kyc_doc_front_url: string | null
          kyc_doc_back_url: string | null
          kyc_selfie_url: string | null
          kyc_rejection_reason: string | null
          phone: string | null
          rank: string
          rank_level: number
          role: string
          status: string
          updated_at: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          birth_date?: string | null
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          kyc_status?: string
          kyc_document_url?: string | null
          kyc_doc_front_url?: string | null
          kyc_doc_back_url?: string | null
          kyc_selfie_url?: string | null
          kyc_rejection_reason?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          birth_date?: string | null
          cpf?: string | null
          cpf_hash?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          kyc_status?: string
          kyc_document_url?: string | null
          kyc_doc_front_url?: string | null
          kyc_doc_back_url?: string | null
          kyc_selfie_url?: string | null
          kyc_rejection_reason?: string | null
          phone?: string | null
          rank?: string
          rank_level?: number
          role?: string
          status?: string
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          instant_prize_id: string | null
          order_id: string
          revealed_at: string | null
          status: string
          ticket_number: string
          ticket_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          instant_prize_id?: string | null
          order_id: string
          revealed_at?: string | null
          status?: string
          ticket_number: string
          ticket_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          instant_prize_id?: string | null
          order_id?: string
          revealed_at?: string | null
          status?: string
          ticket_number?: string
          ticket_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_instant_prize_id_fkey"
            columns: ["instant_prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_boxes: {
        Row: {
          box_definition_id: string
          campaign_id: string | null
          created_at: string
          id: string
          opened_at: string | null
          order_id: string
          result_prize_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          box_definition_id: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          order_id: string
          result_prize_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          box_definition_id?: string
          campaign_id?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          order_id?: string
          result_prize_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_boxes_box_definition_id_fkey"
            columns: ["box_definition_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_boxes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_boxes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_boxes_result_prize_id_fkey"
            columns: ["result_prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_boxes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wheel_spins: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          order_id: string
          result_item_id: string | null
          result_prize_id: string | null
          spun_at: string | null
          status: string
          user_id: string
          wheel_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          order_id: string
          result_item_id?: string | null
          result_prize_id?: string | null
          spun_at?: string | null
          status?: string
          user_id: string
          wheel_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          order_id?: string
          result_item_id?: string | null
          result_prize_id?: string | null
          spun_at?: string | null
          status?: string
          user_id?: string
          wheel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_wheel_spins_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wheel_spins_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wheel_spins_result_item_id_fkey"
            columns: ["result_item_id"]
            isOneToOne: false
            referencedRelation: "wheel_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wheel_spins_result_prize_id_fkey"
            columns: ["result_prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wheel_spins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wheel_spins_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          gateway_id: string | null
          gateway_payload: Json | null
          id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_id?: string | null
          gateway_payload?: Json | null
          id?: string
          status: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_id?: string | null
          gateway_payload?: Json | null
          id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_items: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          position: number
          prize_id: string | null
          probability: number
          wheel_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
          position: number
          prize_id?: string | null
          probability?: number
          wheel_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          prize_id?: string | null
          probability?: number
          wheel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_items_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wheel_items_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "wheels"
            referencedColumns: ["id"]
          },
        ]
      }
      wheels: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheels_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          box_id: string | null
          campaign_id: string | null
          created_at: string
          display_name: string
          display_ticket: string | null
          id: string
          is_public: boolean
          prize_id: string
          source: string
          ticket_id: string | null
          user_id: string
          won_at: string
        }
        Insert: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          display_name: string
          display_ticket?: string | null
          id?: string
          is_public?: boolean
          prize_id: string
          source: string
          ticket_id?: string | null
          user_id: string
          won_at?: string
        }
        Update: {
          box_id?: string | null
          campaign_id?: string | null
          created_at?: string
          display_name?: string
          display_ticket?: string | null
          id?: string
          is_public?: boolean
          prize_id?: string
          source?: string
          ticket_id?: string | null
          user_id?: string
          won_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "winners_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_boxes_for_order: {
        Args: { order_uuid: string }
        Returns: undefined
      }
      generate_ticket_numbers: {
        Args: { amount: number; campaign_uuid: string }
        Returns: string[]
      }
      generate_tickets_for_order: {
        Args: { order_uuid: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      open_box: { Args: { p_user_box_id: string }; Returns: Json }
      reveal_ticket: { Args: { ticket_uuid: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
