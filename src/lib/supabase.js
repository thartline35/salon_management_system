// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

// Your Supabase project credentials
const supabaseUrl = "https://jabhtokpixlmlxpgcdvj.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphYmh0b2twaXhsbWx4cGdjZHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjY2MTUsImV4cCI6MjA2NzQwMjYxNX0.u2rk4qkNsXBIK25VolI410bHz9Szns5yIPudm83vQvE";

// Validation before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

if (!supabaseUrl.startsWith("https://")) {
  throw new Error("Invalid Supabase URL format");
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth persistence for now
  },
});

// Test the client creation
console.log("✅ Supabase client created successfully");
console.log("📡 Connected to:", supabaseUrl);
