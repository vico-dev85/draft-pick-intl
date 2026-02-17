import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, UserPlus, Eye, EyeOff, Mail, ChevronDown } from "lucide-react";

interface InviteResult {
  success: boolean;
  player_id?: string;
  player_name?: string;
  club_name?: string;
}

interface PeekResult {
  player_name: string;
  club_name: string;
}

type Status = "loading" | "invite-preview" | "email-confirmation-pending" | "accepting" | "success" | "error";

const formSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});
type FormData = z.infer<typeof formSchema>;

type EmailTab = "signup" | "login";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signIn, signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [peekData, setPeekData] = useState<PeekResult | null>(null);
  const [inviteData, setInviteData] = useState<{ playerName?: string; clubName?: string } | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTab, setEmailTab] = useState<EmailTab>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  // Store token in both sessionStorage and localStorage for cross-tab survival
  useEffect(() => {
    if (token) {
      sessionStorage.setItem("pendingInviteToken", token);
      localStorage.setItem("pendingInviteToken", token);
    }
  }, [token]);

  // Peek at invite data on mount
  useEffect(() => {
    const inviteToken = token || sessionStorage.getItem("pendingInviteToken") || localStorage.getItem("pendingInviteToken");
    if (!inviteToken) {
      setError("קישור הזמנה חסר");
      setStatus("error");
      return;
    }

    const peekAtInvite = async () => {
      try {
        const { data, error } = await supabase.rpc("peek_invite", {
          p_token: inviteToken,
        });

        if (error) {
          // If RPC doesn't exist yet (404) or other error, fall back to generic greeting
          // The invite will still be validated when accept_player_invite is called
          const is404 = error.message?.includes("404") || (error as any)?.code === "PGRST202";
          if (!is404) {
            // Real error (not just missing RPC) — but still allow proceeding
            console.warn("peek_invite error (non-blocking):", error.message);
          }
          // Show generic invite-preview without personalized data
          if (user) {
            handleAcceptInvite();
          } else {
            setStatus("invite-preview");
          }
          return;
        }

        if (data && (!Array.isArray(data) || data.length > 0)) {
          const result = Array.isArray(data) ? data[0] : data;
          setPeekData({ player_name: result.player_name, club_name: result.club_name });
        }

        // If user is already authenticated, auto-accept immediately
        if (user) {
          handleAcceptInvite();
        } else {
          setStatus("invite-preview");
        }
      } catch {
        // Network error or other — still allow proceeding with generic greeting
        console.warn("peek_invite failed (non-blocking)");
        if (user) {
          handleAcceptInvite();
        } else {
          setStatus("invite-preview");
        }
      }
    };

    if (!authLoading) {
      peekAtInvite();
    }
  }, [authLoading, token, user]);

  // When user becomes authenticated while on invite-preview, auto-accept
  useEffect(() => {
    if (user && status === "invite-preview") {
      handleAcceptInvite();
    }
  }, [user, status]);

  const handleAcceptInvite = async () => {
    const inviteToken = token || sessionStorage.getItem("pendingInviteToken") || localStorage.getItem("pendingInviteToken");

    if (!inviteToken) {
      setError("קישור הזמנה חסר");
      setStatus("error");
      return;
    }

    setStatus("accepting");

    try {
      const { data, error } = await supabase.rpc("accept_player_invite", {
        p_token: inviteToken,
      }) as { data: InviteResult | null; error: Error | null };

      if (error) {
        if (error.message.includes("expired")) {
          setError("תוקף ההזמנה פג. בקש הזמנה חדשה מהמארגן.");
        } else if (error.message.includes("already linked")) {
          setError("השחקן הזה כבר מקושר לחשבון אחר.");
        } else if (error.message.includes("Invalid")) {
          setError("קישור הזמנה לא תקין.");
        } else {
          setError(error.message);
        }
        setStatus("error");
        return;
      }

      if (data?.success) {
        // Clear the pending token from both storages
        sessionStorage.removeItem("pendingInviteToken");
        localStorage.removeItem("pendingInviteToken");

        setInviteData({
          playerName: data.player_name,
          clubName: data.club_name,
        });
        setStatus("success");

        toast({
          title: "הצטרפת בהצלחה!",
          description: `מחובר כ-${data.player_name}`,
        });
      } else {
        setError("משהו השתבש. נסה שוב.");
        setStatus("error");
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      setError("שגיאה בקבלת ההזמנה");
      setStatus("error");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const inviteToken = token || sessionStorage.getItem("pendingInviteToken") || localStorage.getItem("pendingInviteToken");
    if (inviteToken) {
      sessionStorage.setItem("pendingInviteToken", inviteToken);
      localStorage.setItem("pendingInviteToken", inviteToken);
    }
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "שגיאה בהתחברות",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const inviteToken = token || sessionStorage.getItem("pendingInviteToken") || localStorage.getItem("pendingInviteToken");

    try {
      if (emailTab === "signup") {
        // Build redirect URL that includes the invite token
        const redirectUrl = `${window.location.origin}/#/accept-invite?token=${encodeURIComponent(inviteToken || "")}`;
        const { error } = await signUp(data.email, data.password, redirectUrl);
        if (error) {
          const isAlreadyRegistered = error.message.includes("User already registered");
          toast({
            title: "שגיאה בהרשמה",
            description: getErrorMessage(error.message),
            variant: "destructive",
          });
          if (isAlreadyRegistered) {
            setEmailTab("login");
          }
        } else {
          setStatus("email-confirmation-pending");
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast({
            title: "שגיאה בהתחברות",
            description: getErrorMessage(error.message),
            variant: "destructive",
          });
        }
        // If login succeeds, the auth state change will trigger auto-accept
      }
    } catch {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getErrorMessage = (message: string): string => {
    if (message.includes("Invalid login credentials")) {
      return "אימייל או סיסמה שגויים";
    }
    if (message.includes("User already registered")) {
      return "משתמש עם אימייל זה כבר קיים. נסה להתחבר.";
    }
    if (message.includes("Email not confirmed")) {
      return "האימייל לא אומת";
    }
    if (message.includes("Password")) {
      return "הסיסמה חייבת להכיל לפחות 6 תווים";
    }
    return message;
  };

  // Auto-navigate to dashboard after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => navigate("/dashboard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  // Loading states
  if (authLoading || status === "loading" || status === "accepting") {
    return (
      <div className="min-h-screen bg-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/70">
            {status === "accepting" ? "מצטרף לקבוצה..." : "טוען..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="kohot.online" className="h-12 w-auto mx-auto mb-2" />
          </div>

          {/* Invite Preview — Main auth screen */}
          {status === "invite-preview" && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center" dir="rtl">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-emerald-400" />
              </div>

              {/* Personalized or generic greeting */}
              <h2 className="text-xl font-bold text-white mb-1">
                {peekData?.player_name ? `היי ${peekData.player_name}!` : "הוזמנת להצטרף!"}
              </h2>
              <p className="text-white/70 mb-6">
                {peekData?.club_name
                  ? <>הוזמנת להצטרף ל-<span className="text-emerald-400 font-bold">{peekData.club_name}</span></>
                  : "התחבר כדי להצטרף לקבוצה"}
              </p>

              {/* Google OAuth — Primary */}
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full h-12 bg-white hover:bg-white/90 text-gray-700 font-medium"
                  disabled={googleLoading}
                  onClick={handleGoogleSignIn}
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      המשך עם Google
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">או</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email toggle */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(!showEmailForm)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span>המשך עם אימייל</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showEmailForm ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Inline Email Form */}
              {showEmailForm && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {/* Signup / Login tabs */}
                  <div className="flex mb-4 bg-white/5 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setEmailTab("signup")}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        emailTab === "signup"
                          ? "bg-emerald-500 text-white"
                          : "text-white/50 hover:text-white/70"
                      }`}
                    >
                      הרשמה
                    </button>
                    <button
                      type="button"
                      onClick={() => setEmailTab("login")}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        emailTab === "login"
                          ? "bg-emerald-500 text-white"
                          : "text-white/50 hover:text-white/70"
                      }`}
                    >
                      כניסה
                    </button>
                  </div>

                  <form onSubmit={form.handleSubmit(handleEmailSubmit)} className="space-y-4" noValidate>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">
                        אימייל
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        dir="ltr"
                        className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400/20"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-red-400 text-sm">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white/80">
                        סיסמה
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••"
                          dir="ltr"
                          className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400/20 pl-12"
                          {...form.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {form.formState.errors.password && (
                        <p className="text-red-400 text-sm">
                          {form.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : emailTab === "signup" ? (
                        "צור חשבון והצטרף"
                      ) : (
                        "התחבר והצטרף"
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Email Confirmation Pending */}
          {status === "email-confirmation-pending" && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center" dir="rtl">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">בדוק את האימייל שלך</h2>
              <p className="text-white/70 mb-2">
                שלחנו קישור אימות לכתובת שהזנת.
              </p>
              <p className="text-white/50 text-sm mb-4">
                {peekData?.club_name
                  ? <>לחץ על הקישור באימייל כדי להשלים את ההרשמה ולהצטרף ל-<span className="text-emerald-400">{peekData.club_name}</span>.</>
                  : "לחץ על הקישור באימייל כדי להשלים את ההרשמה ולהצטרף לקבוצה."}
              </p>
              <div className="bg-white/5 rounded-lg p-3 text-sm text-white/50 mb-4">
                לא קיבלת? בדוק בתיקיית הספאם.
              </div>
              <button
                type="button"
                onClick={() => setStatus("invite-preview")}
                className="text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                חזרה
              </button>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center" dir="rtl">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-2">הצטרפת בהצלחה!</h2>
              <p className="text-white/70 mb-2">
                מעכשיו את/ה <span className="text-emerald-400 font-bold">{inviteData?.playerName}</span>
              </p>
              {inviteData?.clubName && (
                <p className="text-white/50 text-sm mb-6">
                  ב-{inviteData.clubName}
                </p>
              )}
              <Button
                onClick={handleGoToDashboard}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                עבור לדשבורד
              </Button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center" dir="rtl">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">משהו השתבש</h2>
              <p className="text-white/70 mb-6">{error}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate("/")}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 text-white"
                >
                  חזרה לדף הבית
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
