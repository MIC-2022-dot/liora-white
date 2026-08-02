// Supabase OAuth integration for Liora.
// Google OAuth is handled directly through Supabase Auth — no Lovable broker.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      const redirectTo =
        opts?.redirect_uri ?? (typeof window !== "undefined" ? window.location.origin : "");

      const oauthOptions: {
        redirectTo?: string;
        queryParams?: Record<string, string>;
      } = { redirectTo };

      if (opts?.extraParams) {
        oauthOptions.queryParams = opts.extraParams;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as "google",
        options: oauthOptions,
      });

      if (error) {
        return { error, redirected: false as const };
      }

      if (data?.url) {
        // Supabase returns a URL to redirect to for the OAuth flow.
        window.location.href = data.url;
        return { redirected: true as const, error: null };
      }

      return { redirected: false as const, error: null };
    },
  },
};
