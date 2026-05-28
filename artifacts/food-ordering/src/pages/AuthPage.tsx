import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye, EyeOff, ArrowLeft, Lock, Phone, User, CheckCircle2, KeyRound, Mail,
} from "lucide-react";

const InputField = ({
  label, placeholder, value, onChange, type = "text", icon: Icon,
  showToggle, onToggle, autoComplete, maxLength,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; icon: React.ElementType; showToggle?: boolean; onToggle?: () => void;
  autoComplete?: string; maxLength?: number;
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
        maxLength={maxLength}
        className="w-full rounded-2xl border border-border bg-gray-50 py-3.5 pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
      />
      {showToggle && onToggle && (
        <button type="button" onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
        >
          {type === "password" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      )}
    </div>
  </div>
);

type SignupStep = "details" | "otp";

const AuthPage = () => {
  const { signUpWithPhone, sendOtp, verifyOtp, signInWithPhone } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Login fields
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup — two-step: details first, then OTP
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");

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

  // Step 1: collect all details → create account → send OTP
  const handleCreateAndSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) { toast.error("Enter your full name"); return; }
    if (!signupEmail.trim() || !signupEmail.includes("@")) { toast.error("Enter a valid email"); return; }
    if (!signupPhone.trim()) { toast.error("Enter your phone number"); return; }
    if (signupPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (signupPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    // Create auth account first
    const { error: signupErr } = await signUpWithPhone(
      signupName.trim(), signupPhone.trim(), signupPassword, signupEmail.trim()
    );
    if (signupErr) { toast.error(signupErr); setLoading(false); return; }

    // Then send OTP to verify phone
    const { error: otpErr } = await sendOtp(signupPhone.trim());
    if (otpErr) {
      // Account created but OTP failed — still let them in
      toast.success("Account created! Signing you in…");
      const { error: loginErr } = await signInWithPhone(signupPhone.trim(), signupPassword);
      if (!loginErr) navigate(searchParams.get("redirect") || "/");
      setLoading(false);
      return;
    }

    toast.success("Account created! Check your SMS for a verification code.");
    setSignupStep("otp");
    setLoading(false);
  };

  // Step 2: verify OTP → sign in
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 4) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    const { error } = await verifyOtp(signupPhone.trim(), otpCode.trim());
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
    toast.success("Phone verified! Signing you in… 🎉");
    const { error: loginErr } = await signInWithPhone(signupPhone.trim(), signupPassword);
    if (!loginErr) {
      navigate(searchParams.get("redirect") || "/");
    } else {
      setTab("login");
      toast("Verified! Please sign in.");
    }
    setLoading(false);
  };

  const resetSignup = () => {
    setSignupStep("details");
    setSignupName("");
    setSignupEmail("");
    setSignupPhone("");
    setSignupPassword("");
    setConfirmPassword("");
    setOtpCode("");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-red-700 pb-20 pt-8">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5" />
        <div className="relative container mx-auto px-6">
          <button onClick={() => navigate("/")}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <img src="/owl-icon.png" alt="SpeedUp" className="h-12 w-12 rounded-2xl object-cover shadow-lg" />
            <div>
              <h1 className="font-display text-2xl font-black text-white">SpeedUp</h1>
              <p className="text-sm text-white/70">
                {tab === "login" ? "Sign in to your account" : "Create your account"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto -mt-10 max-w-sm flex-1 px-4 pb-12">
        <div className="rounded-3xl bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); resetSignup(); }}
                className={`flex flex-1 items-center justify-center py-4 text-sm font-bold transition-colors ${
                  tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* -------- LOGIN -------- */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField label="Phone Number" placeholder="+1 XXX XXX XXXX" value={loginPhone}
                  onChange={setLoginPhone} type="tel" icon={Phone} autoComplete="tel"
                />
                <InputField label="Password" placeholder="Your password" value={loginPassword}
                  onChange={setLoginPassword} type={showPassword ? "text" : "password"}
                  icon={Lock} showToggle onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="current-password"
                />
                <Button type="submit" disabled={loading}
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

            {/* -------- SIGNUP: STEP 1 — ALL DETAILS -------- */}
            {tab === "signup" && signupStep === "details" && (
              <form onSubmit={handleCreateAndSendOtp} className="space-y-4">
                <div className="mb-2 rounded-2xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-primary mb-0.5">Step 1 of 2 — Create Account</p>
                  Fill in your details. We'll verify your phone number next.
                </div>
                <InputField label="Full Name" placeholder="e.g. Alex Johnson" value={signupName}
                  onChange={setSignupName} icon={User} autoComplete="name"
                />
                <InputField label="Email Address" placeholder="you@example.com" value={signupEmail}
                  onChange={setSignupEmail} type="email" icon={Mail} autoComplete="email"
                />
                <InputField label="Phone Number" placeholder="+1 XXX XXX XXXX" value={signupPhone}
                  onChange={setSignupPhone} type="tel" icon={Phone} autoComplete="tel"
                />
                <InputField label="Password" placeholder="Min. 6 characters" value={signupPassword}
                  onChange={setSignupPassword} type={showPassword ? "text" : "password"}
                  icon={Lock} showToggle onToggle={() => setShowPassword(!showPassword)}
                  autoComplete="new-password"
                />
                <InputField label="Confirm Password" placeholder="Re-enter your password" value={confirmPassword}
                  onChange={setConfirmPassword} type={showConfirm ? "text" : "password"}
                  icon={Lock} showToggle onToggle={() => setShowConfirm(!showConfirm)}
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating account…
                    </span>
                  ) : "Create Account →"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" onClick={() => setTab("login")} className="font-bold text-primary hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            )}

            {/* -------- SIGNUP: STEP 2 — VERIFY PHONE -------- */}
            {tab === "signup" && signupStep === "otp" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="mb-2 rounded-2xl bg-green-50 border border-green-200 p-3 text-xs text-green-700">
                  <p className="font-semibold mb-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Step 2 of 2 — Verify Phone
                  </p>
                  Account created! Enter the 6-digit code sent to{" "}
                  <span className="font-bold text-green-800">{signupPhone}</span>. Expires in 10 min.
                </div>
                <InputField label="6-Digit Code" placeholder="123456" value={otpCode}
                  onChange={setOtpCode} type="number" icon={KeyRound}
                  autoComplete="one-time-code" maxLength={6}
                />
                <Button type="submit" disabled={loading}
                  className="mt-2 w-full rounded-2xl bg-primary py-6 text-base font-bold text-white shadow-warm hover:scale-[1.01] active:scale-95 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Verifying…
                    </span>
                  ) : "Verify & Sign In ⚡"}
                </Button>
                <button type="button" onClick={() => setSignupStep("details")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary"
                >
                  ← Back to edit details
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to SpeedUp's Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
