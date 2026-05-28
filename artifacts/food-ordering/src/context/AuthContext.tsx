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
  signUpWithPhone: (name: string, phone: string, password: string) => Promise<{ error: string | null }>;
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const normalizePhone = (phone: string) =>
    phone.replace(/\s+/g, "").replace(/^0/, "+233");

  const sendOtp = async (phone: string): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.functions.invoke("send-otp", {
      body: { phone: normalized },
    });
    if (error) return { error: error.message || "Failed to send OTP" };
    return { error: null };
  };

  const verifyOtp = async (phone: string, code: string): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    const { error } = await supabase.functions.invoke("verify-otp", {
      body: { phone: normalized, code },
    });
    if (error) return { error: error.message || "Invalid or expired code" };
    return { error: null };
  };

  const signUpWithPhone = async (
    name: string,
    phone: string,
    password: string,
    email?: string
  ): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    const authEmail = email?.trim().toLowerCase() || `${normalized.replace("+", "")}@speedup.app`;

    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password,
      options: { data: { full_name: name, phone: normalized } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign up failed — please try again" };

    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      name: name.trim(),
      email: authEmail,
      phone: normalized,
      updated_at: new Date().toISOString(),
    });

    // Mark phone as verified post-signup
    await supabase.functions.invoke("verify-otp", {
      body: { phone: normalized, code: "__post_signup__" },
    }).catch(() => {});

    return { error: null };
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
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
    });
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithPhone = async (phone: string, password: string) => {
    const input = phone.trim();

    // If user typed their email directly, use it
    if (input.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: input.toLowerCase(), password });
      return { error: error ? new Error(error.message) : null };
    }

    const cleaned = normalizePhone(input);
    const syntheticEmail = `${cleaned.replace("+", "")}@speedup.app`;

    // Try the synthetic email first (works for phone-only accounts, no DB lookup needed)
    const { error: syntheticErr } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });
    if (!syntheticErr) return { error: null };

    // If it's a credentials error the account used a real email — try profiles lookup
    // (only works if RLS allows it; may return empty if not)
    if (syntheticErr.message?.toLowerCase().includes("invalid")) {
      const variants = [cleaned, input];
      for (const variant of variants) {
        const { data } = await supabase
          .from("profiles")
          .select("email")
          .eq("phone", variant)
          .maybeSingle();
        if (data?.email && data.email !== syntheticEmail) {
          const { error } = await supabase.auth.signInWithPassword({ email: data.email, password });
          return { error: error ? new Error(error.message) : null };
        }
      }
      return { error: new Error("Wrong password. Try again.") };
    }

    // Account not found — guide them to use email
    return { error: new Error("Account not found. If you signed up with an email, use that to sign in.") };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

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
