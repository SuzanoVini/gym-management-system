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
          date: number;
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
          created_by: string | null;
          status: 'Active' | 'Cancelled' | 'Completed'; // NEW FIELD
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          date: number;
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
          created_by?: string | null;
          status?: 'Active' | 'Cancelled' | 'Completed'; // NEW FIELD
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          date?: number;
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
          membership: 'Integrity' | 'Legacy' | 'Special' | 'ASP';
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
          membership: 'Integrity' | 'Legacy' | 'Special' | 'ASP';
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
          cancellation_date: string | null;
          reason: string | null;
          age_category: string | null;
          notes: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          name: string;
          cancellation_date?: string | null;
          reason?: string | null;
          age_category?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          name?: string;
          cancellation_date?: string | null;
          reason?: string | null;
          age_category?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
      };
      holds: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          month: string;
          name: string;
          start_date: string | null;
          end_date: string | null;
          reason: string | null;
          fee: string | null;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month: string;
          name: string;
          start_date?: string | null;
          end_date?: string | null;
          reason?: string | null;
          fee?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          month?: string;
          name?: string;
          start_date?: string | null;
          end_date?: string | null;
          reason?: string | null;
          fee?: string | null;
          created_by?: string | null;
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
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          full_name: string;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          full_name?: string;
          avatar_url?: string | null;
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
      membership_type: 'Integrity' | 'Legacy' | 'Special' | 'ASP';
      intro_status: 'Active' | 'Cancelled' | 'Completed';
    };
  };
}
