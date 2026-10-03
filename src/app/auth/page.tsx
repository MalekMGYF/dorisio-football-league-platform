"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, User } from "lucide-react";
import { DorisioMark } from "@/components/brand";
import { Button, Field, FormError, Panel, cn, useToast } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";

type Mode = "login" | "register" | "reset";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_not_configured: "تسجيل الدخول عبر المزوّد غير مفعّل بعد. راجع SETUP.md لإعداده.",
  invalid_state: "انتهت صلاحية جلسة تسجيل الدخول. حاول مرة أخرى.",
  oauth_profile_failed: "تعذّر قراءة بيانات الحساب من المزوّد.",
  unknown_provider: "مزود تسجيل الدخول غير مدعوم.",
};

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { refresh, user } = useSession();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [position, setPosition] = useState("MID");
  const [shirtNumber, setShirtNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const errorCode = params.get("error");
    const token = params.get("reset");
    if (errorCode) setError(ERROR_MESSAGES[errorCode] ?? "حدث خطأ أثناء تسجيل الدخول.");
    if (token) {
      setResetToken(token);
      setMode("reset");
    }
  }, [params]);

  useEffect(() => {
    if (user) router.replace("/profile");
  }, [user, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        await api("/api/auth/login", { method: "POST", body: { email, password } });
        await refresh();
        toast("أهلاً بعودتك إلى دوريسيو.", "success");
        router.replace("/profile");
      } else if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          body: {
            name,
            email,
            password,
            position,
            shirtNumber: shirtNumber ? Number(shirtNumber) : undefined,
          },
        });
        await refresh();
        toast("تم إنشاء حسابك في دوريسيو.", "success");
        router.replace("/profile");
      } else {
        const response = await api<{ message: string }>("/api/auth/reset", {
          method: "POST",
          body: resetToken
            ? { mode: "confirm", token: resetToken, password }
            : { mode: "request", email },
        });
        setInfo(response.message);
        toast(response.message, "success");
        if (resetToken) {
          setResetToken(null);
          setMode("login");
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "حدث خطأ غير متوقع. حاول مجدداً.";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/kit-flatlay.jpg"
          alt=""
          aria-hidden="true"
          className="size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-[linear-gradient(200deg,rgba(10,14,12,0.72),#0A0E0C_72%)]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 py-12 lg:grid-cols-2 lg:items-center lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <DorisioMark size={64} className="text-pitch" />
          <h1 className="mt-7 text-[clamp(2.4rem,5vw,4.2rem)] font-extrabold leading-[0.98]">
            دوريكم...
            <br />
            <span className="text-gold-light">بشكل حقيقي.</span>
          </h1>
          <p className="mt-6 max-w-md text-muted leading-relaxed">
            سجّل الدخول لمتابعة مبارياتك، تقييم اللاعبين، ومتابعة ترتيب فريقك لحظة بلحظة —
            وحتى دون اتصال.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="micro">SEASONS</p>
              <p className="num text-xl font-bold">2025/26</p>
            </div>
            <div className="rounded-xl border border-line bg-surface/70 px-4 py-3">
              <p className="micro">LIVE CENTER</p>
              <p className="num text-xl font-bold text-live">24/7</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Panel className="p-6 sm:p-8">
            <div className="flex items-center gap-2 lg:hidden">
              <DorisioMark size={38} className="text-pitch" />
              <span className="text-xl font-extrabold">دوريسيو</span>
            </div>

            <div className="mt-5 flex gap-1 rounded-xl border border-line bg-elevated p-1">
              {(
                [
                  { value: "login", label: "تسجيل الدخول" },
                  { value: "register", label: "حساب جديد" },
                  { value: "reset", label: "استعادة كلمة المرور" },
                ] as { value: Mode; label: string }[]
              ).map((item) => (
                <button
                  key={item.value}
                  onClick={() => {
                    setMode(item.value);
                    setError(null);
                    setInfo(null);
                  }}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2.5 text-[0.82rem] font-bold transition-colors",
                    mode === item.value
                      ? "bg-gold text-ink"
                      : "text-muted hover:text-paper",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && (
                <Field label="الاسم الكامل">
                  <div className="relative">
                    <User
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                    />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                      maxLength={80}
                      placeholder="مثال: محمد العتيبي"
                      className="pr-10"
                      autoComplete="name"
                    />
                  </div>
                </Field>
              )}

              {(mode !== "reset" || !resetToken) && (
                <Field label="البريد الإلكتروني">
                  <div className="relative">
                    <Mail
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      placeholder="you@example.com"
                      className="pr-10"
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>
                </Field>
              )}

              {(mode !== "reset" || resetToken) && (
                <Field
                  label={mode === "reset" && resetToken ? "كلمة المرور الجديدة" : "كلمة المرور"}
                  hint={mode === "register" ? "8 أحرف على الأقل" : undefined}
                >
                  <div className="relative">
                    <Lock
                      size={16}
                      className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={mode === "login" ? 4 : 8}
                      placeholder="••••••••"
                      className="pr-10"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      dir="ltr"
                    />
                  </div>
                </Field>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="المركز">
                    <select
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                    >
                      <option value="GK">حارس مرمى</option>
                      <option value="DEF">مدافع</option>
                      <option value="MID">لاعب وسط</option>
                      <option value="FWD">مهاجم</option>
                    </select>
                  </Field>
                  <Field label="رقم القميص">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={shirtNumber}
                      onChange={(event) => setShirtNumber(event.target.value)}
                      placeholder="10"
                      className="num"
                    />
                  </Field>
                </div>
              )}

              <FormError message={error} />
              {info && (
                <p className="rounded-lg border border-live/40 bg-live/12 px-3.5 py-2.5 text-[0.85rem] font-bold text-live">
                  {info}
                </p>
              )}

              <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full">
                {mode === "login"
                  ? "تسجيل الدخول"
                  : mode === "register"
                    ? "إنشاء الحساب"
                    : resetToken
                      ? "تعيين كلمة المرور"
                      : "إرسال رابط الاستعادة"}
              </Button>
            </form>

            {mode !== "reset" && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="micro">أو تابع باستخدام</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                <div className="grid gap-2.5">
                  <a
                    href="/api/auth/oauth/google"
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-elevated px-4 py-3 text-[0.9rem] font-bold transition-colors hover:border-gold/50"
                  >
                    <GoogleIcon /> المتابعة عبر Google
                  </a>
                  <a
                    href="/api/auth/oauth/github"
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-elevated px-4 py-3 text-[0.9rem] font-bold transition-colors hover:border-gold/50"
                  >
                    <GithubIcon /> المتابعة عبر GitHub
                  </a>
                  <a
                    href="/api/auth/oauth/facebook"
                    className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-elevated px-4 py-3 text-[0.9rem] font-bold transition-colors hover:border-gold/50"
                  >
                    <FacebookIcon /> المتابعة عبر Facebook
                  </a>
                </div>
                <p className="mt-4 text-center text-[0.72rem] leading-relaxed text-dim">
                  بإنشائك حساباً فأنت توافق على قواعد المنافسة النزيهة في دوريسيو. لا يمكن
                  اختيار صلاحية «مدير» عند التسجيل — تُمنح فقط من الخادم.
                </p>
              </>
            )}
          </Panel>
        </motion.div>
      </div>
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.58-5.15 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.92l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.29a12 12 0 0 0 0 10.72l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.64l3.99 3.09C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-6 py-24 text-center text-muted">جارٍ التحميل…</div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
