// src/lib/supabase/types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      intros: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          month: string;
          date: string | null;
          time: string | null;
          class: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          staff: string | null;
          attended: 'Yes' | 'No' | '';
          signed_up: 'Yes' | 'No' | '';
          follow_up_status: string | null;
          last_follow_up: string | null;
          followup_1_at: string | null;
          followup_2_at: string | null;
          created_by: string | null;
          status: 'Active' | 'Cancelled' | 'Completed'; // NEW FIELD
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          date?: string | null;
          time?: string | null;
          class?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          staff?: string | null;
          attended?: 'Yes' | 'No' | '';
          signed_up?: 'Yes' | 'No' | '';
          follow_up_status?: string | null;
          last_follow_up?: string | null;
          followup_1_at?: string | null;
          followup_2_at?: string | null;
          created_by?: string | null;
          status?: 'Active' | 'Cancelled' | 'Completed'; // NEW FIELD
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          date?: string | null;
          time?: string | null;
          class?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          staff?: string | null;
          attended?: 'Yes' | 'No' | '';
          signed_up?: 'Yes' | 'No' | '';
          follow_up_status?: string | null;
          last_follow_up?: string | null;
          followup_1_at?: string | null;
          followup_2_at?: string | null;
          created_by?: string | null;
          status?: 'Active' | 'Cancelled' | 'Completed'; // NEW FIELD
        };
      };
      // NEW TABLE
      intro_class_history: {
        Row: {
          id: string;
          created_at: string;
          intro_id: string;
          month: string;
          date: number;
          time: string | null;
          class: string | null;
          staff: string | null;
          attended: 'Yes' | 'No' | '';
          notes: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          intro_id: string;
          month: string;
          date: number;
          time?: string | null;
          class?: string | null;
          staff?: string | null;
          attended?: 'Yes' | 'No' | '';
          notes?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          intro_id?: string;
          month?: string;
          date?: number;
          time?: string | null;
          class?: string | null;
          staff?: string | null;
          attended?: 'Yes' | 'No' | '';
          notes?: string | null;
        };
      };
      follow_up_notes: {
        Row: {
          id: string;
          created_at: string;
          intro_id: string;
          note: string;
          created_by: string | null;
          staff_name: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          intro_id: string;
          note: string;
          created_by?: string | null;
          staff_name?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          intro_id?: string;
          note?: string;
          created_by?: string | null;
          staff_name?: string | null;
        };
      };
      signups: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          month: string;
          name: string;
          membership: string;
          membership_date: string | null;
          first_payment_date: string | null;
          signup_package: boolean;
          notes: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          name: string;
          membership: string;
          membership_date?: string | null;
          first_payment_date?: string | null;
          signup_package?: boolean;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          name?: string;
          membership?: 'Integrity' | 'Legacy' | 'Special' | 'ASP';
          membership_date?: string | null;
          first_payment_date?: string | null;
          signup_package?: boolean;
          notes?: string | null;
          created_by?: string | null;
        };
      };
      cancellations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          month: string;
          name: string;
          date: string | null;
          reason: string | null;
          age_group: string | null;
          notes: string | null;
          year: number | null;
          created_by: string | null;
          source: 'manual' | 'cron' | null;
          name_normalized: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          name: string;
          date?: string | null;
          reason?: string | null;
          age_group?: string | null;
          notes?: string | null;
          year?: number | null;
          created_by?: string | null;
          source?: 'manual' | 'cron' | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          name?: string;
          date?: string | null;
          reason?: string | null;
          age_group?: string | null;
          notes?: string | null;
          year?: number | null;
          created_by?: string | null;
          source?: 'manual' | 'cron' | null;
        };
      };
      holds: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          month: string;
          name: string;
          start: string | null;
          end: string | null;
          reason: string | null;
          fee: string | null;
          year: number | null;
          created_by: string | null;
          source: 'manual' | 'cron' | null;
          hold_status: string | null;
          name_normalized: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          name: string;
          start?: string | null;
          end?: string | null;
          reason?: string | null;
          fee?: string | null;
          year?: number | null;
          created_by?: string | null;
          source?: 'manual' | 'cron' | null;
          hold_status?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          name?: string;
          start?: string | null;
          end?: string | null;
          reason?: string | null;
          fee?: string | null;
          year?: number | null;
          created_by?: string | null;
          source?: 'manual' | 'cron' | null;
          hold_status?: string | null;
        };
      };
      members: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          name_normalized: string | null;
          birth_date: string | null;
          email: string | null;
          phone: string | null;
          membership_type: string | null;
          status: 'Active' | 'On Hold' | 'Inactive' | null;
          join_date: string | null;
          last_sync_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          birth_date?: string | null;
          email?: string | null;
          phone?: string | null;
          membership_type?: string | null;
          status?: 'Active' | 'On Hold' | 'Inactive' | null;
          join_date?: string | null;
          last_sync_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          birth_date?: string | null;
          email?: string | null;
          phone?: string | null;
          membership_type?: string | null;
          status?: 'Active' | 'On Hold' | 'Inactive' | null;
          join_date?: string | null;
          last_sync_at?: string | null;
        };
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          full_name: string;
          avatar_url: string | null;
          role: 'owner' | 'staff';
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          full_name: string;
          avatar_url?: string | null;
          role?: 'owner' | 'staff';
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: 'owner' | 'staff';
        };
      };
      // PAYROLL TABLES
      staff_members: {
        Row: {
          id: string;
          employee_id: string;
          full_name: string;
          job_title: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          full_name: string;
          job_title: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          full_name?: string;
          job_title?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      payroll_periods: {
        Row: {
          id: string;
          start_date: string;
          end_date: string;
          period_label: string;
          is_current: boolean;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          start_date: string;
          end_date: string;
          period_label: string;
          is_current?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          start_date?: string;
          end_date?: string;
          period_label?: string;
          is_current?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff_hours: {
        Row: {
          id: string;
          staff_id: string;
          period_id: string;
          regular_hours: number;
          overtime_hours: number;
          vacation_hours: number;
          sick_hours: number;
          mat_cleaning_count: number;
          total_hours: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          period_id: string;
          regular_hours?: number;
          overtime_hours?: number;
          vacation_hours?: number;
          sick_hours?: number;
          mat_cleaning_count?: number;
          total_hours?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          staff_id?: string;
          period_id?: string;
          regular_hours?: number;
          overtime_hours?: number;
          vacation_hours?: number;
          sick_hours?: number;
          mat_cleaning_count?: number;
          total_hours?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      time_entries: {
        Row: {
          id: string;
          staff_hours_id: string;
          entry_date: string;
          entry_type: 'regular' | 'overtime' | 'vacation' | 'mat_cleaning' | 'sick';
          hours: number;
          notes: string | null;
          source: 'manual' | 'csv' | 'pdf' | 'quick_import';
          is_after_school_program: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_hours_id: string;
          entry_date: string;
          entry_type: 'regular' | 'overtime' | 'vacation' | 'mat_cleaning' | 'sick';
          hours: number;
          notes?: string | null;
          source?: 'manual' | 'csv' | 'pdf' | 'quick_import';
          is_after_school_program?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          staff_hours_id?: string;
          entry_date?: string;
          entry_type?: 'regular' | 'overtime' | 'vacation' | 'mat_cleaning' | 'sick';
          hours?: number;
          notes?: string | null;
          source?: 'manual' | 'csv' | 'pdf' | 'quick_import';
          is_after_school_program?: boolean;
          created_at?: string;
        };
      };
      app_configuration: {
        Row: {
          id: string;
          config_key: string;
          config_value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          config_key: string;
          config_value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          config_key?: string;
          config_value?: Json;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      attendance_status: 'Yes' | 'No' | '';
      signup_status: 'Yes' | 'No' | '';
      membership_type: string;
      intro_status: 'Active' | 'Cancelled' | 'Completed';
    };
  };
}
