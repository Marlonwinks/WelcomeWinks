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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          password: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          password: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password?: string
          username?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          excused: boolean
          id: string
          notes: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          excused?: boolean
          id?: string
          notes?: string | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          excused?: boolean
          id?: string
          notes?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string
          created_at: string
          excerpt: string
          id: string
          published: boolean
          read_time: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          excerpt: string
          id?: string
          published?: boolean
          read_time?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          read_time?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_at: string
          id: string
          location: string | null
          start_at: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          location?: string | null
          start_at: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          location?: string | null
          start_at?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      change_of_heart_requests: {
        Row: {
          created_at: string
          evidence: string | null
          id: number
          reason: string
          status: string | null
          target_location: string | null
          target_name: string
        }
        Insert: {
          created_at?: string
          evidence?: string | null
          id?: never
          reason: string
          status?: string | null
          target_location?: string | null
          target_name: string
        }
        Update: {
          created_at?: string
          evidence?: string | null
          id?: never
          reason?: string
          status?: string | null
          target_location?: string | null
          target_name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: number
          image_url: string | null
          thread_id: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          image_url?: string | null
          thread_id?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          image_url?: string | null
          thread_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      competencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          budget_range: string
          business_type: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          status: string
        }
        Insert: {
          budget_range: string
          business_type: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          status?: string
        }
        Update: {
          budget_range?: string
          business_type?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          status?: string
        }
        Relationships: []
      }
      decks: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          thread_id: number | null
          user_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id?: number | null
          user_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: number | null
          user_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          subject: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          subject?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          subject?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      papers: {
        Row: {
          abstract: string
          authors: string
          created_at: string
          doi: string | null
          id: string
          journal: string
          pdf_url: string | null
          published_date: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          abstract: string
          authors: string
          created_at?: string
          doi?: string | null
          id?: string
          journal: string
          pdf_url?: string | null
          published_date: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          abstract?: string
          authors?: string
          created_at?: string
          doi?: string | null
          id?: string
          journal?: string
          pdf_url?: string | null
          published_date?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: number
          option_text: string
          poll_id: number | null
          votes: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          option_text: string
          poll_id?: number | null
          votes?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          option_text?: string
          poll_id?: number | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: number | null
          poll_id: number | null
          user_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id?: number | null
          poll_id?: number | null
          user_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: number | null
          poll_id?: number | null
          user_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          id: number
          is_active: boolean | null
          question: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean | null
          question: string
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean | null
          question?: string
        }
        Relationships: []
      }
      portfolio_data: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      proficiency_records: {
        Row: {
          competency_id: string
          evidence: Json
          id: string
          level: string | null
          recorded_at: string
          score_pct: number
          user_id: string
        }
        Insert: {
          competency_id: string
          evidence?: Json
          id?: string
          level?: string | null
          recorded_at?: string
          score_pct: number
          user_id: string
        }
        Update: {
          competency_id?: string
          evidence?: Json
          id?: string
          level?: string | null
          recorded_at?: string
          score_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proficiency_records_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color_theme: string | null
          created_at: string | null
          grade_level: string | null
          handbook_ack: boolean | null
          id: string
          preferred_name: string | null
          theme: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          color_theme?: string | null
          created_at?: string | null
          grade_level?: string | null
          handbook_ack?: boolean | null
          id: string
          preferred_name?: string | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          color_theme?: string | null
          created_at?: string | null
          grade_level?: string | null
          handbook_ack?: boolean | null
          id?: string
          preferred_name?: string | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          demo_url: string | null
          description: string
          emoji: string | null
          github_url: string | null
          id: string
          image_url: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_url?: string | null
          description: string
          emoji?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_url?: string | null
          description?: string
          emoji?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      questionnaire_submissions: {
        Row: {
          created_at: string
          id: string
          submission_data: Json
        }
        Insert: {
          created_at?: string
          id?: string
          submission_data: Json
        }
        Update: {
          created_at?: string
          id?: string
          submission_data?: Json
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string | null
          deck_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deck_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deck_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_classes: {
        Row: {
          created_at: string
          days: string[] | null
          end_time: string | null
          id: string
          room: string | null
          start_time: string | null
          teacher_name: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days?: string[] | null
          end_time?: string | null
          id?: string
          room?: string | null
          start_time?: string | null
          teacher_name?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days?: string[] | null
          end_time?: string | null
          id?: string
          room?: string | null
          start_time?: string | null
          teacher_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          actual_duration: number
          created_at: string
          id: string
          notes: string | null
          planned_duration: number
          session_date: string
          subject: string
          user_id: string
        }
        Insert: {
          actual_duration: number
          created_at?: string
          id?: string
          notes?: string | null
          planned_duration: number
          session_date?: string
          subject: string
          user_id: string
        }
        Update: {
          actual_duration?: number
          created_at?: string
          id?: string
          notes?: string | null
          planned_duration?: number
          session_date?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          content: string
          created_at: string
          id: number
          image_url: string | null
          is_pinned: boolean | null
          likes: number | null
          title: string
          views: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          image_url?: string | null
          is_pinned?: boolean | null
          likes?: number | null
          title: string
          views?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          image_url?: string | null
          is_pinned?: boolean | null
          likes?: number | null
          title?: string
          views?: number | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          selected_plan: Json | null
          updated_at: string
          user_id: string
          welcome_seen: boolean | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          selected_plan?: Json | null
          updated_at?: string
          user_id: string
          welcome_seen?: boolean | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          selected_plan?: Json | null
          updated_at?: string
          user_id?: string
          welcome_seen?: boolean | null
        }
        Relationships: []
      }
      user_views: {
        Row: {
          created_at: string
          id: string
          thread_id: number | null
          user_fingerprint: string
        }
        Insert: {
          created_at?: string
          id?: string
          thread_id?: number | null
          user_fingerprint: string
        }
        Update: {
          created_at?: string
          id?: string
          thread_id?: number | null
          user_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_views_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_friend_by_username: {
        Args: { friend_username: string; user_id: string }
        Returns: string
      }
      create_profile: {
        Args: { user_email: string; user_id: string; user_username: string }
        Returns: boolean
      }
      create_profile_for_user: {
        Args: { user_email: string; user_id: string; user_username: string }
        Returns: boolean
      }
      find_user_by_username: {
        Args: { search_username: string }
        Returns: {
          avatar_url: string
          id: string
          username: string
        }[]
      }
      get_table_info: {
        Args: { table_name: string }
        Returns: Json
      }
      get_user_friends: {
        Args: { user_uuid: string }
        Returns: {
          avatar_url: string
          friend_id: string
          is_sender: boolean
          status: string
          username: string
        }[]
      }
      increment_thread_view: {
        Args: { thread_id_param: number; user_fingerprint_param: string }
        Returns: undefined
      }
      is_username_available: {
        Args: { username: string }
        Returns: boolean
      }
      toggle_thread_like: {
        Args: {
          is_like_param: boolean
          thread_id_param: number
          user_fingerprint_param: string
        }
        Returns: undefined
      }
    }
    Enums: {
      budget_level: "budget" | "mid-range" | "luxury"
      region_preference:
        | "europe"
        | "asia"
        | "north_america"
        | "south_america"
        | "africa"
        | "oceania"
        | "middle_east"
      travel_style:
        | "adventure"
        | "relaxation"
        | "cultural"
        | "foodie"
        | "nature"
        | "urban"
        | "beach"
        | "mountain"
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
      budget_level: ["budget", "mid-range", "luxury"],
      region_preference: [
        "europe",
        "asia",
        "north_america",
        "south_america",
        "africa",
        "oceania",
        "middle_east",
      ],
      travel_style: [
        "adventure",
        "relaxation",
        "cultural",
        "foodie",
        "nature",
        "urban",
        "beach",
        "mountain",
      ],
    },
  },
} as const
