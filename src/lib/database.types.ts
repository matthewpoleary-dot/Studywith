export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LearningReceipt = {
  conceptsCovered: string[];
  gaps: string[];
  score: number;
  summary: string;
  // Extended summary fields
  understoodWell?: string[];
  toRevisit?: string[];
  followUpQuestion?: string;
  closingMessage?: string;
  directAnswer?: string;
  subject?: string;
  // Assignment coverage
  questionsTotal?: number;
  questionsAttempted?: number;
  // Grit
  gritEarned?: number;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          stripe_customer_id: string | null;
          subscribed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          stripe_customer_id?: string | null;
          subscribed?: boolean;
          created_at?: string;
        };
        Update: {
          email?: string;
          stripe_customer_id?: string | null;
          subscribed?: boolean;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          assignment_text: string;
          title: string | null;
          messages: Json;
          receipt: Json | null;
          room_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_text: string;
          title?: string | null;
          messages?: Json;
          receipt?: Json | null;
          room_id?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          messages?: Json;
          receipt?: Json | null;
          room_id?: string | null;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          code: string;
          name: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      study_materials: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          topic: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          topic?: string | null;
          created_at?: string;
        };
        Update: {
          topic?: string | null;
        };
        Relationships: [];
      };
      flashcards: {
        Row: {
          id: string;
          material_id: string;
          user_id: string;
          question: string;
          answer: string;
          topic: string;
          confidence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          user_id: string;
          question: string;
          answer: string;
          topic: string;
          confidence?: number;
          created_at?: string;
        };
        Update: {
          confidence?: number;
        };
        Relationships: [];
      };
      quiz_questions: {
        Row: {
          id: string;
          material_id: string;
          user_id: string;
          question: string;
          options: Json;
          correct_index: number;
          explanation: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          material_id: string;
          user_id: string;
          question: string;
          options: Json;
          correct_index: number;
          explanation: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      study_plans: {
        Row: {
          id: string;
          user_id: string;
          exam_type: string;
          exam_year: number;
          subjects: Json;
          start_date: string;
          sessions_per_week: number;
          session_duration_mins: number;
          topics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exam_type: string;
          exam_year: number;
          subjects: Json;
          start_date: string;
          sessions_per_week: number;
          session_duration_mins: number;
          topics?: Json;
          created_at?: string;
        };
        Update: {
          topics?: Json;
          sessions_per_week?: number;
          session_duration_mins?: number;
        };
        Relationships: [];
      };
      room_assignments: {
        Row: {
          id: string;
          room_id: string;
          title: string;
          content: string;
          image_url: string | null;
          file_url: string | null;
          file_name: string | null;
          file_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          title: string;
          content: string;
          image_url?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          image_url?: string | null;
          file_url?: string | null;
          file_name?: string | null;
          file_type?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
