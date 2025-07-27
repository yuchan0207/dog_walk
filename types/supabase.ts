export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          created_at: string | null
          id: string
          user1_id: string
          user2_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user1_id: string
          user2_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          user1_id?: string
          user2_id?: string | null
        }
        Relationships: []
      }
      dog_histories: {
        Row: {
          age: string | null
          breed: string | null
          created_at: string | null
          dog_id: string
          gender: string | null
          hobbies: string | null
          id: string
          image_url: string | null
          name: string | null
          owner_id: string | null
          personality: string | null
        }
        Insert: {
          age?: string | null
          breed?: string | null
          created_at?: string | null
          dog_id: string
          gender?: string | null
          hobbies?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          personality?: string | null
        }
        Update: {
          age?: string | null
          breed?: string | null
          created_at?: string | null
          dog_id?: string
          gender?: string | null
          hobbies?: string | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string | null
          personality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_histories_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dog_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_images: {
        Row: {
          category: string | null
          dog_id: string
          id: string
          image_url: string | null
          uploaded_at: string | null
        }
        Insert: {
          category?: string | null
          dog_id: string
          id?: string
          image_url?: string | null
          uploaded_at?: string | null
        }
        Update: {
          category?: string | null
          dog_id?: string
          id?: string
          image_url?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_images_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dog_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_profiles: {
        Row: {
          age: number | null
          breed: string | null
          created_at: string | null
          dog_id: string | null
          gender: string | null
          hobbies: string[] | null
          id: string
          image_url: string | null
          name: string | null
          owner_id: string
          personality: string[] | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          dog_id?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string
          personality?: string[] | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          created_at?: string | null
          dog_id?: string | null
          gender?: string | null
          hobbies?: string[] | null
          id?: string
          image_url?: string | null
          name?: string | null
          owner_id?: string
          personality?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          age: string | null
          breed: string | null
          discription: string | null
          dog_id: string | null
          dog_name: string | null
          id: string
          image_url: string | null
          is_home: boolean | null
          latitude: number
          longitude: number | null
          owner_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: string | null
          breed?: string | null
          discription?: string | null
          dog_id?: string | null
          dog_name?: string | null
          id?: string
          image_url?: string | null
          is_home?: boolean | null
          latitude: number
          longitude?: number | null
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          age?: string | null
          breed?: string | null
          discription?: string | null
          dog_id?: string | null
          dog_name?: string | null
          id?: string
          image_url?: string | null
          is_home?: boolean | null
          latitude?: number
          longitude?: number | null
          owner_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          room_id: string
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          room_id: string
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          room_id?: string
          sender_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: string
          name: string | null
          username: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name?: string | null
          username?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          name?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_home_locations: {
        Row: {
          latitude: number
          longitude: number | null
          user_id: string
        }
        Insert: {
          latitude: number
          longitude?: number | null
          user_id: string
        }
        Update: {
          latitude?: number
          longitude?: number | null
          user_id?: string
        }
        Relationships: []
      }
      walk_requests: {
        Row: {
          created_at: string | null
          dog_id: string | null
          from_user_id: string
          id: string
          owner_id: string | null
          status: string | null
          to_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dog_id?: string | null
          from_user_id?: string
          id?: string
          owner_id?: string | null
          status?: string | null
          to_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dog_id?: string | null
          from_user_id?: string
          id?: string
          owner_id?: string | null
          status?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_from_user"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_requests_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dog_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
