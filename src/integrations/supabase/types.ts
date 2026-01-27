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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          lido: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id: string | null
          venda_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          lido?: boolean | null
          mensagem: string
          tipo: string
          titulo: string
          usuario_id?: string | null
          venda_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          lido?: boolean | null
          mensagem?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      comissao_config: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          percentual: number
          tipo: string
          updated_at: string
          valor_referencia: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          percentual: number
          tipo: string
          updated_at?: string
          valor_referencia: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          percentual?: number
          tipo?: string
          updated_at?: string
          valor_referencia?: string
        }
        Relationships: []
      }
      construtoras: {
        Row: {
          ativo: boolean | null
          created_at: string
          drive_url: string | null
          foto_url: string | null
          id: string
          nome: string
          percentual_comissao: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          drive_url?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          percentual_comissao?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          drive_url?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          percentual_comissao?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_historico: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          observacao: string | null
          status_anterior: Database["public"]["Enums"]["lead_status"] | null
          status_novo: Database["public"]["Enums"]["lead_status"]
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo: Database["public"]["Enums"]["lead_status"]
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["lead_status"] | null
          status_novo?: Database["public"]["Enums"]["lead_status"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_origens: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          corretor_id: string | null
          data_criacao: string
          data_ultima_movimentacao: string
          email: string | null
          id: string
          nome: string
          notas: string | null
          origem_id: string | null
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string
        }
        Insert: {
          corretor_id?: string | null
          data_criacao?: string
          data_ultima_movimentacao?: string
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          origem_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone: string
        }
        Update: {
          corretor_id?: string | null
          data_criacao?: string
          data_ultima_movimentacao?: string
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          origem_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "lead_origens"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          meta_qtd_vendas: number | null
          meta_vgv: number | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          meta_qtd_vendas?: number | null
          meta_vgv?: number | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          meta_qtd_vendas?: number | null
          meta_vgv?: number | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string
          email: string
          empresa_id: string | null
          gerente_id: string | null
          id: string
          nivel_corretor: Database["public"]["Enums"]["nivel_corretor"] | null
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          gerente_id?: string | null
          id?: string
          nivel_corretor?: Database["public"]["Enums"]["nivel_corretor"] | null
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          gerente_id?: string | null
          id?: string
          nivel_corretor?: Database["public"]["Enums"]["nivel_corretor"] | null
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gerente_id_fkey"
            columns: ["gerente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          construtora_id: string
          corretor_id: string
          created_at: string
          data_venda: string
          gerente_id: string | null
          id: string
          lead_id: string | null
          observacao: string | null
          status: Database["public"]["Enums"]["venda_status"]
          updated_at: string
          valor_vgv: number
        }
        Insert: {
          construtora_id: string
          corretor_id: string
          created_at?: string
          data_venda?: string
          gerente_id?: string | null
          id?: string
          lead_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          valor_vgv: number
        }
        Update: {
          construtora_id?: string
          corretor_id?: string
          created_at?: string
          data_venda?: string
          gerente_id?: string | null
          id?: string
          lead_id?: string | null
          observacao?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          updated_at?: string
          valor_vgv?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_construtora_id_fkey"
            columns: ["construtora_id"]
            isOneToOne: false
            referencedRelation: "construtoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_gerente_id_fkey"
            columns: ["gerente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _manager_user_id: string; _user_profile_id: string }
        Returns: boolean
      }
    }
    Enums: {
      lead_status:
        | "NOVO"
        | "EM_ATENDIMENTO"
        | "ANALISE_CREDITO"
        | "APROVADO"
        | "REPROVADO"
        | "DISTRATO"
      nivel_corretor: "JUNIOR" | "PLENO" | "SENIOR" | "CLOSER"
      user_role: "DIRETOR" | "GERENTE" | "CORRETOR"
      venda_status: "ATIVA" | "DISTRATO"
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
    Enums: {
      lead_status: [
        "NOVO",
        "EM_ATENDIMENTO",
        "ANALISE_CREDITO",
        "APROVADO",
        "REPROVADO",
        "DISTRATO",
      ],
      nivel_corretor: ["JUNIOR", "PLENO", "SENIOR", "CLOSER"],
      user_role: ["DIRETOR", "GERENTE", "CORRETOR"],
      venda_status: ["ATIVA", "DISTRATO"],
    },
  },
} as const
