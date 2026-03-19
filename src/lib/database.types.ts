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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          assignment_text: string;
          title?: string | null;
          messages?: Json;
          receipt?: Json | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          messages?: Json;
          receipt?: Json | null;
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
