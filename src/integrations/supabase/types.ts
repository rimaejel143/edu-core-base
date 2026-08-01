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
      assessments: {
        Row: {
          assessment_date: string
          assessment_type: string | null
          center_id: string
          created_at: string
          created_by: string | null
          feedback: string | null
          id: string
          max_score: number | null
          score: number | null
          student_id: string | null
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_date?: string
          assessment_type?: string | null
          center_id: string
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          id?: string
          max_score?: number | null
          score?: number | null
          student_id?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_date?: string
          assessment_type?: string | null
          center_id?: string
          created_at?: string
          created_by?: string | null
          feedback?: string | null
          id?: string
          max_score?: number | null
          score?: number | null
          student_id?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          center_id: string
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          session_date: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      center_settings: {
        Row: {
          center_id: string
          created_at: string
          currency: string
          id: string
          locale: string
          logo_url: string | null
          preferences: Json
          primary_color: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          preferences?: Json
          primary_color?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          currency?: string
          id?: string
          locale?: string
          logo_url?: string | null
          preferences?: Json
          primary_color?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_settings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: true
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          center_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          center_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          center_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_records: {
        Row: {
          center_id: string
          created_at: string
          created_by: string | null
          details: Json
          id: string
          level: string | null
          record_date: string
          score: number | null
          student_id: string
          subject_id: string | null
          summary: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          created_by?: string | null
          details?: Json
          id?: string
          level?: string | null
          record_date?: string
          score?: number | null
          student_id: string
          subject_id?: string | null
          summary?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          created_by?: string | null
          details?: Json
          id?: string
          level?: string | null
          record_date?: string
          score?: number | null
          student_id?: string
          subject_id?: string | null
          summary?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_records_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          center_id: string
          content: Json
          created_at: string
          file_path: string | null
          generated_by: string | null
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string | null
          student_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          center_id: string
          content?: Json
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string | null
          student_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          center_id?: string
          content?: Json
          created_at?: string
          file_path?: string | null
          generated_by?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string | null
          student_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subjects: {
        Row: {
          center_id: string
          created_at: string
          enrolled_at: string
          id: string
          status: Database["public"]["Enums"]["record_status"]
          student_id: string
          subject_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["record_status"]
          student_id: string
          subject_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          enrolled_at?: string
          id?: string
          status?: Database["public"]["Enums"]["record_status"]
          student_id?: string
          subject_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          center_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          last_name: string
          notes: string | null
          parent_name: string | null
          parent_phone: string | null
          phone: string | null
          registration_date: string
          school: string | null
          school_grade: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_code: string | null
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          registration_date?: string
          school?: string | null
          school_grade?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_code?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          last_name?: string
          notes?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          registration_date?: string
          school?: string | null
          school_grade?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          center_id: string
          code: string | null
          created_at: string
          description: string | null
          id: string
          level: string | null
          name: string
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          center_id: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          name: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          center_id?: string
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          level?: string | null
          name?: string
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          center_id: string
          created_at: string
          email: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hire_date: string
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          center_id: string
          created_at?: string
          email?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          center_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_center: { Args: { _center_id: string }; Returns: boolean }
      current_center_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "center_admin"
      attendance_status: "present" | "absent" | "late" | "excused"
      gender_type: "male" | "female" | "other"
      record_status: "active" | "inactive" | "archived"
      student_status: "active" | "inactive" | "graduated" | "suspended"
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
      app_role: ["super_admin", "center_admin"],
      attendance_status: ["present", "absent", "late", "excused"],
      gender_type: ["male", "female", "other"],
      record_status: ["active", "inactive", "archived"],
      student_status: ["active", "inactive", "graduated", "suspended"],
    },
  },
} as const
