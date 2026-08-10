export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; full_name: string | null; stripe_customer_id: string | null; subscribed: boolean; created_at: string; updated_at: string };
        Insert: { id: string; email: string; full_name?: string | null; stripe_customer_id?: string | null; subscribed?: boolean };
        Update: { email?: string; full_name?: string | null; stripe_customer_id?: string | null; subscribed?: boolean; updated_at?: string };
        Relationships: [];
      };
      entitlements: {
        Row: { id: string; user_id: string; kind: string; status: string; source: string; starts_at: string; ends_at: string | null; stripe_subscription_id: string | null; stripe_checkout_session_id: string | null; ai_credits: number; ai_credits_used: number; metadata: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; kind: string; status?: string; source: string; starts_at?: string; ends_at?: string | null; stripe_subscription_id?: string | null; stripe_checkout_session_id?: string | null; ai_credits?: number; ai_credits_used?: number; metadata?: Json };
        Update: Partial<Database["public"]["Tables"]["entitlements"]["Insert"]>;
        Relationships: [];
      };
      purchases: {
        Row: { id: string; user_id: string; stripe_checkout_session_id: string; stripe_payment_intent_id: string | null; product: string; amount_cents: number; currency: string; status: string; campaign_id: string | null; created_at: string };
        Insert: { id?: string; user_id: string; stripe_checkout_session_id: string; stripe_payment_intent_id?: string | null; product: string; amount_cents: number; currency?: string; status?: string; campaign_id?: string | null };
        Update: { status?: string };
        Relationships: [];
      };
      usage_events: {
        Row: { id: string; user_id: string; feature: string; entitlement_id: string | null; created_at: string };
        Insert: { id?: string; user_id: string; feature: string; entitlement_id?: string | null };
        Update: never;
        Relationships: [];
      };
      sessions: {
        Row: { id: string; user_id: string; subject: string; title: string; assignment_text: string; messages: Json; receipt: Json | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; subject: string; title: string; assignment_text?: string; messages?: Json; receipt?: Json | null };
        Update: { title?: string; subject?: string; assignment_text?: string; messages?: Json; receipt?: Json | null; updated_at?: string };
        Relationships: [];
      };
      study_materials: {
        Row: { id: string; user_id: string; title: string; subject: string; file_name: string; topic: string | null; source_type: string; extracted_text: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; title: string; subject: string; file_name?: string; topic?: string | null; source_type?: string; extracted_text: string };
        Update: { title?: string; subject?: string; file_name?: string; topic?: string | null; extracted_text?: string; updated_at?: string };
        Relationships: [];
      };
      study_attachments: {
        Row: { id: string; user_id: string; session_id: string | null; material_id: string | null; storage_path: string; file_name: string; mime_type: string; size_bytes: number; extracted_text: string; created_at: string };
        Insert: { id?: string; user_id: string; session_id?: string | null; material_id?: string | null; storage_path: string; file_name: string; mime_type: string; size_bytes: number; extracted_text?: string };
        Update: never;
        Relationships: [];
      };
      flashcards: {
        Row: { id: string; material_id: string; user_id: string; question: string; answer: string; topic: string; confidence: number; created_at: string };
        Insert: { id?: string; material_id: string; user_id: string; question: string; answer: string; topic?: string; confidence?: number };
        Update: { confidence?: number };
        Relationships: [];
      };
      quiz_questions: {
        Row: { id: string; material_id: string; user_id: string; question: string; options: Json; correct_index: number; explanation: string; created_at: string };
        Insert: { id?: string; material_id: string; user_id: string; question: string; options: Json; correct_index: number; explanation: string };
        Update: never;
        Relationships: [];
      };
      study_plans: {
        Row: { id: string; user_id: string; exam_type: string; exam_year: number; subjects: Json; start_date: string; sessions_per_week: number; session_duration_mins: number; topics: Json; schedule: Json; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; exam_type: string; exam_year: number; subjects: Json; start_date: string; sessions_per_week: number; session_duration_mins: number; topics?: Json; schedule: Json };
        Update: { exam_year?: number; subjects?: Json; start_date?: string; sessions_per_week?: number; session_duration_mins?: number; topics?: Json; schedule?: Json; updated_at?: string };
        Relationships: [];
      };
      talk_campaigns: {
        Row: { id: string; code: string; school_name: string; active: boolean; toolkit_price_cents: number; starts_at: string; ends_at: string | null; created_at: string };
        Insert: { id?: string; code: string; school_name: string; active?: boolean; toolkit_price_cents?: number; starts_at?: string; ends_at?: string | null };
        Update: { school_name?: string; active?: boolean; toolkit_price_cents?: number; ends_at?: string | null };
        Relationships: [];
      };
      campaign_redemptions: {
        Row: { id: string; campaign_id: string; user_id: string; created_at: string };
        Insert: { id?: string; campaign_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      stripe_events: {
        Row: { id: string; event_type: string; processed_at: string };
        Insert: { id: string; event_type: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_ai_action: { Args: { p_user_id: string; p_feature: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
