import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://super-butterfly-0e18.shapnerbathigar.workers.dev';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybmFya3Rjb2Ryem1vcHduZWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDc0MTIsImV4cCI6MjEwNzYyMzQxMn0.rG0fpiC0txNSA86Nydk6DrT8QKFY0AzLF5bcP6yu-BQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
