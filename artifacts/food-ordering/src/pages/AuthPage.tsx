import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye, EyeOff, ArrowLeft, Lock, Phone, User, Mail, CheckCircle2,
} from "lucide-react";

const InputField = ({
  label, placeholder, value, onChange, type = "text", icon: Icon,
  showToggle, onToggle, autoComplete,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; icon: React.ElementType; showToggle?: boolean; onToggle?: () => void;
  autoComplete?: string;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-border bg-gray-50 py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      {showToggle && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
        >
          {type === "password" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

const AuthPage = () => {
  const { signUp, signInWithPhone } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  // Login fields
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign up fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (!loginPassword.trim()) { toast.error("Enter your password"); return; }
    setLoading(true);
    const { error } = await signInWithPhone(loginPhone.trim(), loginPassword);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Welcome back! 🏍️");
      navigate(searchParams.get("redirect") || "/");
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Enter your full name"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("Enter a valid email"); return; }
    if (!signupPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (signupPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (signupPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    const { error } = await signUp(name, email, signupPhone, signupPassword);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top decoration */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-red-700 pb-20 pt-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative container mx-auto px-6">
          <button
            onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-3">
            <img src="/owl-icon.png" alt="SpeedUp" className="h-12 w-12 rounded-2xl object-cover shadow-lg" />
            <div>
              <h1 className="font-display text-2xl font-black text-white">
                SpeedUp
              </h1>
              <p className="text-sm text-white/70">
                {tab === "login" ? "Sign in to your account" : "Create your account"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="container mx-auto -mt-10 max-w-sm flex-1 px-4 pb-12">
        <div className="rounded-3xl bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex flex-1 items-center justify-center py-4 text-sm font-bold transition-colors ${
                  tab === t
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* -------- LOGIN FORM -------- */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="Phone Number"
                  placeholder="024 XXX XXXX"
                  value={loginPhone}
                  onChange={setLoginPhone}
                  type="tel"
                  icon={Phone}
                  autoComplete="tel"
                />
                <InputField
                  label="Password"
                  placeholder="Your password"
                  value={loginPassword}
                  onChange={setLoginPassword}
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="current-password"
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Signing in…
                    </span>
                  ) : "Sign In 🏍️"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <button type="button" onClick={() => setTab("signup")} className="font-bold text-primary hover:underline">
                    Sign up free
                  </button>
                </p>
              </form>
            )}

            {/* -------- SIGN UP FORM -------- */}
            {tab === "signup" && !done && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <InputField
                  label="Full Name"
                  placeholder="e.g. Kwame Asante"
                  value={name}
                  onChange={setName}
                  icon={User}
                  autoComplete="name"
                />
                <InputField
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={setEmail}
                  type="email"
                  icon={Mail}
                  autoComplete="email"
                />
                <InputField
                  label="Phone Number"
                  placeholder="024 XXX XXXX"
                  value={signupPhone}
                  onChange={setSignupPhone}
                  type="tel"
                  icon={Phone}
                  autoComplete="tel"
                />
                <InputField
                  label="Password"
                  placeholder="Min. 6 characters"
                  value={signupPassword}
                  onChange={setSignupPassword}
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  showToggle
                  onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="new-password"
                />
                <InputField
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  type={showConfirm ? "text" : "password"}
                  icon={Lock}
                  showToggle
                  onToggle={() => setShowConfirm(!showConfirm)}
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating account…
                    </span>
                  ) : "Create Account ⚡"}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setTab("login")} className="font-bold text-primary hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* -------- SIGN UP SUCCESS -------- */}
            {tab === "signup" && done && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-black text-foreground">Account Created! 🎉</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Check your email inbox for a confirmation link, then come back to sign in.
                </p>
                <div className="mt-4 w-full rounded-2xl bg-primary/5 border border-primary/20 p-4 text-left text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-primary">Next steps:</p>
                  <p>1. Open your email and click the confirmation link</p>
                  <p>2. Return here and sign in with your phone number</p>
                </div>
                <Button
                  onClick={() => { setDone(false); setTab("login"); }}
                  className="mt-6 w-full rounded-2xl bg-primary py-5 font-bold text-white shadow-warm"
                >
                  Go to Sign In
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Branding footer */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to SpeedUp's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
