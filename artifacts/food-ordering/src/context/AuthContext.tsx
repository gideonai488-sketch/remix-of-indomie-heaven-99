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
    password: string
  ): Promise<{ error: string | null }> => {
    const normalized = normalizePhone(phone);
    const fakeEmail = `${normalized.replace("+", "")}@speedup.app`;

    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password,
      options: { data: { full_name: name, phone: normalized } },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign up failed — please try again" };

    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      name: name.trim(),
      email: fakeEmail,
      phone: normalized,
      updated_at: new Date().toISOString(),
    });

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
    const cleaned = normalizePhone(phone);
    const variants = [cleaned, phone.trim()];
    let foundEmail: string | null = null;

    for (const variant of variants) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", variant)
        .maybeSingle();
      if (data?.email) { foundEmail = data.email; break; }
    }

    if (!foundEmail) {
      const fakeEmail = `${cleaned.replace("+", "")}@speedup.app`;
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", fakeEmail)
        .maybeSingle();
      if (data?.email) foundEmail = data.email;
    }

    if (!foundEmail && phone.includes("@")) foundEmail = phone.trim().toLowerCase();

    if (!foundEmail) {
      return { error: new Error("No account found with this phone number. Please sign up first.") };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: foundEmail, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  if (loading) return null;

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
