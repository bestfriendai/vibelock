import supabase from "../config/supabase";

export async function getLocalizedProfile(userId: string, locale: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).eq("locale", locale).single();

  if (error) throw error;
  return data;
}
