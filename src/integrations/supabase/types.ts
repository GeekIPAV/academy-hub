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
      acoes: {
        Row: {
          action_date: string | null
          category: string | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          id: string
          max_capacity: number | null
          notion_id: string | null
          program_id: string | null
          registration_status: string | null
          required_fields: Json | null
          title: string | null
        }
        Insert: {
          action_date?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          max_capacity?: number | null
          notion_id?: string | null
          program_id?: string | null
          registration_status?: string | null
          required_fields?: Json | null
          title?: string | null
        }
        Update: {
          action_date?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          id?: string
          max_capacity?: number | null
          notion_id?: string | null
          program_id?: string | null
          registration_status?: string | null
          required_fields?: Json | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_actions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_actions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      entidades: {
        Row: {
          id: string
          name: string
          status: string | null
        }
        Insert: {
          id: string
          name: string
          status?: string | null
        }
        Update: {
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      entidades_programas: {
        Row: {
          created_at: string | null
          entity_id: string | null
          id: string
          invite_token: string | null
          is_active: boolean | null
          program_id: string | null
          project_notion_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          invite_token?: string | null
          is_active?: boolean | null
          program_id?: string | null
          project_notion_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string | null
          id?: string
          invite_token?: string | null
          is_active?: boolean | null
          program_id?: string | null
          project_notion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_cohorts_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_cohorts_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      inscritos_acoes: {
        Row: {
          action_id: string | null
          additional_data: Json | null
          id: string
          internal_notes: string | null
          invited_at: string | null
          status: string | null
          submitted_at: string | null
          user_id: string | null
          user_observations: string | null
        }
        Insert: {
          action_id?: string | null
          additional_data?: Json | null
          id?: string
          internal_notes?: string | null
          invited_at?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          user_observations?: string | null
        }
        Update: {
          action_id?: string | null
          additional_data?: Json | null
          id?: string
          internal_notes?: string | null
          invited_at?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          user_observations?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      inscritos_programa: {
        Row: {
          cohort_id: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          cohort_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "entidades_programas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      programas: {
        Row: {
          description: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          max_capacity: number | null
          metadata: Json | null
          notion_id: string | null
          required_fields: Json | null
          sync_status: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          max_capacity?: number | null
          metadata?: Json | null
          notion_id?: string | null
          required_fields?: Json | null
          sync_status?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          max_capacity?: number | null
          metadata?: Json | null
          notion_id?: string | null
          required_fields?: Json | null
          sync_status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      recursos: {
        Row: {
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          phase: string
          program_id: string | null
          resource_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          phase: string
          program_id?: string | null
          resource_type: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          phase?: string
          program_id?: string | null
          resource_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_resources_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programas"
            referencedColumns: ["id"]
          },
        ]
      }
      registos_automacao: {
        Row: {
          action_performed: string | null
          created_at: string | null
          details: Json | null
          enrollment_id: string | null
          id: string
        }
        Insert: {
          action_performed?: string | null
          created_at?: string | null
          details?: Json | null
          enrollment_id?: string | null
          id?: string
        }
        Update: {
          action_performed?: string | null
          created_at?: string | null
          details?: Json | null
          enrollment_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "inscritos_acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      registos_sincronizacao: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          notion_id: string | null
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          notion_id?: string | null
          payload?: Json | null
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          notion_id?: string | null
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      utilizadores: {
        Row: {
          address: string | null
          address_cp3: string | null
          address_cp4: string | null
          birth_concelho: string | null
          birth_date: string | null
          created_at: string | null
          data_consent: boolean | null
          education_level: string | null
          first_names: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_doc_expiry: string | null
          id_doc_number: string | null
          id_doc_type: string | null
          job_title: string | null
          last_names: string | null
          nationality_country: string | null
          nif: string | null
          origin_country: string | null
          residence_concelho: string | null
          role: string | null
          work_institution: string | null
        }
        Insert: {
          address?: string | null
          address_cp3?: string | null
          address_cp4?: string | null
          birth_concelho?: string | null
          birth_date?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          education_level?: string | null
          first_names?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          id_doc_expiry?: string | null
          id_doc_number?: string | null
          id_doc_type?: string | null
          job_title?: string | null
          last_names?: string | null
          nationality_country?: string | null
          nif?: string | null
          origin_country?: string | null
          residence_concelho?: string | null
          role?: string | null
          work_institution?: string | null
        }
        Update: {
          address?: string | null
          address_cp3?: string | null
          address_cp4?: string | null
          birth_concelho?: string | null
          birth_date?: string | null
          created_at?: string | null
          data_consent?: boolean | null
          education_level?: string | null
          first_names?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_doc_expiry?: string | null
          id_doc_number?: string | null
          id_doc_type?: string | null
          job_title?: string | null
          last_names?: string | null
          nationality_country?: string | null
          nif?: string | null
          origin_country?: string | null
          residence_concelho?: string | null
          role?: string | null
          work_institution?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      action_stats: {
        Row: {
          action_id: string | null
          confirmed_count: number | null
          waiting_list_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "acoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_next_in_line: { Args: { target_action_id: string }; Returns: string }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
