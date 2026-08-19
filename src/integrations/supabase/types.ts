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
      accounts: {
        Row: {
          balance: number
          branch_id: string | null
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["account_type"]
        }
        Insert: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          name: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Update: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["account_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          location: string | null
          name: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_note: string | null
          address: string | null
          branch_id: string | null
          client_name: string | null
          contact_email: string | null
          cr_number: string | null
          created_at: string
          created_by: string | null
          currency: string
          deal_updated_at: string | null
          deal_updated_by: string | null
          discount: number
          discount_updated_at: string | null
          discount_updated_by: string | null
          emergency: boolean
          id: string
          legacy_id: number | null
          name: string
          note: string | null
          package_id: string | null
          passport_iqama: string | null
          phone: string | null
          slug: string | null
          status: string
          take_action: boolean
          total_deal: number | null
          type: Database["public"]["Enums"]["company_type"]
          update_by: string | null
          updated_at: string
          vat: string | null
          whatsapp: string | null
        }
        Insert: {
          account_note?: string | null
          address?: string | null
          branch_id?: string | null
          client_name?: string | null
          contact_email?: string | null
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_updated_at?: string | null
          deal_updated_by?: string | null
          discount?: number
          discount_updated_at?: string | null
          discount_updated_by?: string | null
          emergency?: boolean
          id?: string
          legacy_id?: number | null
          name: string
          note?: string | null
          package_id?: string | null
          passport_iqama?: string | null
          phone?: string | null
          slug?: string | null
          status?: string
          take_action?: boolean
          total_deal?: number | null
          type?: Database["public"]["Enums"]["company_type"]
          update_by?: string | null
          updated_at?: string
          vat?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_note?: string | null
          address?: string | null
          branch_id?: string | null
          client_name?: string | null
          contact_email?: string | null
          cr_number?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deal_updated_at?: string | null
          deal_updated_by?: string | null
          discount?: number
          discount_updated_at?: string | null
          discount_updated_by?: string | null
          emergency?: boolean
          id?: string
          legacy_id?: number | null
          name?: string
          note?: string | null
          package_id?: string | null
          passport_iqama?: string | null
          phone?: string | null
          slug?: string | null
          status?: string
          take_action?: boolean
          total_deal?: number | null
          type?: Database["public"]["Enums"]["company_type"]
          update_by?: string | null
          updated_at?: string
          vat?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      company_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          folder: string | null
          id: string
          mime_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          folder?: string | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          folder?: string | null
          id?: string
          mime_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          expense_date: string | null
          id: string
          note: string | null
          payment_method: string
          purpose: string
          updated_at: string
          updated_by: string | null
          voucher_no: number
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          note?: string | null
          payment_method?: string
          purpose: string
          updated_at?: string
          updated_by?: string | null
          voucher_no?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          note?: string | null
          payment_method?: string
          purpose?: string
          updated_at?: string
          updated_by?: string | null
          voucher_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_extra_deals: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          note: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          note: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_extra_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_extra_expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_extra_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_installments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_no: number
          note: string | null
          payment_date: string | null
          payment_method: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: number
          note?: string | null
          payment_date?: string | null
          payment_method?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_no?: number
          note?: string | null
          payment_date?: string | null
          payment_method?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_installments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_managers: {
        Row: {
          birthdate: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          iqama: string | null
          manager_type: string
          name: string
          phone: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          birthdate?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          iqama?: string | null
          manager_type?: string
          name: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          birthdate?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          iqama?: string | null
          manager_type?: string
          name?: string
          phone?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      company_shareholders: {
        Row: {
          arabic_name: string | null
          birthdate: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          iqama: string | null
          name: string
          nid: string | null
          passport: string | null
          phone: string | null
          share_percent: number | null
          shareholder_type: string
          updated_by: string | null
        }
        Insert: {
          arabic_name?: string | null
          birthdate?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          iqama?: string | null
          name: string
          nid?: string | null
          passport?: string | null
          phone?: string | null
          share_percent?: number | null
          shareholder_type?: string
          updated_by?: string | null
        }
        Update: {
          arabic_name?: string | null
          birthdate?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          iqama?: string | null
          name?: string
          nid?: string | null
          passport?: string | null
          phone?: string | null
          share_percent?: number | null
          shareholder_type?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_shareholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_steps: {
        Row: {
          company_id: string
          created_at: string
          cred_notes: string | null
          cred_pass: string | null
          cred_user: string | null
          id: string
          note: string | null
          password: string | null
          status: string
          step_key: string
          subtasks_done: string[]
          update_status_by: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          cred_notes?: string | null
          cred_pass?: string | null
          cred_user?: string | null
          id?: string
          note?: string | null
          password?: string | null
          status?: string
          step_key: string
          subtasks_done?: string[]
          update_status_by?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          cred_notes?: string | null
          cred_pass?: string | null
          cred_user?: string | null
          id?: string
          note?: string | null
          password?: string | null
          status?: string
          step_key?: string
          subtasks_done?: string[]
          update_status_by?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_steps_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cr_activities: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          label: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          label: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          label?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cr_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      pending_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accounts_access: boolean
          branch_id: string | null
          created_at: string
          email: string | null
          expenses_access: boolean
          id: string
          username: string
        }
        Insert: {
          accounts_access?: boolean
          branch_id?: string | null
          created_at?: string
          email?: string | null
          expenses_access?: boolean
          id: string
          username: string
        }
        Update: {
          accounts_access?: boolean
          branch_id?: string | null
          created_at?: string
          email?: string | null
          expenses_access?: boolean
          id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allowed_statuses: string[]
          created_at: string
          followup_messages: string[]
          has_creds: boolean
          id: string
          key: string
          label: string
          sort_order: number
          subtasks: string[]
          tags: string[]
          updated_at: string
        }
        Insert: {
          allowed_statuses?: string[]
          created_at?: string
          followup_messages?: string[]
          has_creds?: boolean
          id?: string
          key: string
          label: string
          sort_order?: number
          subtasks?: string[]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          allowed_statuses?: string[]
          created_at?: string
          followup_messages?: string[]
          has_creds?: boolean
          id?: string
          key?: string
          label?: string
          sort_order?: number
          subtasks?: string[]
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      todo_task_services: {
        Row: {
          created_at: string
          id: string
          service_key: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_key: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_key?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_task_services_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "todo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      todo_tasks: {
        Row: {
          admin_note: string | null
          assigned_to: string
          company_id: string
          created_at: string
          created_by: string
          creator_role: string
          deadline: string | null
          editor_note: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          assigned_to: string
          company_id: string
          created_at?: string
          created_by: string
          creator_role: string
          deadline?: string | null
          editor_note?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          assigned_to?: string
          company_id?: string
          created_at?: string
          created_by?: string
          creator_role?: string
          deadline?: string | null
          editor_note?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "todo_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      user_service_assignments: {
        Row: {
          created_at: string
          id: string
          service_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          service_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          service_key?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_expenses_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "enterpaner" | "trading" | "services"
      app_role: "admin" | "editor" | "viewer" | "sub_admin"
      company_type:
        | "entrepreneur"
        | "trading"
        | "services"
        | "industrial_license"
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
      account_type: ["enterpaner", "trading", "services"],
      app_role: ["admin", "editor", "viewer", "sub_admin"],
      company_type: [
        "entrepreneur",
        "trading",
        "services",
        "industrial_license",
      ],
    },
  },
} as const
