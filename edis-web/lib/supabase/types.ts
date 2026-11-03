// ============================================================
// lib/supabase/types.ts — Database type definitions
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      class_settings: {
        Row: {
          id: string;
          class_name: string;
          roster_limit: number;
          default_buffer_min: number;
          worst_case_absence_pct: number;
          secs_per_absent_check: number;
          secs_per_present_reply: number;
          review_deadline_time: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['class_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['class_settings']['Row']>;
      };
      students: {
        Row: {
          id: string;
          reg_no: string;
          reg_no_normalized: string;
          name: string;
          bluetooth_address: string;
          phone_type: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['students']['Insert']>;
      };
      weekly_timetable: {
        Row: {
          id: string;
          weekday: number;
          period_name: string;
          subject: string;
          teacher_name: string;
          start_time: string;
          end_time: string;
          windows: number;
          buffer_min: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['weekly_timetable']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['weekly_timetable']['Insert']>;
      };
      day_changes: {
        Row: {
          id: string;
          date: string;
          timetable_entry_id: string | null;
          action: 'change' | 'cancel' | 'add';
          new_start: string | null;
          new_end: string | null;
          new_windows: number | null;
          new_buffer_min: number | null;
          reason: string;
          made_by: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['day_changes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['day_changes']['Insert']>;
      };
      period_runs: {
        Row: {
          id: string;
          date: string;
          timetable_entry_id: string | null;
          name: string;
          subject: string;
          start_at: string;
          end_at: string;
          windows: number;
          buffer_min: number;
          roster_size: number;
          saved_settings: Json;
          planner_status: 'safe' | 'overridden';
          status: 'scheduled' | 'running' | 'finished' | 'cancelled' | 'did_not_run';
          locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['period_runs']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['period_runs']['Insert']>;
      };
      windows: {
        Row: {
          id: string;
          period_run_id: string;
          number: number;
          scheduled_start: string;
          hard_stop: string;
          started_at: string | null;
          finished_at: string | null;
          status: 'completed' | 'partial' | 'did_not_run';
          reason: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['windows']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['windows']['Insert']>;
      };
      detections: {
        Row: {
          id: string;
          window_id: string;
          student_id: string;
          check_number: number;
          present: boolean;
          response_ms: number | null;
          phone_name: string | null;
          raw_json: Json | null;
          checked_at: string;
        };
        Insert: Omit<Database['public']['Tables']['detections']['Row'], 'id'>;
        Update: never; // append-only
      };
      window_results: {
        Row: {
          id: string;
          window_id: string;
          student_id: string;
          present: boolean | null;
          checks_used: number | null;
          not_checked: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['window_results']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['window_results']['Insert']>;
      };
      attendance_results: {
        Row: {
          id: string;
          period_run_id: string;
          student_id: string;
          windows_ran: number;
          windows_present: number;
          color: 'green' | 'yellow' | 'orange' | 'red' | 'grey';
          admin_override: boolean;
          override_reason: string | null;
          final_status: 'present' | 'absent' | 'pending' | 'cancelled' | 'not_recorded';
          reviewed: boolean;
          locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_results']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['attendance_results']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          at: string;
          actor: string;
          entity: string;
          entity_id: string | null;
          field: string | null;
          old_value: string | null;
          new_value: string | null;
          reason: string | null;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'at'>;
        Update: never;
      };
      problem_reports: {
        Row: {
          id: string;
          student_id: string;
          period_run_id: string;
          message: string;
          status: 'open' | 'resolved';
          resolved_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['problem_reports']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['problem_reports']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
