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
          action_type: string | null
          avaliacao_impacto: number | null
          avaliacao_impacto_link: string | null
          avaliacao_satisfacao: number | null
          avaliacao_satisfacao_link: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          entity_id: string | null
          fotos_link: string | null
          id: string
          max_capacity: number | null
          notion_id: string | null
          program_id: string | null
          registration_status: string | null
          required_fields: Json | null
          start_date: string | null
          status: string
          title: string | null
          tshirt_tracking_link: string | null
          tshirt_value: number | null
        }
        Insert: {
          action_date?: string | null
          action_type?: string | null
          avaliacao_impacto?: number | null
          avaliacao_impacto_link?: string | null
          avaliacao_satisfacao?: number | null
          avaliacao_satisfacao_link?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entity_id?: string | null
          fotos_link?: string | null
          id?: string
          max_capacity?: number | null
          notion_id?: string | null
          program_id?: string | null
          registration_status?: string | null
          required_fields?: Json | null
          start_date?: string | null
          status?: string
          title?: string | null
          tshirt_tracking_link?: string | null
          tshirt_value?: number | null
        }
        Update: {
          action_date?: string | null
          action_type?: string | null
          avaliacao_impacto?: number | null
          avaliacao_impacto_link?: string | null
          avaliacao_satisfacao?: number | null
          avaliacao_satisfacao_link?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entity_id?: string | null
          fotos_link?: string | null
          id?: string
          max_capacity?: number | null
          notion_id?: string | null
          program_id?: string | null
          registration_status?: string | null
          required_fields?: Json | null
          start_date?: string | null
          status?: string
          title?: string | null
          tshirt_tracking_link?: string | null
          tshirt_value?: number | null
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
      articles: {
        Row: {
          abstract_en: string
          abstract_pt: string
          affiliations: string[]
          authors: string[]
          conclusion_en: string
          conclusion_pt: string
          created_at: string
          id: number
          impact_area_en: string
          impact_area_pt: string
          instruments_en: string[]
          instruments_pt: string[]
          issue: number
          key_findings_en: string[]
          key_findings_pt: string[]
          language: string
          limitations_en: string
          limitations_pt: string
          main_results_en: string
          main_results_pt: string
          methodology_detail_en: string
          methodology_detail_pt: string
          methodology_en: string
          methodology_pt: string
          objectives_en: string[]
          objectives_pt: string[]
          pages: string
          recommendations_en: string
          recommendations_pt: string
          references: string[]
          result_type: string
          sample_detail_en: string
          sample_detail_pt: string
          sample_type_en: string
          sample_type_pt: string
          subtitle_en: string
          subtitle_pt: string
          tags_en: string[]
          tags_pt: string[]
          title_en: string
          title_pt: string
          updated_at: string
          year: number
        }
        Insert: {
          abstract_en?: string
          abstract_pt?: string
          affiliations?: string[]
          authors?: string[]
          conclusion_en?: string
          conclusion_pt?: string
          created_at?: string
          id: number
          impact_area_en?: string
          impact_area_pt?: string
          instruments_en?: string[]
          instruments_pt?: string[]
          issue: number
          key_findings_en?: string[]
          key_findings_pt?: string[]
          language: string
          limitations_en?: string
          limitations_pt?: string
          main_results_en?: string
          main_results_pt?: string
          methodology_detail_en?: string
          methodology_detail_pt?: string
          methodology_en?: string
          methodology_pt?: string
          objectives_en?: string[]
          objectives_pt?: string[]
          pages?: string
          recommendations_en?: string
          recommendations_pt?: string
          references?: string[]
          result_type: string
          sample_detail_en?: string
          sample_detail_pt?: string
          sample_type_en?: string
          sample_type_pt?: string
          subtitle_en?: string
          subtitle_pt?: string
          tags_en?: string[]
          tags_pt?: string[]
          title_en?: string
          title_pt?: string
          updated_at?: string
          year: number
        }
        Update: {
          abstract_en?: string
          abstract_pt?: string
          affiliations?: string[]
          authors?: string[]
          conclusion_en?: string
          conclusion_pt?: string
          created_at?: string
          id?: number
          impact_area_en?: string
          impact_area_pt?: string
          instruments_en?: string[]
          instruments_pt?: string[]
          issue?: number
          key_findings_en?: string[]
          key_findings_pt?: string[]
          language?: string
          limitations_en?: string
          limitations_pt?: string
          main_results_en?: string
          main_results_pt?: string
          methodology_detail_en?: string
          methodology_detail_pt?: string
          methodology_en?: string
          methodology_pt?: string
          objectives_en?: string[]
          objectives_pt?: string[]
          pages?: string
          recommendations_en?: string
          recommendations_pt?: string
          references?: string[]
          result_type?: string
          sample_detail_en?: string
          sample_detail_pt?: string
          sample_type_en?: string
          sample_type_pt?: string
          subtitle_en?: string
          subtitle_pt?: string
          tags_en?: string[]
          tags_pt?: string[]
          title_en?: string
          title_pt?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      badges: {
        Row: {
          cluster_id: string
          cover_position: string
          cover_scale: number
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          title: string
          validity_fixed_date: string | null
          validity_type: string
          validity_years: number | null
        }
        Insert: {
          cluster_id: string
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          validity_fixed_date?: string | null
          validity_type?: string
          validity_years?: number | null
        }
        Update: {
          cluster_id?: string
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          validity_fixed_date?: string | null
          validity_type?: string
          validity_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "badges_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_covers: {
        Row: {
          cluster_name: string
          cover_position: string
          cover_scale: number
          cover_url: string | null
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cluster_name: string
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cluster_name?: string
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      clusters: {
        Row: {
          cover_position: string
          cover_scale: number
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_privacidade_campos: {
        Row: {
          classification: string
          column_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          classification: string
          column_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          classification?: string
          column_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      convite_utilizacoes: {
        Row: {
          invite_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          invite_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          invite_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "convite_utilizacoes_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "convites"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          max_uses: number | null
          roles: string[]
          token: string
          uses_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          roles: string[]
          token?: string
          uses_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          max_uses?: number | null
          roles?: string[]
          token?: string
          uses_count?: number
        }
        Relationships: []
      }
      entidades: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          id: string
          locality: string | null
          name: string
          postal_code: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          id: string
          locality?: string | null
          name: string
          postal_code?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          id?: string
          locality?: string | null
          name?: string
          postal_code?: string | null
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
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      formadores_acoes: {
        Row: {
          action_id: string
          certificate_sent: boolean
          certificate_sent_at: string | null
          certificate_url: string | null
          created_at: string
          id: string
          status: string
          tshirt_size: string | null
          user_id: string
        }
        Insert: {
          action_id: string
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          created_at?: string
          id?: string
          status?: string
          tshirt_size?: string | null
          user_id: string
        }
        Update: {
          action_id?: string
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          created_at?: string
          id?: string
          status?: string
          tshirt_size?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formadores_acoes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      inscritos_acoes: {
        Row: {
          action_id: string | null
          additional_data: Json | null
          certificate_sent: boolean
          certificate_sent_at: string | null
          certificate_url: string | null
          id: string
          internal_notes: string | null
          invited_at: string | null
          status: string | null
          submitted_at: string | null
          tshirt_size: string | null
          user_id: string | null
          user_observations: string | null
        }
        Insert: {
          action_id?: string | null
          additional_data?: Json | null
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          id?: string
          internal_notes?: string | null
          invited_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tshirt_size?: string | null
          user_id?: string | null
          user_observations?: string | null
        }
        Update: {
          action_id?: string | null
          additional_data?: Json | null
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          id?: string
          internal_notes?: string | null
          invited_at?: string | null
          status?: string | null
          submitted_at?: string | null
          tshirt_size?: string | null
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
      issues_meta: {
        Row: {
          issn: string
          issue: number
          pages: number
          total_articles: number
          year: number
        }
        Insert: {
          issn: string
          issue: number
          pages: number
          total_articles: number
          year: number
        }
        Update: {
          issn?: string
          issue?: number
          pages?: number
          total_articles?: number
          year?: number
        }
        Relationships: []
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
      paginas_conteudo: {
        Row: {
          content: Json
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: Json
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: Json
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      participantes_acoes: {
        Row: {
          action_id: string
          attendance_confirmed: boolean
          certificate_sent: boolean
          certificate_sent_at: string | null
          certificate_url: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          tshirt_size: string
        }
        Insert: {
          action_id: string
          attendance_confirmed?: boolean
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          tshirt_size: string
        }
        Update: {
          action_id?: string
          attendance_confirmed?: boolean
          certificate_sent?: boolean
          certificate_sent_at?: string | null
          certificate_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          tshirt_size?: string
        }
        Relationships: [
          {
            foreignKeyName: "participantes_acoes_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "acoes"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_roles: {
        Row: {
          created_at: string
          id: string
          resource_id: string
          role_name: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          resource_id: string
          role_name: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          resource_id?: string
          role_name?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_roles_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
      }
      plano_sessao_blocos: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          materials: string | null
          recurso_ids: string[]
          schedule: string | null
          sort_order: number
          tema_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          materials?: string | null
          recurso_ids?: string[]
          schedule?: string | null
          sort_order?: number
          tema_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          materials?: string | null
          recurso_ids?: string[]
          schedule?: string | null
          sort_order?: number
          tema_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_sessao_blocos_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas_momentos"
            referencedColumns: ["id"]
          },
        ]
      }
      programas: {
        Row: {
          cluster: string | null
          cluster_id: string | null
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
          cluster?: string | null
          cluster_id?: string | null
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
          cluster?: string | null
          cluster_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "programas_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos: {
        Row: {
          category_key: string | null
          cluster_id: string | null
          cover_position: string
          cover_scale: number
          cover_url: string | null
          created_at: string | null
          description: string | null
          file_url: string
          id: string
          objectives: string | null
          phase: string | null
          program_id: string | null
          resource_type: string
          title: string
        }
        Insert: {
          category_key?: string | null
          cluster_id?: string | null
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          file_url: string
          id?: string
          objectives?: string | null
          phase?: string | null
          program_id?: string | null
          resource_type: string
          title: string
        }
        Update: {
          category_key?: string | null
          cluster_id?: string | null
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string
          id?: string
          objectives?: string | null
          phase?: string | null
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
          {
            foreignKeyName: "recursos_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
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
      resource_categories: {
        Row: {
          color: string
          created_at: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      resource_types: {
        Row: {
          color: string
          created_at: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          color?: string
          created_at?: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          color?: string
          created_at?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tema_recursos: {
        Row: {
          created_at: string
          recurso_id: string
          sort_order: number
          tema_id: string
        }
        Insert: {
          created_at?: string
          recurso_id: string
          sort_order?: number
          tema_id: string
        }
        Update: {
          created_at?: string
          recurso_id?: string
          sort_order?: number
          tema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tema_recursos_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tema_recursos_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas_momentos"
            referencedColumns: ["id"]
          },
        ]
      }
      temas_momentos: {
        Row: {
          bloco: string | null
          bloco_order: number
          cluster: string
          cluster_id: string | null
          context: string | null
          cover_position: string
          cover_scale: number
          cover_url: string | null
          created_at: string
          description: string | null
          hidden_sections: string[]
          id: string
          intro: string | null
          objectives: string | null
          order_index: number
          processo_u: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bloco?: string | null
          bloco_order?: number
          cluster: string
          cluster_id?: string | null
          context?: string | null
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hidden_sections?: string[]
          id?: string
          intro?: string | null
          objectives?: string | null
          order_index?: number
          processo_u?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bloco?: string | null
          bloco_order?: number
          cluster?: string
          cluster_id?: string | null
          context?: string | null
          cover_position?: string
          cover_scale?: number
          cover_url?: string | null
          created_at?: string
          description?: string | null
          hidden_sections?: string[]
          id?: string
          intro?: string | null
          objectives?: string | null
          order_index?: number
          processo_u?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temas_momentos_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "utilizadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "utilizadores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          role_name: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          role_name: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          role_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_name_fkey"
            columns: ["role_name"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "utilizadores"
            referencedColumns: ["id"]
          },
        ]
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
          email: string | null
          entity_id: string | null
          first_names: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_doc_expiry: string | null
          id_doc_number: string | null
          id_doc_type: string | null
          is_active: boolean
          job_title: string | null
          last_names: string | null
          nationality_country: string | null
          nif: string | null
          origin_country: string | null
          passport_num: string | null
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
          email?: string | null
          entity_id?: string | null
          first_names?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          id_doc_expiry?: string | null
          id_doc_number?: string | null
          id_doc_type?: string | null
          is_active?: boolean
          job_title?: string | null
          last_names?: string | null
          nationality_country?: string | null
          nif?: string | null
          origin_country?: string | null
          passport_num?: string | null
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
          email?: string | null
          entity_id?: string | null
          first_names?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_doc_expiry?: string | null
          id_doc_number?: string | null
          id_doc_type?: string | null
          is_active?: boolean
          job_title?: string | null
          last_names?: string | null
          nationality_country?: string | null
          nif?: string | null
          origin_country?: string | null
          passport_num?: string | null
          residence_concelho?: string | null
          role?: string | null
          work_institution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utilizadores_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilizadores_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
        ]
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
      anonimizar_utilizador: { Args: { _user_id: string }; Returns: number }
      apply_invite_to_user: {
        Args: { _assigned_by?: string; _invite_token: string; _user_id: string }
        Returns: boolean
      }
      get_next_in_line: { Args: { target_action_id: string }; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      list_utilizadores_columns: {
        Args: never
        Returns: {
          column_name: string
          data_type: string
        }[]
      }
      user_can_access_cluster: {
        Args: { _cluster_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_recurso: {
        Args: { _recurso_id: string; _user_id: string }
        Returns: boolean
      }
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
