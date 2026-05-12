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
      enrollments: {
        Row: {
          action_id: string | null
          enrolled_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          action_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action_id?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "training_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      notion_entities: {
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
      profiles: {
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
      training_actions: {
        Row: {
          action_date: string | null
          category: string | null
          created_at: string | null
          entity_id: string | null
          id: string
          registration_status: string | null
        }
        Insert: {
          action_date?: string | null
          category?: string | null
          created_at?: string | null
          entity_id?: string | null
          id: string
          registration_status?: string | null
        }
        Update: {
          action_date?: string | null
          category?: string | null
          created_at?: string | null
          entity_id?: string | null
          id?: string
          registration_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_actions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "notion_entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
