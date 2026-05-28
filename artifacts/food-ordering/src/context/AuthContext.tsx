import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<{ error: Error | null }>;
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

    // Save name + phone + email to profiles
    await supabase.from("profiles").upsert({
      user_id: data.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      updated_at: new Date().toISOString(),
    });

    return { error: null };
  };

  // Legacy email login (kept for admin / internal use)
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  // Primary login: phone number → look up email → sign in
  const signInWithPhone = async (phone: string, password: string) => {
    const cleaned = phone.replace(/\s+/g, "").replace(/^0/, "+233");

    // Try exact phone match, then with leading 0 variant
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

    // Fallback: try treating phone directly as email (edge case)
    if (!foundEmail && phone.includes("@")) {
      foundEmail = phone.trim().toLowerCase();
    }

    if (!foundEmail) {
      return { error: new Error("No account found with this phone number. Please sign up first.") };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: foundEmail, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithPhone, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
