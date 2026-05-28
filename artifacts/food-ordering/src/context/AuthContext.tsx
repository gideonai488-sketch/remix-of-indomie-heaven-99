import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, code: string) => Promise<{ error: string | null }>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPhone: (name: string, phone: string, password: string, email?: string) => Promise<{ error: string | null; needsEmailConfirm?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let settled = false;

    const settle = (s: Session | null) => {
      if (!settled) settled = true;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // Safety timeout — if Supabase never fires (e.g. broken stored session),
    // force loading=false after 6 s so the app doesn't stay on a white screen.
    const fallback = setTimeout(() => {
      if (!settled) {
        console.warn("[Auth] session init timed out — clearing stored auth");
        supabase.auth.signOut().catch(() => {});
        settle(null);
      }
    }, 6000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      clearTimeout(fallback);
      settle(s);
    });

    // getSession is also a reliable path on cold start
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        clearTimeout(fallback);
        settle(s);
      })
      .catch(() => {
        // Corrupted storage — wipe and continue
        supabase.auth.signOut().catch(() => {});
        settle(null);
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  const normalizePhone = (phone: string) =>
    phone.replace(/\s+/g, "").replace(/^0/, "+233");

  const sendOtp = async (phone: string): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    try {
      const { error } = await supabase.functions.invoke("send-otp", {
        body: { phone: normalized },
      });
      if (error) return { error: error.message || "Failed to send OTP" };
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || "Failed to send OTP" };
    }
  };

  const verifyOtp = async (phone: string, code: string): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    try {
      const { error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: normalized, code },
      });
      if (error) return { error: error.message || "Invalid or expired code" };
      return { error: null };
    } catch (e: any) {
      return { error: e?.message || "Invalid or expired code" };
    }
  };

  const signUpWithPhone = async (
    name: string,
    phone: string,
    password: string,
    email?: string
  ): Promise<{ error: string | null; needsEmailConfirm?: boolean }> => {
    const normalized = normalizePhone(phone);
    const authEmail = email?.trim().toLowerCase() || `${normalized.replace("+", "")}@speedup.app`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: { data: { full_name: name, phone: normalized } },
      });
      if (error) return { error: error.message };
      if (!data.user) return { error: "Sign up failed — please try again" };

      // Persist profile
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        name: name.trim(),
        email: authEmail,
        phone: normalized,
        updated_at: new Date().toISOString(),
      }).catch(() => {});

      // If session is null, Supabase requires email confirmation
      if (!data.session) {
        return { error: null, needsEmailConfirm: true };
      }

      return { error: null, needsEmailConfirm: false };
    } catch (e: any) {
      return { error: e?.message || "Sign up failed — please try again" };
    }
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
        },
      });
      if (error) return { error: new Error(error.message) };
      if (!data.user) return { error: new Error("Sign up failed — please try again") };
      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        updated_at: new Date().toISOString(),
      }).catch(() => {});
      return { error: null };
    } catch (e: any) {
      return { error: new Error(e?.message || "Sign up failed") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (e: any) {
      return { error: new Error(e?.message || "Sign in failed") };
    }
  };

  const signInWithPhone = async (phone: string, password: string) => {
    const input = phone.trim();

    const trySignIn = async (email: string): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) return { error: null };
        if (
          error.message?.toLowerCase().includes("not confirmed") ||
          error.message?.toLowerCase().includes("email_not_confirmed")
        ) {
          return { error: new Error("Account not confirmed. In Supabase → Authentication → Email, disable 'Confirm email', then try again.") };
        }
        return { error: new Error(error.message) };
      } catch (e: any) {
        return { error: new Error(e?.message || "Sign in failed") };
      }
    };

    // User typed an email directly
    if (input.includes("@")) {
      return trySignIn(input.toLowerCase());
    }

    const cleaned = normalizePhone(input);
    const syntheticEmail = `${cleaned.replace("+", "")}@speedup.app`;

    const { error: syntheticErr } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password });
    if (!syntheticErr) return { error: null };

    if (
      syntheticErr.message?.toLowerCase().includes("not confirmed") ||
      syntheticErr.message?.toLowerCase().includes("email_not_confirmed")
    ) {
      return { error: new Error("Account not confirmed. In Supabase → Authentication → Email, disable 'Confirm email', then try again.") };
    }

    if (syntheticErr.message?.toLowerCase().includes("invalid")) {
      // Try to find a real email from profiles
      for (const variant of [cleaned, input]) {
        const { data } = await supabase
          .from("profiles")
          .select("email")
          .eq("phone", variant)
          .maybeSingle();
        if (data?.email && data.email !== syntheticEmail) {
          return trySignIn(data.email);
        }
      }
      return { error: new Error("Wrong password. Try again.") };
    }

    return { error: new Error("Account not found. If you signed up with an email, enter that instead.") };
  };

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, sendOtp, verifyOtp, signUp, signUpWithPhone, signIn, signInWithPhone, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
