import { createClient } from '@supabase/supabase-js';

// Primary: Cloudflare Worker Proxy (bypasses BD mobile operator ISP blocks)
const PROXY_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://eda.bronzemart2026.workers.dev').replace(/\/$/, '');
// Fallback: Direct Supabase backend
const DIRECT_URL = (import.meta.env.VITE_SUPABASE_FALLBACK_URL || 'https://fvzzdzeeawscbdzqznkr.supabase.co').replace(/\/$/, '');

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2enpkemVlYXdzY2JkenF6bmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjEyMzAsImV4cCI6MjEwNzYzNzIzMH0.g2LRYQbqV_E97WicbokypUbig9JqQDODdwqKMRozHQo';

let useDirectFallback = false;

// Custom fetch with automatic seamless failover:
// 1. Try Cloudflare Worker Proxy first (fast, Dhaka BDIX peering, unblocked on mobile data)
// 2. If Cloudflare Proxy fails, times out, or returns 5xx/429, instantly fetch directly from Supabase!
const customFetch = async (input, init = {}) => {
  const isRequestInstance = typeof input === 'object' && input !== null && 'url' in input;
  const inputUrl = isRequestInstance ? input.url : String(input);

  // If request is directed to the proxy
  if (inputUrl.startsWith(PROXY_URL)) {
    const fallbackUrl = inputUrl.replace(PROXY_URL, DIRECT_URL);

    // If already in fallback mode from a previous failure, skip proxy directly
    if (useDirectFallback) {
      if (isRequestInstance && typeof Request !== 'undefined' && input instanceof Request) {
        return fetch(new Request(fallbackUrl, input), init);
      }
      return fetch(fallbackUrl, init);
    }

    // Prepare inputs with body clone if needed
    let primaryInput = input;
    let fallbackInput = fallbackUrl;

    if (isRequestInstance && typeof Request !== 'undefined' && input instanceof Request) {
      try {
        primaryInput = input.clone();
        fallbackInput = new Request(fallbackUrl, input.clone());
      } catch {
        primaryInput = input;
        fallbackInput = fallbackUrl;
      }
    }

    // Try Primary Worker first with a 7-second timeout
    try {
      let timeoutId;
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let signal = init?.signal;

      if (controller && !signal) {
        timeoutId = setTimeout(() => controller.abort('Worker timeout'), 7000);
        signal = controller.signal;
      }

      const res = await fetch(primaryInput, { ...init, signal });
      if (timeoutId) clearTimeout(timeoutId);

      // Cloudflare worker error or rate limit
      if (!res.ok && (res.status >= 500 || res.status === 429)) {
        throw new Error(`Cloudflare Proxy Error HTTP ${res.status}`);
      }

      return res;
    } catch (err) {
      console.warn(`⚠️ Cloudflare Worker failed (${err.message}). Seamlessly failing over to direct Supabase (${DIRECT_URL})...`);
      useDirectFallback = true;
      // Auto-retry Cloudflare proxy after 60 seconds
      setTimeout(() => { useDirectFallback = false; }, 60000);

      return fetch(fallbackInput, init);
    }
  }

  // Any other URL just runs standard fetch
  return fetch(input, init);
};

export const supabase = createClient(PROXY_URL, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: customFetch
  }
});

// Isolated client with no session persistence (useful for admin creating new users without getting logged out)
export const createIsolatedAuthClient = () => {
  return createClient(PROXY_URL, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      fetch: customFetch
    }
  });
};

