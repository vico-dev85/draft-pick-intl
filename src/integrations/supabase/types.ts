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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      captain_connections: {
        Row: {
          captain_player_id: string
          id: string
          is_connected: boolean | null
          joined_at: string | null
          last_seen_at: string | null
          room_id: string
          session_id: string
        }
        Insert: {
          captain_player_id: string
          id?: string
          is_connected?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          room_id: string
          session_id: string
        }
        Update: {
          captain_player_id?: string
          id?: string
          is_connected?: boolean | null
          joined_at?: string | null
          last_seen_at?: string | null
          room_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "captain_connections_captain_player_id_fkey"
            columns: ["captain_player_id"]
            isOneToOne: false
            referencedRelation: "user_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_connections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "draft_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_room_players: {
        Row: {
          claimed_by_session_id: string | null
          created_at: string
          guest_name: string | null
          id: string
          is_captain: boolean | null
          is_guest: boolean | null
          pick_number: number | null
          picked_by_captain_number: number | null
          player_id: string | null
          room_id: string
        }
        Insert: {
          claimed_by_session_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          is_captain?: boolean | null
          is_guest?: boolean | null
          pick_number?: number | null
          picked_by_captain_number?: number | null
          player_id?: string | null
          room_id: string
        }
        Update: {
          claimed_by_session_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          is_captain?: boolean | null
          is_guest?: boolean | null
          pick_number?: number | null
          picked_by_captain_number?: number | null
          player_id?: string | null
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_room_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "user_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "draft_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_rooms: {
        Row: {
          captain1_player_id: string | null
          captain2_player_id: string | null
          captain3_player_id: string | null
          captains: Json | null
          completed_at: string | null
          created_at: string
          creator_user_id: string
          current_pick_number: number | null
          current_turn_captain_number: number | null
          draft_name: string
          draft_order: Json | null
          id: string
          num_teams: number | null
          room_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          captain1_player_id?: string | null
          captain2_player_id?: string | null
          captain3_player_id?: string | null
          captains?: Json | null
          completed_at?: string | null
          created_at?: string
          creator_user_id: string
          current_pick_number?: number | null
          current_turn_captain_number?: number | null
          draft_name: string
          draft_order?: Json | null
          id?: string
          num_teams?: number | null
          room_code: string
          started_at?: string | null
          status?: string
        }
        Update: {
          captain1_player_id?: string | null
          captain2_player_id?: string | null
          captain3_player_id?: string | null
          captains?: Json | null
          completed_at?: string | null
          created_at?: string
          creator_user_id?: string
          current_pick_number?: number | null
          current_turn_captain_number?: number | null
          draft_name?: string
          draft_order?: Json | null
          id?: string
          num_teams?: number | null
          room_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_rooms_captain1_player_id_fkey"
            columns: ["captain1_player_id"]
            isOneToOne: false
            referencedRelation: "user_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_rooms_captain2_player_id_fkey"
            columns: ["captain2_player_id"]
            isOneToOne: false
            referencedRelation: "user_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_rooms_captain3_player_id_fkey"
            columns: ["captain3_player_id"]
            isOneToOne: false
            referencedRelation: "user_players"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_rooms_public: {
        Row: {
          captain1_player_id: string | null
          captain2_player_id: string | null
          captain3_player_id: string | null
          captains: Json | null
          completed_at: string | null
          created_at: string
          current_pick_number: number | null
          current_turn_captain_number: number | null
          draft_name: string
          draft_order: Json | null
          id: string
          num_teams: number | null
          room_code: string
          started_at: string | null
          status: string
        }
        Insert: {
          captain1_player_id?: string | null
          captain2_player_id?: string | null
          captain3_player_id?: string | null
          captains?: Json | null
          completed_at?: string | null
          created_at: string
          current_pick_number?: number | null
          current_turn_captain_number?: number | null
          draft_name: string
          draft_order?: Json | null
          id: string
          num_teams?: number | null
          room_code: string
          started_at?: string | null
          status: string
        }
        Update: {
          captain1_player_id?: string | null
          captain2_player_id?: string | null
          captain3_player_id?: string | null
          captains?: Json | null
          completed_at?: string | null
          created_at?: string
          current_pick_number?: number | null
          current_turn_captain_number?: number | null
          draft_name?: string
          draft_order?: Json | null
          id?: string
          num_teams?: number | null
          room_code?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json
          created_at: string | null
          error: Json
          id: string
          severity: string
          timestamp: string
        }
        Insert: {
          context: Json
          created_at?: string | null
          error: Json
          id?: string
          severity: string
          timestamp: string
        }
        Update: {
          context?: Json
          created_at?: string | null
          error?: Json
          id?: string
          severity?: string
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_players: {
        Row: {
          created_at: string
          id: string
          name: string
          photo_url: string | null
          user_id: string
          club_id: string | null
          linked_user_id: string | null
          category: 'regular' | 'occasional'
          can_create_drafts: boolean
          can_send_invites: boolean
          invite_token: string | null
          invite_expires_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          user_id: string
          club_id?: string | null
          linked_user_id?: string | null
          category?: 'regular' | 'occasional'
          can_create_drafts?: boolean
          can_send_invites?: boolean
          invite_token?: string | null
          invite_expires_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
          club_id?: string | null
          linked_user_id?: string | null
          category?: 'regular' | 'occasional'
          can_create_drafts?: boolean
          can_send_invites?: boolean
          invite_token?: string | null
          invite_expires_at?: string | null
        }
        Relationships: []
      }
      game_nights: {
        Row: {
          id: string
          draft_room_id: string
          club_id: string | null
          status: string
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          draft_room_id: string
          club_id?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          draft_room_id?: string
          club_id?: string | null
          status?: string
          started_at?: string
          ended_at?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          id: string
          game_night_id: string
          game_number: number
          team_a_captain_number: number
          team_b_captain_number: number
          resting_captain_number: number
          score_a: number
          score_b: number
          timer_start_at: string | null
          timer_paused_at: string | null
          timer_elapsed_before_pause: number
          period: string
          result: string | null
          penalty_score_a: number | null
          penalty_score_b: number | null
          started_at: string | null
          ended_at: string | null
        }
        Insert: {
          id?: string
          game_night_id: string
          game_number: number
          team_a_captain_number: number
          team_b_captain_number: number
          resting_captain_number: number
          score_a?: number
          score_b?: number
          timer_start_at?: string | null
          timer_paused_at?: string | null
          timer_elapsed_before_pause?: number
          period?: string
          result?: string | null
          penalty_score_a?: number | null
          penalty_score_b?: number | null
          started_at?: string | null
          ended_at?: string | null
        }
        Update: {
          id?: string
          game_night_id?: string
          game_number?: number
          team_a_captain_number?: number
          team_b_captain_number?: number
          resting_captain_number?: number
          score_a?: number
          score_b?: number
          timer_start_at?: string | null
          timer_paused_at?: string | null
          timer_elapsed_before_pause?: number
          period?: string
          result?: string | null
          penalty_score_a?: number | null
          penalty_score_b?: number | null
          started_at?: string | null
          ended_at?: string | null
        }
        Relationships: []
      }
      game_goals: {
        Row: {
          id: string
          game_id: string
          player_id: string | null
          team_captain_number: number
          minute: number | null
          period: string
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id?: string | null
          team_captain_number: number
          minute?: number | null
          period?: string
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_id?: string | null
          team_captain_number?: number
          minute?: number | null
          period?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_player_identity: {
        Args: { p_draft_room_player_id: string; p_session_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      create_captain_connection: {
        Args: {
          p_captain_player_id: string
          p_room_id: string
          p_session_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      get_room_players_public: {
        Args: { p_room_code: string }
        Returns: {
          claimed_by_session_id: string
          display_name: string
          guest_name: string
          id: string
          is_captain: boolean
          photo_url: string
          pick_number: number
          picked_by_captain_number: number
          player_id: string
          room_id: string
        }[]
      }
      pick_player_atomic: {
        Args: {
          p_captain_number: number
          p_pick_number: number
          p_player_id: string
          p_room_id: string
          p_session_id: string
        }
        Returns: {
          claimed_by_session_id: string | null
          created_at: string
          guest_name: string | null
          id: string
          is_captain: boolean | null
          is_guest: boolean | null
          pick_number: number | null
          picked_by_captain_number: number | null
          player_id: string | null
          room_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "draft_room_players"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_captain_heartbeat: {
        Args: { p_room_id: string; p_session_id: string }
        Returns: undefined
      }
      generate_player_invite: {
        Args: { p_player_id: string }
        Returns: Json
      }
      accept_player_invite: {
        Args: { p_token: string }
        Returns: Json
      }
      unlink_player: {
        Args: { p_player_id: string }
        Returns: Json
      }
      update_player_permissions: {
        Args: { p_player_id: string; p_can_create_drafts?: boolean; p_can_send_invites?: boolean }
        Returns: Json
      }
      update_player_category: {
        Args: { p_player_id: string; p_category: string }
        Returns: Json
      }
      get_my_linked_clubs: {
        Args: Record<string, never>
        Returns: Json
      }
      get_user_club: {
        Args: Record<string, never>
        Returns: Json
      }
      request_player_invite: {
        Args: { p_player_id: string }
        Returns: Json
      }
      start_game_night: {
        Args: { p_draft_room_id: string }
        Returns: Json
      }
      start_game: {
        Args: { p_night_id: string; p_team_a: number; p_team_b: number; p_resting: number }
        Returns: Json
      }
      record_goal: {
        Args: { p_game_id: string; p_player_id: string | null; p_team_captain_number: number; p_minute: number; p_period: string }
        Returns: Json
      }
      undo_last_goal: {
        Args: { p_game_id: string }
        Returns: Json
      }
      end_game: {
        Args: { p_game_id: string; p_result: string; p_penalty_score_a?: number; p_penalty_score_b?: number }
        Returns: Json
      }
      end_game_night: {
        Args: { p_night_id: string }
        Returns: Json
      }
      get_game_night_summary: {
        Args: { p_night_id: string }
        Returns: Json
      }
      get_game_night_public: {
        Args: { p_night_id: string }
        Returns: Json
      }
      find_game_night_by_draft: {
        Args: { p_draft_room_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
