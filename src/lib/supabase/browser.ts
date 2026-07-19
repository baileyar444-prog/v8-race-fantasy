import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

const serverMock = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error("Supabase client is only available in the browser.") }),
    signUp: async () => ({ data: { user: null, session: null }, error: new Error("Supabase client is only available in the browser.") })
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        order: async () => ({ data: [], error: null })
      }),
      order: async () => ({ data: [], error: null })
    }),
    upsert: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
    update: () => ({ eq: async () => ({ data: null, error: null }), neq: async () => ({ data: null, error: null }) }),
    delete: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) })
  })
} as any;

export function createClient() {
  if (typeof window === "undefined") {
    return serverMock;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables. Check .env.local or Vercel Environment Variables.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
