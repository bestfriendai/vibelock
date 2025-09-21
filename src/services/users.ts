import { supabase } from "../config/supabase";
import { User, UserProfile } from "../types";
import { mapFieldsToCamelCase, mapFieldsToSnakeCase } from "../utils/fieldMapping";
import { withRetry } from "../utils/retryLogic";

export class UsersService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    return withRetry(async () => {
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return mapFieldsToCamelCase(data);
    });
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const snakeCaseUpdates = mapFieldsToSnakeCase(updates);

    const { data, error } = await supabase.from("users").update(snakeCaseUpdates).eq("id", userId).select().single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async createProfile(profile: Omit<UserProfile, "createdAt" | "updatedAt">): Promise<UserProfile> {
    const snakeCaseProfile = mapFieldsToSnakeCase(profile);

    const { data, error } = await supabase.from("users").insert(snakeCaseProfile).select().single();

    if (error) throw error;
    return mapFieldsToCamelCase(data);
  }

  async searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapFieldsToCamelCase);
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (error) throw error;
    return !data;
  }

  async getFollowers(userId: string, limit: number = 50): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("follows")
      .select("follower:users!follows_follower_id_fkey(*)")
      .eq("following_id", userId)
      .limit(limit);

    if (error) throw error;
    return (data || []).map((item) => mapFieldsToCamelCase(item.follower));
  }

  async getFollowing(userId: string, limit: number = 50): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("follows")
      .select("following:users!follows_following_id_fkey(*)")
      .eq("follower_id", userId)
      .limit(limit);

    if (error) throw error;
    return (data || []).map((item) => mapFieldsToCamelCase(item.following));
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase.from("follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error && !error.message.includes("duplicate")) throw error;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);

    if (error) throw error;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase.from("user_blocks").insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    });

    if (error && !error.message.includes("duplicate")) throw error;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);

    if (error) throw error;
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const { data, error } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId);

    if (error) throw error;
    return (data || []).map((item) => item.blocked_id);
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

    return data.publicUrl;
  }
}

export const usersService = new UsersService();
