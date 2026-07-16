export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_configuration: {
        Row: {
          config_key: string;
          config_value: Json;
          description: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          config_key: string;
          config_value: Json;
          description?: string | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          config_key?: string;
          config_value?: Json;
          description?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cancellations: {
        Row: {
          age_category: string | null;
          age_group: string | null;
          cancellation_date: string | null;
          created_at: string | null;
          created_by: string | null;
          date: string | null;
          id: string;
          month: string;
          name: string;
          name_normalized: string | null;
          notes: string | null;
          reason: string | null;
          source: string | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          age_category?: string | null;
          age_group?: string | null;
          cancellation_date?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          id?: string;
          month: string;
          name: string;
          name_normalized?: string | null;
          notes?: string | null;
          reason?: string | null;
          source?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          age_category?: string | null;
          age_group?: string | null;
          cancellation_date?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          id?: string;
          month?: string;
          name?: string;
          name_normalized?: string | null;
          notes?: string | null;
          reason?: string | null;
          source?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      class_mappings: {
        Row: {
          created_at: string | null;
          id: string;
          system_name: string;
          zenplanner_name: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          system_name: string;
          zenplanner_name: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          system_name?: string;
          zenplanner_name?: string;
        };
        Relationships: [];
      };
      csv_export_formats: {
        Row: {
          column_config: Json;
          created_at: string;
          format_name: string;
          id: string;
          is_default: boolean | null;
          staff_order_config: Json;
          updated_at: string;
        };
        Insert: {
          column_config: Json;
          created_at?: string;
          format_name: string;
          id?: string;
          is_default?: boolean | null;
          staff_order_config: Json;
          updated_at?: string;
        };
        Update: {
          column_config?: Json;
          created_at?: string;
          format_name?: string;
          id?: string;
          is_default?: boolean | null;
          staff_order_config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      dismissed_insights: {
        Row: {
          action: string;
          created_at: string;
          data_hash: string;
          dismissed_at: string;
          id: string;
          insight_id: string;
          snoozed_until: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          data_hash: string;
          dismissed_at?: string;
          id?: string;
          insight_id: string;
          snoozed_until?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          data_hash?: string;
          dismissed_at?: string;
          id?: string;
          insight_id?: string;
          snoozed_until?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      follow_up_notes: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          intro_id: string | null;
          note: string;
          staff_name: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          intro_id?: string | null;
          note: string;
          staff_name?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          intro_id?: string | null;
          note?: string;
          staff_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_up_notes_intro_id_fkey';
            columns: ['intro_id'];
            isOneToOne: false;
            referencedRelation: 'intros';
            referencedColumns: ['id'];
          },
        ];
      };
      follow_ups: {
        Row: {
          class: string | null;
          contact_info: string | null;
          created_at: string | null;
          id: string;
          intro_id: string | null;
          last_contact_date: string | null;
          month: string | null;
          name: string | null;
          next_followup_date: string | null;
          notes: string | null;
          priority: string | null;
          status: string | null;
        };
        Insert: {
          class?: string | null;
          contact_info?: string | null;
          created_at?: string | null;
          id?: string;
          intro_id?: string | null;
          last_contact_date?: string | null;
          month?: string | null;
          name?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          priority?: string | null;
          status?: string | null;
        };
        Update: {
          class?: string | null;
          contact_info?: string | null;
          created_at?: string | null;
          id?: string;
          intro_id?: string | null;
          last_contact_date?: string | null;
          month?: string | null;
          name?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          priority?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'follow_ups_intro_id_fkey';
            columns: ['intro_id'];
            isOneToOne: false;
            referencedRelation: 'intros';
            referencedColumns: ['id'];
          },
        ];
      };
      holds: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          end: string | null;
          fee: string | null;
          hold_status: string | null;
          id: string;
          month: string;
          name: string;
          name_normalized: string | null;
          reason: string | null;
          source: string | null;
          start: string | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          end?: string | null;
          fee?: string | null;
          hold_status?: string | null;
          id?: string;
          month: string;
          name: string;
          name_normalized?: string | null;
          reason?: string | null;
          source?: string | null;
          start?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          end?: string | null;
          fee?: string | null;
          hold_status?: string | null;
          id?: string;
          month?: string;
          name?: string;
          name_normalized?: string | null;
          reason?: string | null;
          source?: string | null;
          start?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      intro_class_history: {
        Row: {
          attended: Database['public']['Enums']['attendance_status'] | null;
          class: string | null;
          created_at: string | null;
          date: number;
          id: string;
          intro_id: string;
          month: string;
          notes: string | null;
          staff: string | null;
          time: string | null;
          updated_at: string | null;
        };
        Insert: {
          attended?: Database['public']['Enums']['attendance_status'] | null;
          class?: string | null;
          created_at?: string | null;
          date: number;
          id?: string;
          intro_id: string;
          month: string;
          notes?: string | null;
          staff?: string | null;
          time?: string | null;
          updated_at?: string | null;
        };
        Update: {
          attended?: Database['public']['Enums']['attendance_status'] | null;
          class?: string | null;
          created_at?: string | null;
          date?: number;
          id?: string;
          intro_id?: string;
          month?: string;
          notes?: string | null;
          staff?: string | null;
          time?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'intro_class_history_intro_id_fkey';
            columns: ['intro_id'];
            isOneToOne: false;
            referencedRelation: 'intros';
            referencedColumns: ['id'];
          },
        ];
      };
      intros: {
        Row: {
          attended: Database['public']['Enums']['attendance_status'] | null;
          class: string | null;
          created_at: string | null;
          created_by: string | null;
          date: string | null;
          email: string | null;
          follow_up_status: string | null;
          followup_1_at: string | null;
          followup_2_at: string | null;
          followup_dismissed_at: string | null;
          followup_reminder_at: string | null;
          id: string;
          last_follow_up: string | null;
          month: string;
          name: string;
          phone: string | null;
          signed_up: Database['public']['Enums']['signup_status'] | null;
          staff: string | null;
          status: Database['public']['Enums']['intro_status'] | null;
          time: string | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          attended?: Database['public']['Enums']['attendance_status'] | null;
          class?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          email?: string | null;
          follow_up_status?: string | null;
          followup_1_at?: string | null;
          followup_2_at?: string | null;
          followup_dismissed_at?: string | null;
          followup_reminder_at?: string | null;
          id?: string;
          last_follow_up?: string | null;
          month: string;
          name: string;
          phone?: string | null;
          signed_up?: Database['public']['Enums']['signup_status'] | null;
          staff?: string | null;
          status?: Database['public']['Enums']['intro_status'] | null;
          time?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          attended?: Database['public']['Enums']['attendance_status'] | null;
          class?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          date?: string | null;
          email?: string | null;
          follow_up_status?: string | null;
          followup_1_at?: string | null;
          followup_2_at?: string | null;
          followup_dismissed_at?: string | null;
          followup_reminder_at?: string | null;
          id?: string;
          last_follow_up?: string | null;
          month?: string;
          name?: string;
          phone?: string | null;
          signed_up?: Database['public']['Enums']['signup_status'] | null;
          staff?: string | null;
          status?: Database['public']['Enums']['intro_status'] | null;
          time?: string | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      members: {
        Row: {
          birth_date: string | null;
          created_at: string;
          email: string | null;
          id: string;
          join_date: string | null;
          last_sync_at: string | null;
          membership_type: string | null;
          name: string;
          name_normalized: string | null;
          phone: string | null;
          status: string | null;
          updated_at: string;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          join_date?: string | null;
          last_sync_at?: string | null;
          membership_type?: string | null;
          name: string;
          name_normalized?: string | null;
          phone?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          join_date?: string | null;
          last_sync_at?: string | null;
          membership_type?: string | null;
          name?: string;
          name_normalized?: string | null;
          phone?: string | null;
          status?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_periods: {
        Row: {
          created_at: string;
          end_date: string;
          id: string;
          is_closed: boolean | null;
          is_current: boolean | null;
          period_label: string;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          id?: string;
          is_closed?: boolean | null;
          is_current?: boolean | null;
          period_label: string;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          id?: string;
          is_closed?: boolean | null;
          is_current?: boolean | null;
          period_label?: string;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          key: string;
          updated_at: string | null;
          value: Json;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string | null;
          value: Json;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string | null;
          value?: Json;
        };
        Relationships: [];
      };
      signups: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          first_payment_date: string | null;
          id: string;
          membership: Database['public']['Enums']['membership_type'];
          membership_date: string | null;
          month: string;
          name: string;
          notes: string | null;
          signup_package: boolean | null;
          updated_at: string | null;
          year: number | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          first_payment_date?: string | null;
          id?: string;
          membership: Database['public']['Enums']['membership_type'];
          membership_date?: string | null;
          month: string;
          name: string;
          notes?: string | null;
          signup_package?: boolean | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          first_payment_date?: string | null;
          id?: string;
          membership?: Database['public']['Enums']['membership_type'];
          membership_date?: string | null;
          month?: string;
          name?: string;
          notes?: string | null;
          signup_package?: boolean | null;
          updated_at?: string | null;
          year?: number | null;
        };
        Relationships: [];
      };
      staff_hours: {
        Row: {
          created_at: string;
          id: string;
          mat_cleaning_count: number | null;
          notes: string | null;
          overtime_hours: number | null;
          period_id: string;
          regular_hours: number | null;
          staff_id: string;
          total_hours: number | null;
          updated_at: string;
          vacation_hours: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mat_cleaning_count?: number | null;
          notes?: string | null;
          overtime_hours?: number | null;
          period_id: string;
          regular_hours?: number | null;
          staff_id: string;
          total_hours?: number | null;
          updated_at?: string;
          vacation_hours?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mat_cleaning_count?: number | null;
          notes?: string | null;
          overtime_hours?: number | null;
          period_id?: string;
          regular_hours?: number | null;
          staff_id?: string;
          total_hours?: number | null;
          updated_at?: string;
          vacation_hours?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'staff_hours_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'payroll_periods';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_hours_period_id_fkey';
            columns: ['period_id'];
            isOneToOne: false;
            referencedRelation: 'staff_hours_summary';
            referencedColumns: ['period_id'];
          },
          {
            foreignKeyName: 'staff_hours_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'department_mappings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'staff_hours_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_hours_summary';
            referencedColumns: ['staff_id'];
          },
          {
            foreignKeyName: 'staff_hours_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_members';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_members: {
        Row: {
          created_at: string;
          employee_id: string;
          full_name: string;
          id: string;
          is_active: boolean | null;
          job_title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          employee_id: string;
          full_name: string;
          id?: string;
          is_active?: boolean | null;
          job_title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          employee_id?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean | null;
          job_title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          created_at: string;
          entry_date: string;
          entry_type: string;
          hours: number;
          id: string;
          is_after_school_program: boolean | null;
          notes: string | null;
          source: string | null;
          staff_hours_id: string | null;
        };
        Insert: {
          created_at?: string;
          entry_date: string;
          entry_type: string;
          hours: number;
          id?: string;
          is_after_school_program?: boolean | null;
          notes?: string | null;
          source?: string | null;
          staff_hours_id?: string | null;
        };
        Update: {
          created_at?: string;
          entry_date?: string;
          entry_type?: string;
          hours?: number;
          id?: string;
          is_after_school_program?: boolean | null;
          notes?: string | null;
          source?: string | null;
          staff_hours_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'time_entries_staff_hours_id_fkey';
            columns: ['staff_hours_id'];
            isOneToOne: false;
            referencedRelation: 'staff_hours';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      department_mappings: {
        Row: {
          department: string | null;
          employee_id: string | null;
          full_name: string | null;
          id: string | null;
          job_id: number | null;
          job_title: string | null;
        };
        Insert: {
          department?: never;
          employee_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          job_id?: never;
          job_title?: string | null;
        };
        Update: {
          department?: never;
          employee_id?: string | null;
          full_name?: string | null;
          id?: string | null;
          job_id?: never;
          job_title?: string | null;
        };
        Relationships: [];
      };
      staff_hours_summary: {
        Row: {
          employee_id: string | null;
          full_name: string | null;
          job_title: string | null;
          overtime_hours: number | null;
          period: string | null;
          period_id: string | null;
          regular_hours: number | null;
          staff_id: string | null;
          total_hours: number | null;
          vacation_hours: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_user_id: { Args: never; Returns: string };
      is_authenticated: { Args: never; Returns: boolean };
      is_owner: { Args: never; Returns: boolean };
      mark_unsigned_intros: { Args: never; Returns: number };
    };
    Enums: {
      attendance_status: 'Yes' | 'No' | '';
      intro_status: 'Active' | 'Cancelled' | 'Completed';
      membership_type: 'Integrity' | 'Legacy' | 'Special' | 'ASP' | 'Flex 10' | 'Flex 20';
      signup_status: 'Yes' | 'No' | '';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attendance_status: ['Yes', 'No', ''],
      intro_status: ['Active', 'Cancelled', 'Completed'],
      membership_type: ['Integrity', 'Legacy', 'Special', 'ASP', 'Flex 10', 'Flex 20'],
      signup_status: ['Yes', 'No', ''],
    },
  },
} as const;
