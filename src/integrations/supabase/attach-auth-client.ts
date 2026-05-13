// Client-side middleware that attaches the Supabase bearer token to
// outgoing server-fn requests. Pair with `requireSupabaseAuth` on the server.
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  },
);
