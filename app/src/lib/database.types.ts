w// Hand-written to match supabase/migrations/*.sql.
// Once the project is linked, regenerate with:
//   npx supabase gen types typescript --linked > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ActivityType = 'puzzle' | 'question' | 'rhythm';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type AccessRole = 'owner' | 'caregiver';
export type GameType = 'memory' | 'brain_exercise' | 'puzzle' | 'rhythm';

export interface Database {
  public: {
    Tables: {
      caregivers: {
        Row: {
          id: string;
          display_name: string;
          pin_hash: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          pin_hash?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          display_name?: string;
          pin_hash?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          avatar_url?: string | null;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      patient_caregiver_access: {
        Row: {
          patient_id: string;
          caregiver_id: string;
          role: AccessRole;
          created_at: string;
        };
        Insert: {
          patient_id: string;
          caregiver_id: string;
          role?: AccessRole;
        };
        Update: {
          role?: AccessRole;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          patient_id: string;
          activity_type: ActivityType;
          title: string;
          description: string | null;
          difficulty: Difficulty | null;
          enabled: boolean;
          schedule: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          activity_type: ActivityType;
          title: string;
          description?: string | null;
          difficulty?: Difficulty | null;
          enabled?: boolean;
          schedule?: Json | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          difficulty?: Difficulty | null;
          enabled?: boolean;
          schedule?: Json | null;
        };
        Relationships: [];
      };
      puzzle_content: {
        Row: {
          activity_id: string;
          image_url: string;
          piece_count: 4 | 6 | 9;
        };
        Insert: {
          activity_id: string;
          image_url: string;
          piece_count?: 4 | 6 | 9;
        };
        Update: {
          image_url?: string;
          piece_count?: 4 | 6 | 9;
        };
        Relationships: [];
      };
      question_content: {
        Row: {
          activity_id: string;
          image_url: string;
          prompt: string;
          choices: Json;
          correct_choice_index: number;
          explanation: string | null;
        };
        Insert: {
          activity_id: string;
          image_url: string;
          prompt: string;
          choices: Json;
          correct_choice_index: number;
          explanation?: string | null;
        };
        Update: {
          image_url?: string;
          prompt?: string;
          choices?: Json;
          correct_choice_index?: number;
          explanation?: string | null;
        };
        Relationships: [];
      };
      rhythm_content: {
        Row: {
          activity_id: string;
          audio_url: string;
          tempo_bpm: number | null;
        };
        Insert: {
          activity_id: string;
          audio_url: string;
          tempo_bpm?: number | null;
        };
        Update: {
          audio_url?: string;
          tempo_bpm?: number | null;
        };
        Relationships: [];
      };
      routine_items: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          icon: string | null;
          scheduled_time: string | null;
          repeat_days: number[];
          requires_confirmation: boolean;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          icon?: string | null;
          scheduled_time?: string | null;
          repeat_days?: number[];
          requires_confirmation?: boolean;
          enabled?: boolean;
        };
        Update: {
          title?: string;
          icon?: string | null;
          scheduled_time?: string | null;
          repeat_days?: number[];
          requires_confirmation?: boolean;
          enabled?: boolean;
        };
        Relationships: [];
      };
      activity_sessions: {
        Row: {
          id: string;
          patient_id: string;
          activity_id: string | null;
          started_at: string;
          completed_at: string | null;
          result: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          activity_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
          result?: Json | null;
        };
        Update: {
          completed_at?: string | null;
          result?: Json | null;
        };
        Relationships: [];
      };
      daily_completions: {
        Row: {
          routine_item_id: string;
          patient_id: string;
          completed_date: string;
          completed_at: string;
        };
        Insert: {
          routine_item_id: string;
          patient_id: string;
          completed_date: string;
          completed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      conversation_settings: {
        Row: {
          patient_id: string;
          enabled: boolean;
          theme: string | null;
          context: Json | null;
          history_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          patient_id: string;
          enabled?: boolean;
          theme?: string | null;
          context?: Json | null;
          history_enabled?: boolean;
        };
        Update: {
          enabled?: boolean;
          theme?: string | null;
          context?: Json | null;
          history_enabled?: boolean;
        };
        Relationships: [];
      };
      game_scores: {
        Row: {
          id: string;
          patient_id: string;
          game_type: GameType;
          score: number;
          metric: Json | null;
          played_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          game_type: GameType;
          score: number;
          metric?: Json | null;
          played_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      puzzle_images: {
        Row: {
          id: string;
          patient_id: string;
          image_url: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          image_url: string;
          label?: string | null;
        };
        Update: {
          image_url?: string;
          label?: string | null;
        };
        Relationships: [];
      };
      rhythm_sounds: {
        Row: {
          id: string;
          patient_id: string;
          audio_url: string;
          label: string | null;
          trim_start_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          audio_url: string;
          label?: string | null;
          trim_start_seconds?: number;
        };
        Update: {
          audio_url?: string;
          label?: string | null;
          trim_start_seconds?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
