// Client-side fetch interceptor that attaches the Supabase bearer token
// to TanStack server function calls (`/_serverFn/...`). Without this,
// server fns protected by `requireSupabaseAuth` return 401 even when the
// user is logged in, because `useServerFn` issues plain fetches.
import { supabase } from "./client";

if (typeof window !== "undefined") {
  const w = window as unknown as { __lovableServerFnPatched?: boolean };
  if (!w.__lovableServerFnPatched) {
    w.__lovableServerFnPatched = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
          if (!headers.has("authorization")) {
            headers.set("authorization", `Bearer ${token}`);
          }
          return origFetch(input, { ...init, headers });
        }
      }
      return origFetch(input, init);
    };
  }
}

export {};
