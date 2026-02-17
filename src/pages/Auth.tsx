import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSafeRedirectPath } from "@/lib/safeRedirect";
import { Loader2, ArrowRight, ChevronDown, Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
});

type FormData = z.infer<typeof formSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

type EmailTab = "login" | "signup";

interface LocationState {
  returnTo?: string;
}

export default function Auth() {
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const returnTo = locationState?.returnTo || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailTab, setEmailTab] = useState<EmailTab>("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, resetPassword, user } = useAuth();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const storedReturnTo = localStorage.getItem("authReturnTo");
      if (storedReturnTo) {
        localStorage.removeItem("authReturnTo");
        navigate(getSafeRedirectPath(storedReturnTo));
      } else {
        navigate(getSafeRedirectPath(returnTo));
      }
    }
  }, [user, navigate, returnTo]);

  const form = useForm<FormData>({
    resolver: zodResolver(showForgotPassword ? forgotPasswordSchema : formSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSubmit = async (data: FormData | ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      if (showForgotPassword) {
        const { error } = await resetPassword(data.email);
        if (error) {
          toast({
            title: "שגיאה",
            description: getErrorMessage(error.message),
            variant: "destructive",
          });
        } else {
          toast({
            title: "נשלח בהצלחה",
            description: "בדוק את תיבת האימייל שלך להוראות איפוס סיסמה",
          });
          setShowForgotPassword(false);
        }
      } else if (emailTab === "login") {
        const loginData = data as FormData;
        const { error } = await signIn(loginData.email, loginData.password);
        if (error) {
          toast({
            title: "שגיאה בהתחברות",
            description: getErrorMessage(error.message),
            variant: "destructive",
          });
        } else {
          navigate(returnTo);
        }
      } else {
        const signupData = data as FormData;
        const { error } = await signUp(signupData.email, signupData.password);
        if (error) {
          toast({
            title: "שגיאה בהרשמה",
            description: getErrorMessage(error.message),
            variant: "destructive",
          });
        } else {
          toast({
            title: "נרשמת בהצלחה!",
            description: "ברוך הבא לכוחות אונליין",
          });
          navigate(returnTo);
        }
      }
    } catch (err) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה לא צפויה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (message: string): string => {
    if (message.includes("Invalid login credentials")) {
      return "אימייל או סיסמה שגויים";
    }
    if (message.includes("User already registered")) {
      return "משתמש עם אימייל זה כבר קיים";
    }
    if (message.includes("Email not confirmed")) {
      return "האימייל לא אומת";
    }
    if (message.includes("Password")) {
      return "הסיסמה חייבת להכיל לפחות 6 תווים";
    }
    return message;
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-emerald-900">
      {/* Background Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-800 to-emerald-950" />
        <div
          className="hidden md:block absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/bg/auth-desktop.jpg')" }}
        />
        <div
          className="md:hidden absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/assets/bg/auth-mobile.jpg')" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-4 flex items-center justify-between" dir="rtl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            <span>חזרה לעמוד הבית</span>
          </Link>
          <Link to="/">
            <img src="/logo.png" alt="kohot.online" className="h-8 w-auto" />
          </Link>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 pb-8" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              {/* Google OAuth — Hero */}
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full h-12 bg-white hover:bg-white/90 text-gray-700 font-bold text-base shadow-lg"
                  onClick={async () => {
                    if (returnTo !== "/dashboard") {
                      localStorage.setItem("authReturnTo", returnTo);
                    }
                    const { error } = await signInWithGoogle();
                    if (error) {
                      toast({
                        title: "שגיאה בהתחברות עם Google",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  המשך עם Google
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

              {/* Email Form — expanded */}
              {showEmailForm && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {/* Login / Signup tabs */}
                  {!showForgotPassword && (
                    <div className="flex mb-4 bg-white/5 rounded-lg p-1">
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
                    </div>
                  )}

                  {/* Forgot password header */}
                  {showForgotPassword && (
                    <div className="mb-4 text-center">
                      <p className="text-white/80 text-sm">נשלח לך קישור לאיפוס הסיסמה</p>
                    </div>
                  )}

                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
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

                    {!showForgotPassword && (
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white/80">
                          סיסמה
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••"
                          dir="ltr"
                          className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-400 focus:ring-emerald-400/20"
                          {...form.register("password")}
                        />
                        {form.formState.errors.password && (
                          <p className="text-red-400 text-sm">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-bold bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : showForgotPassword ? (
                        "שלח קישור איפוס"
                      ) : emailTab === "login" ? (
                        "התחבר"
                      ) : (
                        "צור חשבון"
                      )}
                    </Button>

                    {/* Forgot password link (login tab only) */}
                    {emailTab === "login" && !showForgotPassword && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="w-full text-sm text-white/40 hover:text-white/60 transition-colors"
                      >
                        שכחת סיסמה?
                      </button>
                    )}

                    {/* Back from forgot password */}
                    {showForgotPassword && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="w-full text-sm text-emerald-400 hover:underline"
                      >
                        חזרה להתחברות
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* Quick draft link */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => navigate("/quick-draft")}
                  className="w-full text-sm text-white/40 hover:text-amber-400 transition-colors"
                >
                  או נסה כוחות ראשונים בלי חשבון →
                </button>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-white/30 text-xs mt-6">
              עושים כוחות אמיתיים אונליין - מתחילים לשחק בזמן
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
