// Simple test to verify Supabase connection
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "http://127.0.0.1:54321";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...");

  try {
    // Test basic REST API
    const { data, error } = await supabase.from("profiles").select("*").limit(1);

    if (error) {
      console.log("Error:", error.message);
      console.log("This might be normal if the table is empty or auth is not fully set up");
    } else {
      console.log("Success! Data:", data);
    }

    // Test auth status
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log("Auth error (expected for local dev):", authError.message);
    } else {
      console.log("Auth status:", authData);
    }
  } catch (err) {
    console.log("Connection failed:", err.message);
  }
}

testConnection();
