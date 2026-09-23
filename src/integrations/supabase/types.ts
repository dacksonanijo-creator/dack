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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_finance: {
        Row: {
          company_profit: number
          id: string
          owed_to_users: number
          reserve_fund: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          company_profit?: number
          id?: string
          owed_to_users?: number
          reserve_fund?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          company_profit?: number
          id?: string
          owed_to_users?: number
          reserve_fund?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          country: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_apis: {
        Row: {
          active: boolean
          api_key: string | null
          api_url: string | null
          config: Json
          created_at: string
          id: string
          name: string
          notes: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key?: string | null
          api_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string | null
          api_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_providers: {
        Row: {
          active: boolean
          api_key: string | null
          api_secret: string | null
          api_url: string | null
          config: Json
          created_at: string
          currency: string
          id: string
          max_amount: number
          min_amount: number
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json
          created_at?: string
          currency?: string
          id?: string
          max_amount?: number
          min_amount?: number
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          api_key?: string | null
          api_secret?: string | null
          api_url?: string | null
          config?: Json
          created_at?: string
          currency?: string
          id?: string
          max_amount?: number
          min_amount?: number
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_logs: {
        Row: {
          action: string
          created_at: string
          environment: string
          http_status: number | null
          id: string
          provider: string
          request: Json | null
          response: Json | null
          withdrawal_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          environment: string
          http_status?: number | null
          id?: string
          provider: string
          request?: Json | null
          response?: Json | null
          withdrawal_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          environment?: string
          http_status?: number | null
          id?: string
          provider?: string
          request?: Json | null
          response?: Json | null
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_logs_withdrawal_id_fkey"
            columns: ["withdrawal_id"]
            isOneToOne: false
            referencedRelation: "withdrawals"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_branding: {
        Row: {
          id: boolean
          logo_dark_url: string | null
          logo_light_url: string | null
          show_wordmark: boolean
          updated_at: string
        }
        Insert: {
          id?: boolean
          logo_dark_url?: string | null
          logo_light_url?: string | null
          show_wordmark?: boolean
          updated_at?: string
        }
        Update: {
          id?: boolean
          logo_dark_url?: string | null
          logo_light_url?: string | null
          show_wordmark?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_submissions: {
        Row: {
          created_at: string
          id: string
          proof: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["submission_status"]
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          proof?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["submission_status"]
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          deadline: string | null
          description: string
          external_id: string | null
          external_source: string | null
          id: string
          partner_api_id: string | null
          reward: number
          slots: number
          slots_filled: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          partner_api_id?: string | null
          reward?: number
          slots?: number
          slots_filled?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          external_id?: string | null
          external_source?: string | null
          id?: string
          partner_api_id?: string | null
          reward?: number
          slots?: number
          slots_filled?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_partner_api_id_fkey"
            columns: ["partner_api_id"]
            isOneToOne: false
            referencedRelation: "partner_apis"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          reference: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_holder: string
          account_number: string
          amount: number
          attempts: number
          created_at: string
          currency: string
          environment: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          processed_at: string | null
          provider: string | null
          provider_conversation_id: string | null
          provider_id: string | null
          provider_response_code: string | null
          reference: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          amount: number
          attempts?: number
          created_at?: string
          currency?: string
          environment?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          method: string
          notes?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_conversation_id?: string | null
          provider_id?: string | null
          provider_response_code?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          amount?: number
          attempts?: number
          created_at?: string
          currency?: string
          environment?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          method?: string
          notes?: string | null
          processed_at?: string | null
          provider?: string | null
          provider_conversation_id?: string | null
          provider_id?: string | null
          provider_response_code?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      finalize_withdrawal: {
        Args: {
          _conversation_id: string
          _id: string
          _reason: string
          _response_code: string
          _success: boolean
          _transaction_id: string
        }
        Returns: {
          account_holder: string
          account_number: string
          amount: number
          attempts: number
          created_at: string
          currency: string
          environment: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          processed_at: string | null
          provider: string | null
          provider_conversation_id: string | null
          provider_id: string | null
          provider_response_code: string | null
          reference: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      mark_withdrawal_processing: {
        Args: { _environment: string; _id: string }
        Returns: boolean
      }
      request_withdrawal: {
        Args: {
          _account_holder: string
          _account_number: string
          _amount: number
          _idempotency_key: string
          _max_amount: number
          _method: string
          _min_amount: number
        }
        Returns: {
          account_holder: string
          account_number: string
          amount: number
          attempts: number
          created_at: string
          currency: string
          environment: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          method: string
          notes: string | null
          processed_at: string | null
          provider: string | null
          provider_conversation_id: string | null
          provider_id: string | null
          provider_response_code: string | null
          reference: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user" | "company"
      submission_status: "pending" | "approved" | "rejected"
      task_status: "active" | "paused" | "completed"
      transaction_type: "credit" | "debit" | "withdrawal" | "reward" | "fee"
      withdrawal_status:
        | "pending"
        | "approved"
        | "paid"
        | "rejected"
        | "processing"
        | "failed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "company"],
      submission_status: ["pending", "approved", "rejected"],
      task_status: ["active", "paused", "completed"],
      transaction_type: ["credit", "debit", "withdrawal", "reward", "fee"],
      withdrawal_status: [
        "pending",
        "approved",
        "paid",
        "rejected",
        "processing",
        "failed",
      ],
    },
  },
} as const
