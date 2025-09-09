export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)";
  };
  public: {
    Tables: {
      chat_message_likes: {
        Row: {
          created_at: string | null;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_message_likes_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_message_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          category: string;
          content: string;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          latitude: number | null;
          likes: number | null;
          location_address: string | null;
          location_name: string | null;
          longitude: number | null;
          media_duration: number | null;
          media_type: string | null;
          media_url: string | null;
          reply_to_id: string | null;
          review_id: string | null;
          search_vector: unknown | null;
          sender_id: string | null;
          type: string | null;
          updated_at: string | null;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          latitude?: number | null;
          likes?: number | null;
          location_address?: string | null;
          location_name?: string | null;
          longitude?: number | null;
          media_duration?: number | null;
          media_type?: string | null;
          media_url?: string | null;
          reply_to_id?: string | null;
          review_id?: string | null;
          search_vector?: unknown | null;
          sender_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          latitude?: number | null;
          likes?: number | null;
          location_address?: string | null;
          location_name?: string | null;
          longitude?: number | null;
          media_duration?: number | null;
          media_type?: string | null;
          media_url?: string | null;
          reply_to_id?: string | null;
          review_id?: string | null;
          search_vector?: unknown | null;
          sender_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey";
            columns: ["reply_to_id"];
            isOneToOne: false;
            referencedRelation: "chat_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages_firebase: {
        Row: {
          chat_room_id: string | null;
          content: string;
          id: string;
          is_deleted: boolean | null;
          is_read: boolean | null;
          message_type: string | null;
          reactions: Json | null;
          reply_to: string | null;
          sender_avatar: string | null;
          sender_id: string | null;
          sender_name: string;
          timestamp: string | null;
        };
        Insert: {
          chat_room_id?: string | null;
          content: string;
          id?: string;
          is_deleted?: boolean | null;
          is_read?: boolean | null;
          message_type?: string | null;
          reactions?: Json | null;
          reply_to?: string | null;
          sender_avatar?: string | null;
          sender_id?: string | null;
          sender_name: string;
          timestamp?: string | null;
        };
        Update: {
          chat_room_id?: string | null;
          content?: string;
          id?: string;
          is_deleted?: boolean | null;
          is_read?: boolean | null;
          message_type?: string | null;
          reactions?: Json | null;
          reply_to?: string | null;
          sender_avatar?: string | null;
          sender_id?: string | null;
          sender_name?: string;
          timestamp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_firebase_chat_room_id_fkey";
            columns: ["chat_room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms_firebase";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_messages_firebase_reply_to_fkey";
            columns: ["reply_to"];
            isOneToOne: false;
            referencedRelation: "chat_messages_firebase";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_room_subscriptions: {
        Row: {
          is_subscribed: boolean;
          room_id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          is_subscribed?: boolean;
          room_id: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          is_subscribed?: boolean;
          room_id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_room_subscriptions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms_firebase";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_rooms: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_location_based: boolean | null;
          latitude: number | null;
          location_name: string | null;
          longitude: number | null;
          member_count: number | null;
          name: string;
          radius_miles: number | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_location_based?: boolean | null;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          member_count?: number | null;
          name: string;
          radius_miles?: number | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_location_based?: boolean | null;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          member_count?: number | null;
          name?: string;
          radius_miles?: number | null;
        };
        Relationships: [];
      };
      chat_rooms_firebase: {
        Row: {
          category: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string;
          id: string;
          is_active: boolean | null;
          is_deleted: boolean | null;
          is_private: boolean | null;
          last_activity: string | null;
          last_message: Json | null;
          location: Json | null;
          member_count: number | null;
          name: string;
          online_count: number | null;
          type: string;
          typing_users: Json | null;
          unread_count: number | null;
          updated_at: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description: string;
          id?: string;
          is_active?: boolean | null;
          is_deleted?: boolean | null;
          is_private?: boolean | null;
          last_activity?: string | null;
          last_message?: Json | null;
          location?: Json | null;
          member_count?: number | null;
          name: string;
          online_count?: number | null;
          type: string;
          typing_users?: Json | null;
          unread_count?: number | null;
          updated_at?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          description?: string;
          id?: string;
          is_active?: boolean | null;
          is_deleted?: boolean | null;
          is_private?: boolean | null;
          last_activity?: string | null;
          last_message?: Json | null;
          location?: Json | null;
          member_count?: number | null;
          name?: string;
          online_count?: number | null;
          type?: string;
          typing_users?: Json | null;
          unread_count?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chat_rooms_firebase_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      colleges: {
        Row: {
          alias: string | null;
          city: string;
          coordinates: Json | null;
          created_at: string | null;
          id: string;
          institution_type: string | null;
          name: string;
          scorecard_id: number | null;
          state: string;
          updated_at: string | null;
        };
        Insert: {
          alias?: string | null;
          city: string;
          coordinates?: Json | null;
          created_at?: string | null;
          id?: string;
          institution_type?: string | null;
          name: string;
          scorecard_id?: number | null;
          state: string;
          updated_at?: string | null;
        };
        Update: {
          alias?: string | null;
          city?: string;
          coordinates?: Json | null;
          created_at?: string | null;
          id?: string;
          institution_type?: string | null;
          name?: string;
          scorecard_id?: number | null;
          state?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          content: string;
          created_at: string | null;
          downvotes: number | null;
          id: string;
          is_edited: boolean | null;
          moderation_status: string | null;
          parent_comment_id: string | null;
          review_id: string | null;
          updated_at: string | null;
          upvotes: number | null;
          user_id: string | null;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          downvotes?: number | null;
          id?: string;
          is_edited?: boolean | null;
          moderation_status?: string | null;
          parent_comment_id?: string | null;
          review_id?: string | null;
          updated_at?: string | null;
          upvotes?: number | null;
          user_id?: string | null;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          downvotes?: number | null;
          id?: string;
          is_edited?: boolean | null;
          moderation_status?: string | null;
          parent_comment_id?: string | null;
          review_id?: string | null;
          updated_at?: string | null;
          upvotes?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      comments_firebase: {
        Row: {
          author_id: string | null;
          author_name: string;
          content: string;
          created_at: string | null;
          dislike_count: number | null;
          id: string;
          is_deleted: boolean | null;
          is_reported: boolean | null;
          like_count: number | null;
          media_id: string | null;
          parent_comment_id: string | null;
          review_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          author_name: string;
          content: string;
          created_at?: string | null;
          dislike_count?: number | null;
          id?: string;
          is_deleted?: boolean | null;
          is_reported?: boolean | null;
          like_count?: number | null;
          media_id?: string | null;
          parent_comment_id?: string | null;
          review_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          author_name?: string;
          content?: string;
          created_at?: string | null;
          dislike_count?: number | null;
          id?: string;
          is_deleted?: boolean | null;
          is_reported?: boolean | null;
          like_count?: number | null;
          media_id?: string | null;
          parent_comment_id?: string | null;
          review_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "comments_firebase_parent_comment_id_fkey";
            columns: ["parent_comment_id"];
            isOneToOne: false;
            referencedRelation: "comments_firebase";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_firebase_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews_firebase";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence: {
        Row: {
          created_at: string | null;
          description: string | null;
          file_path: string;
          file_size: number | null;
          file_type: string;
          id: string;
          is_verified: boolean | null;
          metadata_stripped: boolean | null;
          moderation_status: string | null;
          review_id: string | null;
          sightengine_analysis: Json | null;
          thumbnail_path: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          file_path: string;
          file_size?: number | null;
          file_type: string;
          id?: string;
          is_verified?: boolean | null;
          metadata_stripped?: boolean | null;
          moderation_status?: string | null;
          review_id?: string | null;
          sightengine_analysis?: Json | null;
          thumbnail_path?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          file_path?: string;
          file_size?: number | null;
          file_type?: string;
          id?: string;
          is_verified?: boolean | null;
          metadata_stripped?: boolean | null;
          moderation_status?: string | null;
          review_id?: string | null;
          sightengine_analysis?: Json | null;
          thumbnail_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_logs: {
        Row: {
          content_preview: string | null;
          content_type: string;
          context: Json | null;
          created_at: string | null;
          id: string;
          moderation_result: Json;
          user_id: string;
        };
        Insert: {
          content_preview?: string | null;
          content_type: string;
          context?: Json | null;
          created_at?: string | null;
          id?: string;
          moderation_result: Json;
          user_id: string;
        };
        Update: {
          content_preview?: string | null;
          content_type?: string;
          context?: Json | null;
          created_at?: string | null;
          id?: string;
          moderation_result?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string | null;
          data: Json | null;
          expo_push_token: string | null;
          id: string;
          is_read: boolean | null;
          is_sent: boolean | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body: string;
          created_at?: string | null;
          data?: Json | null;
          expo_push_token?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_sent?: boolean | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string | null;
          data?: Json | null;
          expo_push_token?: string | null;
          id?: string;
          is_read?: boolean | null;
          is_sent?: boolean | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orphaned_reviews_backup: {
        Row: {
          author_id: string | null;
          backup_reason: string | null;
          category: string | null;
          created_at: string | null;
          dislike_count: number | null;
          green_flags: string[] | null;
          id: string | null;
          is_anonymous: boolean | null;
          like_count: number | null;
          location: string | null;
          media: Json | null;
          profile_photo: string | null;
          red_flags: string[] | null;
          review_text: string | null;
          reviewed_person_location: Json | null;
          reviewed_person_name: string | null;
          reviewer_anonymous_id: string | null;
          sentiment: string | null;
          social_media: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          backup_reason?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          profile_photo?: string | null;
          red_flags?: string[] | null;
          review_text?: string | null;
          reviewed_person_location?: Json | null;
          reviewed_person_name?: string | null;
          reviewer_anonymous_id?: string | null;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          backup_reason?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          profile_photo?: string | null;
          red_flags?: string[] | null;
          review_text?: string | null;
          reviewed_person_location?: Json | null;
          reviewed_person_name?: string | null;
          reviewer_anonymous_id?: string | null;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      orphaned_reviews_detailed_backup: {
        Row: {
          author_id: string | null;
          backup_id: string | null;
          backup_timestamp: string | null;
          category: string | null;
          created_at: string | null;
          dislike_count: number | null;
          green_flags: string[] | null;
          id: string | null;
          is_anonymous: boolean | null;
          like_count: number | null;
          location: string | null;
          media: Json | null;
          orphan_type: string | null;
          profile_photo: string | null;
          red_flags: string[] | null;
          review_text: string | null;
          reviewed_person_location: Json | null;
          reviewed_person_name: string | null;
          reviewer_anonymous_id: string | null;
          sentiment: string | null;
          social_media: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          backup_id?: string | null;
          backup_timestamp?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          orphan_type?: string | null;
          profile_photo?: string | null;
          red_flags?: string[] | null;
          review_text?: string | null;
          reviewed_person_location?: Json | null;
          reviewed_person_name?: string | null;
          reviewer_anonymous_id?: string | null;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          backup_id?: string | null;
          backup_timestamp?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string | null;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          orphan_type?: string | null;
          profile_photo?: string | null;
          red_flags?: string[] | null;
          review_text?: string | null;
          reviewed_person_location?: Json | null;
          reviewed_person_name?: string | null;
          reviewer_anonymous_id?: string | null;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          created_at: string | null;
          device_id: string;
          id: string;
          is_active: boolean | null;
          platform: string;
          token: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          device_id: string;
          id?: string;
          is_active?: boolean | null;
          platform: string;
          token: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          device_id?: string;
          id?: string;
          is_active?: boolean | null;
          platform?: string;
          token?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          reason: string;
          reported_item_id: string;
          reported_item_type: string;
          reporter_id: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          reason: string;
          reported_item_id: string;
          reported_item_type: string;
          reporter_id: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          reason?: string;
          reported_item_id?: string;
          reported_item_type?: string;
          reporter_id?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          card_height: number | null;
          comment_count: number | null;
          content: string;
          content_length: string | null;
          created_at: string | null;
          date_of_experience: string | null;
          demographic_category: string;
          downvotes: number | null;
          evidence_count: number | null;
          has_evidence: boolean | null;
          id: string;
          latitude: number | null;
          location_address: string | null;
          location_coordinates: unknown | null;
          location_name: string | null;
          longitude: number | null;
          met_location: string | null;
          moderation_notes: string | null;
          moderation_status: string | null;
          priority: number | null;
          rating: number | null;
          report_count: number | null;
          review_type: string;
          reviewer_id: string | null;
          search_vector: unknown | null;
          sightengine_analysis: Json | null;
          subject_age_range: string | null;
          subject_first_name: string;
          subject_location: string;
          title: string;
          updated_at: string | null;
          upvotes: number | null;
        };
        Insert: {
          card_height?: number | null;
          comment_count?: number | null;
          content: string;
          content_length?: string | null;
          created_at?: string | null;
          date_of_experience?: string | null;
          demographic_category: string;
          downvotes?: number | null;
          evidence_count?: number | null;
          has_evidence?: boolean | null;
          id?: string;
          latitude?: number | null;
          location_address?: string | null;
          location_coordinates?: unknown | null;
          location_name?: string | null;
          longitude?: number | null;
          met_location?: string | null;
          moderation_notes?: string | null;
          moderation_status?: string | null;
          priority?: number | null;
          rating?: number | null;
          report_count?: number | null;
          review_type: string;
          reviewer_id?: string | null;
          search_vector?: unknown | null;
          sightengine_analysis?: Json | null;
          subject_age_range?: string | null;
          subject_first_name: string;
          subject_location: string;
          title: string;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Update: {
          card_height?: number | null;
          comment_count?: number | null;
          content?: string;
          content_length?: string | null;
          created_at?: string | null;
          date_of_experience?: string | null;
          demographic_category?: string;
          downvotes?: number | null;
          evidence_count?: number | null;
          has_evidence?: boolean | null;
          id?: string;
          latitude?: number | null;
          location_address?: string | null;
          location_coordinates?: unknown | null;
          location_name?: string | null;
          longitude?: number | null;
          met_location?: string | null;
          moderation_notes?: string | null;
          moderation_status?: string | null;
          priority?: number | null;
          rating?: number | null;
          report_count?: number | null;
          review_type?: string;
          reviewer_id?: string | null;
          search_vector?: unknown | null;
          sightengine_analysis?: Json | null;
          subject_age_range?: string | null;
          subject_first_name?: string;
          subject_location?: string;
          title?: string;
          updated_at?: string | null;
          upvotes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews_firebase: {
        Row: {
          author_id: string | null;
          category: string | null;
          created_at: string | null;
          dislike_count: number | null;
          green_flags: string[] | null;
          id: string;
          is_anonymous: boolean | null;
          like_count: number | null;
          location: string | null;
          media: Json | null;
          profile_photo: string;
          red_flags: string[] | null;
          review_text: string;
          reviewed_person_location: Json;
          reviewed_person_name: string;
          reviewer_anonymous_id: string;
          sentiment: string | null;
          social_media: Json | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          author_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          profile_photo: string;
          red_flags?: string[] | null;
          review_text: string;
          reviewed_person_location: Json;
          reviewed_person_name: string;
          reviewer_anonymous_id: string;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author_id?: string | null;
          category?: string | null;
          created_at?: string | null;
          dislike_count?: number | null;
          green_flags?: string[] | null;
          id?: string;
          is_anonymous?: boolean | null;
          like_count?: number | null;
          location?: string | null;
          media?: Json | null;
          profile_photo?: string;
          red_flags?: string[] | null;
          review_text?: string;
          reviewed_person_location?: Json;
          reviewed_person_name?: string;
          reviewer_anonymous_id?: string;
          sentiment?: string | null;
          social_media?: Json | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      social_media_profiles: {
        Row: {
          created_at: string | null;
          handle: string;
          id: string;
          is_verified: boolean | null;
          last_checked: string | null;
          platform: string;
          profile_data: Json | null;
          profile_url: string | null;
          review_id: string | null;
          verification_date: string | null;
        };
        Insert: {
          created_at?: string | null;
          handle: string;
          id?: string;
          is_verified?: boolean | null;
          last_checked?: string | null;
          platform: string;
          profile_data?: Json | null;
          profile_url?: string | null;
          review_id?: string | null;
          verification_date?: string | null;
        };
        Update: {
          created_at?: string | null;
          handle?: string;
          id?: string;
          is_verified?: boolean | null;
          last_checked?: string | null;
          platform?: string;
          profile_data?: Json | null;
          profile_url?: string | null;
          review_id?: string | null;
          verification_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "social_media_profiles_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      spatial_ref_sys: {
        Row: {
          auth_name: string | null;
          auth_srid: number | null;
          proj4text: string | null;
          srid: number;
          srtext: string | null;
        };
        Insert: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid: number;
          srtext?: string | null;
        };
        Update: {
          auth_name?: string | null;
          auth_srid?: number | null;
          proj4text?: string | null;
          srid?: number;
          srtext?: string | null;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null;
          created_at: string | null;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          tier: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          tier: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          cancel_at_period_end?: boolean | null;
          created_at?: string | null;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          tier?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      typing_indicators: {
        Row: {
          category: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          is_typing: boolean | null;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_typing?: boolean | null;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          is_typing?: boolean | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "typing_indicators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string | null;
          id: string;
          reason: string | null;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string | null;
          id?: string;
          reason?: string | null;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string | null;
          id?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey";
            columns: ["blocked_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey";
            columns: ["blocker_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_interactions: {
        Row: {
          created_at: string | null;
          id: string;
          interaction_type: string;
          review_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          interaction_type: string;
          review_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          interaction_type?: string;
          review_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_interactions_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_sessions: {
        Row: {
          clerk_session_id: string | null;
          created_at: string | null;
          device_info: Json | null;
          expires_at: string | null;
          id: string;
          ip_address: unknown | null;
          is_active: boolean | null;
          last_activity: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          clerk_session_id?: string | null;
          created_at?: string | null;
          device_info?: Json | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_active?: boolean | null;
          last_activity?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          clerk_session_id?: string | null;
          created_at?: string | null;
          device_info?: Json | null;
          expires_at?: string | null;
          id?: string;
          ip_address?: unknown | null;
          is_active?: boolean | null;
          last_activity?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_warnings: {
        Row: {
          created_at: string | null;
          description: string;
          expires_at: string | null;
          id: string;
          moderator_id: string | null;
          related_report_id: string | null;
          severity: string | null;
          user_id: string;
          warning_type: string;
        };
        Insert: {
          created_at?: string | null;
          description: string;
          expires_at?: string | null;
          id?: string;
          moderator_id?: string | null;
          related_report_id?: string | null;
          severity?: string | null;
          user_id: string;
          warning_type: string;
        };
        Update: {
          created_at?: string | null;
          description?: string;
          expires_at?: string | null;
          id?: string;
          moderator_id?: string | null;
          related_report_id?: string | null;
          severity?: string | null;
          user_id?: string;
          warning_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_warnings_moderator_id_fkey";
            columns: ["moderator_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          anonymous_id: string | null;
          ban_reason: string | null;
          city: string | null;
          clerk_user_id: string | null;
          created_at: string | null;
          email: string | null;
          gender: string | null;
          gender_preference: string | null;
          id: string;
          institution_type: string | null;
          is_banned: boolean | null;
          is_blocked: boolean | null;
          last_active: string | null;
          latitude: number | null;
          location_address: string | null;
          location_full_name: string | null;
          location_name: string | null;
          location_type: string | null;
          location_updated_at: string | null;
          longitude: number | null;
          reputation_score: number | null;
          state: string | null;
          subscription_expires_at: string | null;
          subscription_tier: string | null;
          total_reviews_submitted: number | null;
          updated_at: string | null;
          username: string | null;
          verification_level: string | null;
        };
        Insert: {
          anonymous_id?: string | null;
          ban_reason?: string | null;
          city?: string | null;
          clerk_user_id?: string | null;
          created_at?: string | null;
          email?: string | null;
          gender?: string | null;
          gender_preference?: string | null;
          id?: string;
          institution_type?: string | null;
          is_banned?: boolean | null;
          is_blocked?: boolean | null;
          last_active?: string | null;
          latitude?: number | null;
          location_address?: string | null;
          location_full_name?: string | null;
          location_name?: string | null;
          location_type?: string | null;
          location_updated_at?: string | null;
          longitude?: number | null;
          reputation_score?: number | null;
          state?: string | null;
          subscription_expires_at?: string | null;
          subscription_tier?: string | null;
          total_reviews_submitted?: number | null;
          updated_at?: string | null;
          username?: string | null;
          verification_level?: string | null;
        };
        Update: {
          anonymous_id?: string | null;
          ban_reason?: string | null;
          city?: string | null;
          clerk_user_id?: string | null;
          created_at?: string | null;
          email?: string | null;
          gender?: string | null;
          gender_preference?: string | null;
          id?: string;
          institution_type?: string | null;
          is_banned?: boolean | null;
          is_blocked?: boolean | null;
          last_active?: string | null;
          latitude?: number | null;
          location_address?: string | null;
          location_full_name?: string | null;
          location_name?: string | null;
          location_type?: string | null;
          location_updated_at?: string | null;
          longitude?: number | null;
          reputation_score?: number | null;
          state?: string | null;
          subscription_expires_at?: string | null;
          subscription_tier?: string | null;
          total_reviews_submitted?: number | null;
          updated_at?: string | null;
          username?: string | null;
          verification_level?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null;
          f_geography_column: unknown | null;
          f_table_catalog: unknown | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Relationships: [];
      };
      geometry_columns: {
        Row: {
          coord_dimension: number | null;
          f_geometry_column: unknown | null;
          f_table_catalog: string | null;
          f_table_name: unknown | null;
          f_table_schema: unknown | null;
          srid: number | null;
          type: string | null;
        };
        Insert: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Update: {
          coord_dimension?: number | null;
          f_geometry_column?: unknown | null;
          f_table_catalog?: string | null;
          f_table_name?: unknown | null;
          f_table_schema?: unknown | null;
          srid?: number | null;
          type?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string };
        Returns: undefined;
      };
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown };
        Returns: unknown;
      };
      _postgis_pgsql_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      _postgis_scripts_pgsql_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown };
        Returns: number;
      };
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_bestsrid: {
        Args: { "": unknown };
        Returns: number;
      };
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_coveredby: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_covers: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      _st_equals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_pointoutside: {
        Args: { "": unknown };
        Returns: unknown;
      };
      _st_sortablehash: {
        Args: { geom: unknown };
        Returns: number;
      };
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      _st_voronoi: {
        Args: {
          clip?: unknown;
          g1: unknown;
          return_polygons?: boolean;
          tolerance?: number;
        };
        Returns: unknown;
      };
      _st_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      addauth: {
        Args: { "": string };
        Returns: boolean;
      };
      addgeometrycolumn: {
        Args:
          | {
              catalog_name: string;
              column_name: string;
              new_dim: number;
              new_srid_in: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            }
          | {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              schema_name: string;
              table_name: string;
              use_typmod?: boolean;
            }
          | {
              column_name: string;
              new_dim: number;
              new_srid: number;
              new_type: string;
              table_name: string;
              use_typmod?: boolean;
            };
        Returns: string;
      };
      box: {
        Args: { "": unknown } | { "": unknown };
        Returns: unknown;
      };
      box2d: {
        Args: { "": unknown } | { "": unknown };
        Returns: unknown;
      };
      box2d_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box2d_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box2df_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box2df_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box3d: {
        Args: { "": unknown } | { "": unknown };
        Returns: unknown;
      };
      box3d_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box3d_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      box3dtobox: {
        Args: { "": unknown };
        Returns: unknown;
      };
      bytea: {
        Args: { "": unknown } | { "": unknown };
        Returns: string;
      };
      cleanup_expired_typing_indicators: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      cleanup_typing_indicators: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      create_notification: {
        Args: {
          p_body: string;
          p_data?: Json;
          p_title: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: string;
      };
      disablelongtransactions: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      dropgeometrycolumn: {
        Args:
          | {
              catalog_name: string;
              column_name: string;
              schema_name: string;
              table_name: string;
            }
          | { column_name: string; schema_name: string; table_name: string }
          | { column_name: string; table_name: string };
        Returns: string;
      };
      dropgeometrytable: {
        Args:
          | { catalog_name: string; schema_name: string; table_name: string }
          | { schema_name: string; table_name: string }
          | { table_name: string };
        Returns: string;
      };
      enablelongtransactions: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      equals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geography: {
        Args: { "": string } | { "": unknown };
        Returns: unknown;
      };
      geography_analyze: {
        Args: { "": unknown };
        Returns: boolean;
      };
      geography_gist_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geography_gist_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geography_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geography_send: {
        Args: { "": unknown };
        Returns: string;
      };
      geography_spgist_compress_nd: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geography_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      geography_typmod_out: {
        Args: { "": number };
        Returns: unknown;
      };
      geometry: {
        Args:
          | { "": string }
          | { "": string }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown }
          | { "": unknown };
        Returns: unknown;
      };
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_analyze: {
        Args: { "": unknown };
        Returns: boolean;
      };
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_gist_compress_2d: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_gist_compress_nd: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_gist_decompress_2d: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_gist_decompress_nd: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_gist_sortsupport_2d: {
        Args: { "": unknown };
        Returns: undefined;
      };
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_hash: {
        Args: { "": unknown };
        Returns: number;
      };
      geometry_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_recv: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometry_send: {
        Args: { "": unknown };
        Returns: string;
      };
      geometry_sortsupport: {
        Args: { "": unknown };
        Returns: undefined;
      };
      geometry_spgist_compress_2d: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_spgist_compress_3d: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_spgist_compress_nd: {
        Args: { "": unknown };
        Returns: unknown;
      };
      geometry_typmod_in: {
        Args: { "": unknown[] };
        Returns: number;
      };
      geometry_typmod_out: {
        Args: { "": number };
        Returns: unknown;
      };
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      geometrytype: {
        Args: { "": unknown } | { "": unknown };
        Returns: string;
      };
      geomfromewkb: {
        Args: { "": string };
        Returns: unknown;
      };
      geomfromewkt: {
        Args: { "": string };
        Returns: unknown;
      };
      get_comment_count: {
        Args: { review_id: string };
        Returns: number;
      };
      get_or_create_user_by_clerk_id: {
        Args: { p_clerk_user_id: string };
        Returns: {
          clerk_user_id: string;
          email: string;
          id: string;
          is_banned: boolean;
          reputation_score: number;
          subscription_tier: string;
          username: string;
          verification_level: string;
        }[];
      };
      get_proj4_from_srid: {
        Args: { "": number };
        Returns: string;
      };
      get_trending_names: {
        Args: { result_limit?: number };
        Returns: {
          count: number;
          name: string;
        }[];
      };
      gettransactionid: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      gidx_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gidx_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_compress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_decompress: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      gtrgm_options: {
        Args: { "": unknown };
        Returns: undefined;
      };
      gtrgm_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      increment_chat_message_likes: {
        Args: { message_id: string };
        Returns: undefined;
      };
      increment_report_count: {
        Args: { review_id: string };
        Returns: undefined;
      };
      increment_vote: {
        Args: { review_id: string; vote_type: string };
        Returns: undefined;
      };
      json: {
        Args: { "": unknown };
        Returns: Json;
      };
      jsonb: {
        Args: { "": unknown };
        Returns: Json;
      };
      longtransactionsenabled: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      path: {
        Args: { "": unknown };
        Returns: unknown;
      };
      pgis_asflatgeobuf_finalfn: {
        Args: { "": unknown };
        Returns: string;
      };
      pgis_asgeobuf_finalfn: {
        Args: { "": unknown };
        Returns: string;
      };
      pgis_asmvt_finalfn: {
        Args: { "": unknown };
        Returns: string;
      };
      pgis_asmvt_serialfn: {
        Args: { "": unknown };
        Returns: string;
      };
      pgis_geometry_clusterintersecting_finalfn: {
        Args: { "": unknown };
        Returns: unknown[];
      };
      pgis_geometry_clusterwithin_finalfn: {
        Args: { "": unknown };
        Returns: unknown[];
      };
      pgis_geometry_collect_finalfn: {
        Args: { "": unknown };
        Returns: unknown;
      };
      pgis_geometry_makeline_finalfn: {
        Args: { "": unknown };
        Returns: unknown;
      };
      pgis_geometry_polygonize_finalfn: {
        Args: { "": unknown };
        Returns: unknown;
      };
      pgis_geometry_union_parallel_finalfn: {
        Args: { "": unknown };
        Returns: unknown;
      };
      pgis_geometry_union_parallel_serialfn: {
        Args: { "": unknown };
        Returns: string;
      };
      point: {
        Args: { "": unknown };
        Returns: unknown;
      };
      polygon: {
        Args: { "": unknown };
        Returns: unknown;
      };
      populate_geometry_columns: {
        Args: { tbl_oid: unknown; use_typmod?: boolean } | { use_typmod?: boolean };
        Returns: string;
      };
      postgis_addbbox: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: number;
      };
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string };
        Returns: string;
      };
      postgis_dropbbox: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_extensions_upgrade: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_full_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_geos_noop: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_geos_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_getbbox: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_hasbbox: {
        Args: { "": unknown };
        Returns: boolean;
      };
      postgis_index_supportfn: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_lib_build_date: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_lib_revision: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_lib_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_libjson_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_liblwgeom_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_libprotobuf_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_libxml_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_noop: {
        Args: { "": unknown };
        Returns: unknown;
      };
      postgis_proj_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_scripts_build_date: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_scripts_installed: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_scripts_released: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_svn_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_type_name: {
        Args: {
          coord_dimension: number;
          geomname: string;
          use_new_name?: boolean;
        };
        Returns: string;
      };
      postgis_typmod_dims: {
        Args: { "": number };
        Returns: number;
      };
      postgis_typmod_srid: {
        Args: { "": number };
        Returns: number;
      };
      postgis_typmod_type: {
        Args: { "": number };
        Returns: string;
      };
      postgis_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      postgis_wagyu_version: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      set_limit: {
        Args: { "": number };
        Returns: number;
      };
      set_typing_status: {
        Args: { p_category: string; p_is_typing?: boolean };
        Returns: undefined;
      };
      show_limit: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      show_trgm: {
        Args: { "": string };
        Returns: string[];
      };
      spheroid_in: {
        Args: { "": unknown };
        Returns: unknown;
      };
      spheroid_out: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_3dlength: {
        Args: { "": unknown };
        Returns: number;
      };
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_3dperimeter: {
        Args: { "": unknown };
        Returns: number;
      };
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_angle: {
        Args: { line1: unknown; line2: unknown } | { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown };
        Returns: number;
      };
      st_area: {
        Args: { "": string } | { "": unknown } | { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_area2d: {
        Args: { "": unknown };
        Returns: number;
      };
      st_asbinary: {
        Args: { "": unknown } | { "": unknown };
        Returns: string;
      };
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number };
        Returns: string;
      };
      st_asewkb: {
        Args: { "": unknown };
        Returns: string;
      };
      st_asewkt: {
        Args: { "": string } | { "": unknown } | { "": unknown };
        Returns: string;
      };
      st_asgeojson: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; options?: number }
          | { geom: unknown; maxdecimaldigits?: number; options?: number }
          | {
              geom_column?: string;
              maxdecimaldigits?: number;
              pretty_bool?: boolean;
              r: Record<string, unknown>;
            };
        Returns: string;
      };
      st_asgml: {
        Args:
          | { "": string }
          | {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
            }
          | {
              geog: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            }
          | {
              geom: unknown;
              id?: string;
              maxdecimaldigits?: number;
              nprefix?: string;
              options?: number;
              version: number;
            }
          | { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_ashexewkb: {
        Args: { "": unknown };
        Returns: string;
      };
      st_askml: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
          | { geom: unknown; maxdecimaldigits?: number; nprefix?: string };
        Returns: string;
      };
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string };
        Returns: string;
      };
      st_asmarc21: {
        Args: { format?: string; geom: unknown };
        Returns: string;
      };
      st_asmvtgeom: {
        Args: {
          bounds: unknown;
          buffer?: number;
          clip_geom?: boolean;
          extent?: number;
          geom: unknown;
        };
        Returns: unknown;
      };
      st_assvg: {
        Args:
          | { "": string }
          | { geog: unknown; maxdecimaldigits?: number; rel?: number }
          | { geom: unknown; maxdecimaldigits?: number; rel?: number };
        Returns: string;
      };
      st_astext: {
        Args: { "": string } | { "": unknown } | { "": unknown };
        Returns: string;
      };
      st_astwkb: {
        Args:
          | {
              geom: unknown[];
              ids: number[];
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            }
          | {
              geom: unknown;
              prec?: number;
              prec_m?: number;
              prec_z?: number;
              with_boxes?: boolean;
              with_sizes?: boolean;
            };
        Returns: string;
      };
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number };
        Returns: string;
      };
      st_azimuth: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_boundary: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown };
        Returns: unknown;
      };
      st_buffer: {
        Args: { geom: unknown; options?: string; radius: number } | { geom: unknown; quadsegs: number; radius: number };
        Returns: unknown;
      };
      st_buildarea: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_centroid: {
        Args: { "": string } | { "": unknown };
        Returns: unknown;
      };
      st_cleangeometry: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown };
        Returns: unknown;
      };
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_clusterintersecting: {
        Args: { "": unknown[] };
        Returns: unknown[];
      };
      st_collect: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_collectionextract: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_collectionhomogenize: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean;
          param_geom: unknown;
          param_pctconvex: number;
        };
        Returns: unknown;
      };
      st_contains: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_convexhull: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_coorddim: {
        Args: { geometry: unknown };
        Returns: number;
      };
      st_coveredby: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_covers: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_crosses: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number };
        Returns: unknown;
      };
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_dimension: {
        Args: { "": unknown };
        Returns: number;
      };
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_distance: {
        Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean } | { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_distancesphere: {
        Args: { geom1: unknown; geom2: unknown } | { geom1: unknown; geom2: unknown; radius: number };
        Returns: number;
      };
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_dump: {
        Args: { "": unknown };
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][];
      };
      st_dumppoints: {
        Args: { "": unknown };
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][];
      };
      st_dumprings: {
        Args: { "": unknown };
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][];
      };
      st_dumpsegments: {
        Args: { "": unknown };
        Returns: Database["public"]["CompositeTypes"]["geometry_dump"][];
      };
      st_dwithin: {
        Args: {
          geog1: unknown;
          geog2: unknown;
          tolerance: number;
          use_spheroid?: boolean;
        };
        Returns: boolean;
      };
      st_endpoint: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_envelope: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_equals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_expand: {
        Args:
          | { box: unknown; dx: number; dy: number }
          | { box: unknown; dx: number; dy: number; dz?: number }
          | { dm?: number; dx: number; dy: number; dz?: number; geom: unknown };
        Returns: unknown;
      };
      st_exteriorring: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_flipcoordinates: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_force2d: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_force3d: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number };
        Returns: unknown;
      };
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number };
        Returns: unknown;
      };
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number };
        Returns: unknown;
      };
      st_forcecollection: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_forcecurve: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_forcepolygonccw: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_forcepolygoncw: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_forcerhr: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_forcesfs: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_generatepoints: {
        Args: { area: unknown; npoints: number } | { area: unknown; npoints: number; seed: number };
        Returns: unknown;
      };
      st_geogfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geogfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geographyfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geohash: {
        Args: { geog: unknown; maxchars?: number } | { geom: unknown; maxchars?: number };
        Returns: string;
      };
      st_geomcollfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomcollfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean;
          g: unknown;
          max_iter?: number;
          tolerance?: number;
        };
        Returns: unknown;
      };
      st_geometryfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geometrytype: {
        Args: { "": unknown };
        Returns: string;
      };
      st_geomfromewkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfromewkt: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfromgeojson: {
        Args: { "": Json } | { "": Json } | { "": string };
        Returns: unknown;
      };
      st_geomfromgml: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfromkml: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfrommarc21: {
        Args: { marc21xml: string };
        Returns: unknown;
      };
      st_geomfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfromtwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_geomfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_gmltosql: {
        Args: { "": string };
        Returns: unknown;
      };
      st_hasarc: {
        Args: { geometry: unknown };
        Returns: boolean;
      };
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_hexagongrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown };
        Returns: number;
      };
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_intersects: {
        Args: { geog1: unknown; geog2: unknown } | { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_isclosed: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_iscollection: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_isempty: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_ispolygonccw: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_ispolygoncw: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_isring: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_issimple: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_isvalid: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown };
        Returns: Database["public"]["CompositeTypes"]["valid_detail"];
      };
      st_isvalidreason: {
        Args: { "": unknown };
        Returns: string;
      };
      st_isvalidtrajectory: {
        Args: { "": unknown };
        Returns: boolean;
      };
      st_length: {
        Args: { "": string } | { "": unknown } | { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_length2d: {
        Args: { "": unknown };
        Returns: number;
      };
      st_letters: {
        Args: { font?: Json; letters: string };
        Returns: unknown;
      };
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown };
        Returns: number;
      };
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string };
        Returns: unknown;
      };
      st_linefrommultipoint: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_linefromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_linefromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_linemerge: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_linestringfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_linetocurve: {
        Args: { geometry: unknown };
        Returns: unknown;
      };
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number };
        Returns: unknown;
      };
      st_locatebetween: {
        Args: {
          frommeasure: number;
          geometry: unknown;
          leftrightoffset?: number;
          tomeasure: number;
        };
        Returns: unknown;
      };
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number };
        Returns: unknown;
      };
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_m: {
        Args: { "": unknown };
        Returns: number;
      };
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makeline: {
        Args: { "": unknown[] } | { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_makepolygon: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_makevalid: {
        Args: { "": unknown } | { geom: unknown; params: string };
        Returns: unknown;
      };
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: number;
      };
      st_maximuminscribedcircle: {
        Args: { "": unknown };
        Returns: Record<string, unknown>;
      };
      st_memsize: {
        Args: { "": unknown };
        Returns: number;
      };
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number };
        Returns: unknown;
      };
      st_minimumboundingradius: {
        Args: { "": unknown };
        Returns: Record<string, unknown>;
      };
      st_minimumclearance: {
        Args: { "": unknown };
        Returns: number;
      };
      st_minimumclearanceline: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_mlinefromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_mlinefromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_mpointfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_mpointfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_mpolyfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_mpolyfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multi: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_multilinefromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multilinestringfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multipointfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multipointfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multipolyfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_multipolygonfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_ndims: {
        Args: { "": unknown };
        Returns: number;
      };
      st_node: {
        Args: { g: unknown };
        Returns: unknown;
      };
      st_normalize: {
        Args: { geom: unknown };
        Returns: unknown;
      };
      st_npoints: {
        Args: { "": unknown };
        Returns: number;
      };
      st_nrings: {
        Args: { "": unknown };
        Returns: number;
      };
      st_numgeometries: {
        Args: { "": unknown };
        Returns: number;
      };
      st_numinteriorring: {
        Args: { "": unknown };
        Returns: number;
      };
      st_numinteriorrings: {
        Args: { "": unknown };
        Returns: number;
      };
      st_numpatches: {
        Args: { "": unknown };
        Returns: number;
      };
      st_numpoints: {
        Args: { "": unknown };
        Returns: number;
      };
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string };
        Returns: unknown;
      };
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_orientedenvelope: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_perimeter: {
        Args: { "": unknown } | { geog: unknown; use_spheroid?: boolean };
        Returns: number;
      };
      st_perimeter2d: {
        Args: { "": unknown };
        Returns: number;
      };
      st_pointfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_pointfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_pointm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
        };
        Returns: unknown;
      };
      st_pointonsurface: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_points: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_pointz: {
        Args: {
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_pointzm: {
        Args: {
          mcoordinate: number;
          srid?: number;
          xcoordinate: number;
          ycoordinate: number;
          zcoordinate: number;
        };
        Returns: unknown;
      };
      st_polyfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_polyfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_polygonfromtext: {
        Args: { "": string };
        Returns: unknown;
      };
      st_polygonfromwkb: {
        Args: { "": string };
        Returns: unknown;
      };
      st_polygonize: {
        Args: { "": unknown[] };
        Returns: unknown;
      };
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown };
        Returns: unknown;
      };
      st_quantizecoordinates: {
        Args: {
          g: unknown;
          prec_m?: number;
          prec_x: number;
          prec_y?: number;
          prec_z?: number;
        };
        Returns: unknown;
      };
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number };
        Returns: unknown;
      };
      st_relate: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: string;
      };
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_reverse: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number };
        Returns: unknown;
      };
      st_setsrid: {
        Args: { geog: unknown; srid: number } | { geom: unknown; srid: number };
        Returns: unknown;
      };
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_shiftlongitude: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number };
        Returns: unknown;
      };
      st_split: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number };
        Returns: unknown;
      };
      st_squaregrid: {
        Args: { bounds: unknown; size: number };
        Returns: Record<string, unknown>[];
      };
      st_srid: {
        Args: { geog: unknown } | { geom: unknown };
        Returns: number;
      };
      st_startpoint: {
        Args: { "": unknown };
        Returns: unknown;
      };
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number };
        Returns: unknown[];
      };
      st_summary: {
        Args: { "": unknown } | { "": unknown };
        Returns: string;
      };
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown };
        Returns: unknown;
      };
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number };
        Returns: unknown;
      };
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: unknown;
      };
      st_tileenvelope: {
        Args: {
          bounds?: unknown;
          margin?: number;
          x: number;
          y: number;
          zoom: number;
        };
        Returns: unknown;
      };
      st_touches: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_transform: {
        Args:
          | { from_proj: string; geom: unknown; to_proj: string }
          | { from_proj: string; geom: unknown; to_srid: number }
          | { geom: unknown; to_proj: string };
        Returns: unknown;
      };
      st_triangulatepolygon: {
        Args: { g1: unknown };
        Returns: unknown;
      };
      st_union: {
        Args:
          | { "": unknown[] }
          | { geom1: unknown; geom2: unknown }
          | { geom1: unknown; geom2: unknown; gridsize: number };
        Returns: unknown;
      };
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number };
        Returns: unknown;
      };
      st_within: {
        Args: { geom1: unknown; geom2: unknown };
        Returns: boolean;
      };
      st_wkbtosql: {
        Args: { wkb: string };
        Returns: unknown;
      };
      st_wkttosql: {
        Args: { "": string };
        Returns: unknown;
      };
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number };
        Returns: unknown;
      };
      st_x: {
        Args: { "": unknown };
        Returns: number;
      };
      st_xmax: {
        Args: { "": unknown };
        Returns: number;
      };
      st_xmin: {
        Args: { "": unknown };
        Returns: number;
      };
      st_y: {
        Args: { "": unknown };
        Returns: number;
      };
      st_ymax: {
        Args: { "": unknown };
        Returns: number;
      };
      st_ymin: {
        Args: { "": unknown };
        Returns: number;
      };
      st_z: {
        Args: { "": unknown };
        Returns: number;
      };
      st_zmax: {
        Args: { "": unknown };
        Returns: number;
      };
      st_zmflag: {
        Args: { "": unknown };
        Returns: number;
      };
      st_zmin: {
        Args: { "": unknown };
        Returns: number;
      };
      sync_user_from_clerk: {
        Args: {
          p_clerk_user_id: string;
          p_email?: string;
          p_first_name?: string;
          p_last_name?: string;
          p_username?: string;
        };
        Returns: string;
      };
      text: {
        Args: { "": unknown };
        Returns: string;
      };
      unaccent: {
        Args: { "": string };
        Returns: string;
      };
      unaccent_init: {
        Args: { "": unknown };
        Returns: unknown;
      };
      unlockrows: {
        Args: { "": string };
        Returns: number;
      };
      updategeometrysrid: {
        Args: {
          catalogn_name: string;
          column_name: string;
          new_srid_in: number;
          schema_name: string;
          table_name: string;
        };
        Returns: string;
      };
      upsert_user_session: {
        Args: {
          p_clerk_session_id: string;
          p_device_info?: Json;
          p_ip_address?: unknown;
          p_user_agent?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      vote_on_comment: {
        Args: { comment_id: string; vote_type: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null;
        geom: unknown | null;
      };
      valid_detail: {
        valid: boolean | null;
        reason: string | null;
        location: unknown | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
