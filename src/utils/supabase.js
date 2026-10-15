import { createClient } from '@supabase/supabase-js';

// Primary: Cloudflare Worker Proxy (bypasses BD mobile operator ISP blocks)
const PROXY_URL = 'https://super-butterfly-0e18.shapnerbathigar.workers.dev';
// Fallback: Direct Supabase backend
const DIRECT_URL = 'https://lrnarktcodrzmopwneew.supabase.co';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROXY_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybmFya3Rjb2Ryem1vcHduZWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDc0MTIsImV4cCI6MjEwNzYyMzQxMn0.rG0fpiC0txNSA86Nydk6DrT8QKFY0AzLF5bcP6yu-BQ';

let useDirectFallback = false;

// Custom fetch with automatic seamless failover:
// 1. Try Cloudflare Worker Proxy first (fast, Dhaka BDIX peering, unblocked on mobile data)
// 2. If Cloudflare Proxy ever fails/times out, instantly fetch directly from Supabase!
const customFetch = async (input, init) => {
  const isRequestInstance = typeof input === 'object' && input !== null && 'url' in input;
  const inputUrl = isRequestInstance ? input.url : String(input);

  // If proxy already failed previously in this session, route directly to Supabase
  if (useDirectFallback && inputUrl.includes(PROXY_URL)) {
    const fallbackUrl = inputUrl.replace(PROXY_URL, DIRECT_URL);
    return fetch(fallbackUrl, init);
  }

  try {
    const res = await fetch(input, init);
    // If Cloudflare returns a server/proxy error (e.g. 502, 503, 504, 520, etc.)
    if (!res.ok && res.status >= 500 && inputUrl.includes(PROXY_URL)) {
      throw new Error(`Cloudflare Proxy Error HTTP ${res.status}`);
    }
    return res;
  } catch (err) {
    if (inputUrl.includes(PROXY_URL)) {
      console.warn(`⚠️ Cloudflare Proxy unreachable (${err.message}). Seamlessly failing over to direct Supabase (${DIRECT_URL})...`);
      useDirectFallback = true;
      // Auto-retry Cloudflare proxy after 60 seconds
      setTimeout(() => { useDirectFallback = false; }, 60000);

      const fallbackUrl = inputUrl.replace(PROXY_URL, DIRECT_URL);
      return fetch(fallbackUrl, init);
    }
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: customFetch
  }
});
