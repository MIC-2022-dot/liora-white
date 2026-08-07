export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_call_sessions: {
        Row: {
          call_id: string | null;
          ended_at: string | null;
          id: string;
          mode: Database["public"]["Enums"]["answer_mode"];
          owner_id: string;
          started_at: string;
          transcript: Json | null;
        };
        Insert: {
          call_id?: string | null;
          ended_at?: string | null;
          id?: string;
          mode?: Database["public"]["Enums"]["answer_mode"];
          owner_id: string;
          started_at?: string;
          transcript?: Json | null;
        };
        Update: {
          call_id?: string | null;
          ended_at?: string | null;
          id?: string;
          mode?: Database["public"]["Enums"]["answer_mode"];
          owner_id?: string;
          started_at?: string;
          transcript?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_call_sessions_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "call_history";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_call_settings: {
        Row: {
          answer_after_seconds: number;
          enabled: boolean;
          manual_switching: boolean;
          updated_at: string;
          user_id: string;
          video_calls: boolean;
          voice_calls: boolean;
        };
        Insert: {
          answer_after_seconds?: number;
          enabled?: boolean;
          manual_switching?: boolean;
          updated_at?: string;
          user_id: string;
          video_calls?: boolean;
          voice_calls?: boolean;
        };
        Update: {
          answer_after_seconds?: number;
          enabled?: boolean;
          manual_switching?: boolean;
          updated_at?: string;
          user_id?: string;
          video_calls?: boolean;
          voice_calls?: boolean;
        };
        Relationships: [];
      };
      ai_chat_settings: {
        Row: {
          away_after_minutes: number;
          created_at: string;
          enabled: boolean;
          mode: string;
          reply_delay_seconds: number;
          updated_at: string;
          user_id: string;
          voice_note_instructions: string | null;
          voice_note_max_seconds: number;
          voice_note_mode: string;
          voice_notes_enabled: boolean;
        };
        Insert: {
          away_after_minutes?: number;
          created_at?: string;
          enabled?: boolean;
          mode?: string;
          reply_delay_seconds?: number;
          updated_at?: string;
          user_id: string;
          voice_note_instructions?: string | null;
          voice_note_max_seconds?: number;
          voice_note_mode?: string;
          voice_notes_enabled?: boolean;
        };
        Update: {
          away_after_minutes?: number;
          created_at?: string;
          enabled?: boolean;
          mode?: string;
          reply_delay_seconds?: number;
          updated_at?: string;
          user_id?: string;
          voice_note_instructions?: string | null;
          voice_note_max_seconds?: number;
          voice_note_mode?: string;
          voice_notes_enabled?: boolean;
        };
        Relationships: [];
      };
      ai_training_examples: {
        Row: {
          active: boolean;
          channel: string;
          created_at: string;
          id: string;
          ideal_response: string;
          response_format: string;
          scenario: string | null;
          tags: string[];
          updated_at: string;
          user_id: string;
          user_input: string;
          weight: number;
        };
        Insert: {
          active?: boolean;
          channel?: string;
          created_at?: string;
          id?: string;
          ideal_response: string;
          response_format?: string;
          scenario?: string | null;
          tags?: string[];
          updated_at?: string;
          user_id: string;
          user_input: string;
          weight?: number;
        };
        Update: {
          active?: boolean;
          channel?: string;
          created_at?: string;
          id?: string;
          ideal_response?: string;
          response_format?: string;
          scenario?: string | null;
          tags?: string[];
          updated_at?: string;
          user_id?: string;
          user_input?: string;
          weight?: number;
        };
        Relationships: [];
      };
      ai_training_rules: {
        Row: {
          action: string;
          active: boolean;
          channel: string;
          condition: string;
          created_at: string;
          id: string;
          instruction: string | null;
          priority: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          action?: string;
          active?: boolean;
          channel?: string;
          condition: string;
          created_at?: string;
          id?: string;
          instruction?: string | null;
          priority?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          active?: boolean;
          channel?: string;
          condition?: string;
          created_at?: string;
          id?: string;
          instruction?: string | null;
          priority?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_behavior_settings: {
        Row: {
          blinking: number;
          emotional_reactivity: number;
          eye_movement: number;
          hand_gestures: number;
          head_movement: number;
          laugh: number;
          listening_reactions: number;
          smile: number;
          speaking_energy: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          blinking?: number;
          emotional_reactivity?: number;
          eye_movement?: number;
          hand_gestures?: number;
          head_movement?: number;
          laugh?: number;
          listening_reactions?: number;
          smile?: number;
          speaking_energy?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          blinking?: number;
          emotional_reactivity?: number;
          eye_movement?: number;
          hand_gestures?: number;
          head_movement?: number;
          laugh?: number;
          listening_reactions?: number;
          smile?: number;
          speaking_energy?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_instructions: {
        Row: {
          response_rules: string | null;
          restrictions: string | null;
          situational_behavior: string | null;
          system_instructions: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          response_rules?: string | null;
          restrictions?: string | null;
          situational_behavior?: string | null;
          system_instructions?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          response_rules?: string | null;
          restrictions?: string | null;
          situational_behavior?: string | null;
          system_instructions?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_knowledge: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category?: string;
          content: string;
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_media: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          meta: Json | null;
          url: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: string;
          meta?: Json | null;
          url: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          meta?: Json | null;
          url?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_personality: {
        Row: {
          conversation_preferences: string | null;
          description: string | null;
          emotional_behavior: string | null;
          should_avoid: string | null;
          should_know: string | null;
          speaking_style: string | null;
          tone: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          conversation_preferences?: string | null;
          description?: string | null;
          emotional_behavior?: string | null;
          should_avoid?: string | null;
          should_know?: string | null;
          speaking_style?: string | null;
          tone?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          conversation_preferences?: string | null;
          description?: string | null;
          emotional_behavior?: string | null;
          should_avoid?: string | null;
          should_know?: string | null;
          speaking_style?: string | null;
          tone?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_profiles: {
        Row: {
          created_at: string;
          name: string | null;
          provider: string | null;
          provider_avatar_id: string | null;
          quality_score: number | null;
          source_image_url: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          name?: string | null;
          provider?: string | null;
          provider_avatar_id?: string | null;
          quality_score?: number | null;
          source_image_url?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          name?: string | null;
          provider?: string | null;
          provider_avatar_id?: string | null;
          quality_score?: number | null;
          source_image_url?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      avatar_voice_settings: {
        Row: {
          emotion: string | null;
          pitch: number;
          provider: string | null;
          speed: number;
          updated_at: string;
          user_id: string;
          voice_id: string | null;
          voice_name: string | null;
        };
        Insert: {
          emotion?: string | null;
          pitch?: number;
          provider?: string | null;
          speed?: number;
          updated_at?: string;
          user_id: string;
          voice_id?: string | null;
          voice_name?: string | null;
        };
        Update: {
          emotion?: string | null;
          pitch?: number;
          provider?: string | null;
          speed?: number;
          updated_at?: string;
          user_id?: string;
          voice_id?: string | null;
          voice_name?: string | null;
        };
        Relationships: [];
      };
      call_history: {
        Row: {
          answered_at: string | null;
          answered_mode: Database["public"]["Enums"]["answer_mode"] | null;
          callee_id: string;
          caller_id: string;
          duration_seconds: number | null;
          ended_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["call_kind"];
          started_at: string;
          status: Database["public"]["Enums"]["call_status"];
        };
        Insert: {
          answered_at?: string | null;
          answered_mode?: Database["public"]["Enums"]["answer_mode"] | null;
          callee_id: string;
          caller_id: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["call_kind"];
          started_at?: string;
          status?: Database["public"]["Enums"]["call_status"];
        };
        Update: {
          answered_at?: string | null;
          answered_mode?: Database["public"]["Enums"]["answer_mode"] | null;
          callee_id?: string;
          caller_id?: string;
          duration_seconds?: number | null;
          ended_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["call_kind"];
          started_at?: string;
          status?: Database["public"]["Enums"]["call_status"];
        };
        Relationships: [];
      };
      call_signals: {
        Row: {
          call_id: string;
          created_at: string;
          id: string;
          payload: Json;
          recipient_id: string;
          sender_id: string;
          type: string;
        };
        Insert: {
          call_id: string;
          created_at?: string;
          id?: string;
          payload: Json;
          recipient_id: string;
          sender_id: string;
          type: string;
        };
        Update: {
          call_id?: string;
          created_at?: string;
          id?: string;
          payload?: Json;
          recipient_id?: string;
          sender_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_signals_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "call_history";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          blocked: boolean;
          contact_id: string;
          created_at: string;
          favorite: boolean;
          id: string;
          user_id: string;
        };
        Insert: {
          blocked?: boolean;
          contact_id: string;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          user_id: string;
        };
        Update: {
          blocked?: boolean;
          contact_id?: string;
          created_at?: string;
          favorite?: boolean;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      conversation_participants: {
        Row: {
          conversation_id: string;
          joined_at: string;
          last_read_at: string;
          user_id: string;
        };
        Insert: {
          conversation_id: string;
          joined_at?: string;
          last_read_at?: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string;
          joined_at?: string;
          last_read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          last_message_at: string;
          last_message_preview: string | null;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          last_message_at?: string;
          last_message_preview?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          last_message_at?: string;
          last_message_preview?: string | null;
        };
        Relationships: [];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      message_reads: {
        Row: {
          message_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          message_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          message_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string | null;
          conversation_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          kind: Database["public"]["Enums"]["message_kind"];
          media_meta: Json | null;
          media_url: string | null;
          reply_to: string | null;
          sender_id: string;
        };
        Insert: {
          body?: string | null;
          conversation_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          media_meta?: Json | null;
          media_url?: string | null;
          reply_to?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string | null;
          conversation_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          kind?: Database["public"]["Enums"]["message_kind"];
          media_meta?: Json | null;
          media_url?: string | null;
          reply_to?: string | null;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_reply_to_fkey";
            columns: ["reply_to"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json | null;
          id: string;
          read: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          id?: string;
          read?: boolean;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json | null;
          id?: string;
          read?: boolean;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          onboarding_completed: boolean;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          onboarding_completed?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          onboarding_completed?: boolean;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      studio_access: {
        Row: {
          enabled: boolean;
          granted_at: string;
          granted_by: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          enabled?: boolean;
          granted_at?: string;
          granted_by?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          enabled?: boolean;
          granted_at?: string;
          granted_by?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_presence: {
        Row: {
          last_seen: string;
          status: string;
          user_id: string;
        };
        Insert: {
          last_seen?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          last_seen?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          appearance: Json;
          notifications: Json;
          privacy: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          appearance?: Json;
          notifications?: Json;
          privacy?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          appearance?: Json;
          notifications?: Json;
          privacy?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      image_library: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          title: string | null;
          description: string | null;
          tags: string[];
          activity: string | null;
          location_context: string | null;
          time_context: Database["public"]["Enums"]["image_time_context"];
          image_state: Database["public"]["Enums"]["image_state"];
          ai_enabled: boolean;
          priority: number;
          reuse_policy: Database["public"]["Enums"]["image_reuse_policy"];
          reuse_after_days: number | null;
          ai_metadata: Json | null;
          metadata_reviewed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          title?: string | null;
          description?: string | null;
          tags?: string[];
          activity?: string | null;
          location_context?: string | null;
          time_context?: Database["public"]["Enums"]["image_time_context"];
          image_state?: Database["public"]["Enums"]["image_state"];
          ai_enabled?: boolean;
          priority?: number;
          reuse_policy?: Database["public"]["Enums"]["image_reuse_policy"];
          reuse_after_days?: number | null;
          ai_metadata?: Json | null;
          metadata_reviewed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          title?: string | null;
          description?: string | null;
          tags?: string[];
          activity?: string | null;
          location_context?: string | null;
          time_context?: Database["public"]["Enums"]["image_time_context"];
          image_state?: Database["public"]["Enums"]["image_state"];
          ai_enabled?: boolean;
          priority?: number;
          reuse_policy?: Database["public"]["Enums"]["image_reuse_policy"];
          reuse_after_days?: number | null;
          ai_metadata?: Json | null;
          metadata_reviewed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      image_usage: {
        Row: {
          id: string;
          image_id: string;
          owner_id: string;
          recipient_id: string;
          conversation_id: string | null;
          message_id: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          image_id: string;
          owner_id: string;
          recipient_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          image_id?: string;
          owner_id?: string;
          recipient_id?: string;
          conversation_id?: string | null;
          message_id?: string | null;
          sent_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "image_usage_image_id_fkey";
            columns: ["image_id"];
            isOneToOne: false;
            referencedRelation: "image_library";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "image_usage_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "image_usage_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      image_rules: {
        Row: {
          id: string;
          user_id: string;
          condition: string;
          action: string;
          instruction: string | null;
          priority: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          condition: string;
          action?: string;
          instruction?: string | null;
          priority?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          condition?: string;
          action?: string;
          instruction?: string | null;
          priority?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      has_studio_access: { Args: { _user_id: string }; Returns: boolean };
      is_participant: {
        Args: { _conversation_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      answer_mode: "human" | "ai";
      app_role: "admin" | "user";
      call_kind: "voice" | "video";
      call_status: "ringing" | "answered" | "missed" | "declined" | "ended" | "failed";
      message_kind: "text" | "image" | "audio" | "file";
      image_time_context: "morning" | "afternoon" | "evening" | "night" | "anytime";
      image_state: "current" | "historical" | "reference";
      image_reuse_policy: "never" | "after_days" | "always";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      answer_mode: ["human", "ai"],
      app_role: ["admin", "user"],
      call_kind: ["voice", "video"],
      call_status: ["ringing", "answered", "missed", "declined", "ended", "failed"],
      message_kind: ["text", "image", "audio", "file"],
      image_time_context: ["morning", "afternoon", "evening", "night", "anytime"],
      image_state: ["current", "historical", "reference"],
      image_reuse_policy: ["never", "after_days", "always"],
    },
  },
} as const;
