"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  Download,
  Home,
  LayoutDashboard,
  LogIn,
  ShieldCheck,
  Trophy,
  User,
  Users,
  WifiOff,
} from "lucide-react";
import { DorisioWordmark } from "@/components/brand";
import { cn, ToastProvider } from "@/components/ui";
import { SessionProvider, useSession } from "@/lib/client/session";
import { flushQueue, queueCount } from "@/lib/client/offline";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/matches", label: "المباريات", icon: CalendarDays },
  { href: "/table", label: "الترتيب", icon: Trophy },
  { href: "/players", label: "اللاعبين", icon: Users },
  { href: "/profile", label: "حسابي", icon: User },
];

const DESKTOP_NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/matches", label: "المباريات" },
  { href: "/table", label: "الترتيب" },
  { href: "/players", label: "اللاعبين" },
  { href: "/teams", label: "الفرق" },
  { href: "/history", label: "السجل" },
];

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    // prompt a clean reload when a new version activates
    let refreshing = false;
    const onUpdate = (event: MessageEvent) => {
      if (event.data === "SW_UPDATED" && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onUpdate);
    return () => navigator.serviceWorker.removeEventListener("message", onUpdate);
  }, []);
  return null;
}

function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl px-4 sm:px-6 pt-3"
    >
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gold/35 bg-gold/10 px-4 py-2.5">
        <p className="text-[0.85rem] font-bold text-gold-light flex items-center gap-2">
          <Download size={16} /> ثبّت دوريسيو على جهازك للوصول السريع والعمل دون اتصال.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              deferred.prompt();
              await deferred.userChoice;
              setDeferred(null);
            }}
            className="rounded-lg bg-gold px-3.5 py-1.5 text-[0.8rem] font-bold text-ink"
          >
            تثبيت
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2.5 py-1.5 text-[0.8rem] font-bold text-muted hover:text-paper"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function ConnectionBar() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const { user } = useSession();

  const sync = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    setSyncing(true);
    try {
      await flushQueue(async (path, body) => {
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message ?? "sync_failed");
        return data;
      });
    } finally {
      setSyncing(false);
      setPending(await queueCount());
    }
  }, []);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sync();
    };
    setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const interval = setInterval(() => void queueCount().then(setPending), 5000);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(interval);
    };
  }, [sync, user]);

  return (
    <AnimatePresence>
      {(!online || pending > 0) && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "flex items-center justify-center gap-2.5 px-4 py-2 text-[0.82rem] font-bold",
              online ? "bg-amber/15 text-amber" : "bg-alert/15 text-alert",
            )}
            role="status"
          >
            {online ? (
              <>
                <motion.span
                  animate={{ rotate: syncing ? 360 : 0 }}
                  transition={{ repeat: syncing ? Infinity : 0, duration: 1 }}
                >
                  ⟳
                </motion.span>
                {syncing
                  ? "جارٍ مزامنة التغييرات المعلّقة…"
                  : `${pending} تغييراً بانتظار المزامنة`}
                {pending > 0 && !syncing && (
                  <button onClick={() => void sync()} className="underline underline-offset-4">
                    مزامنة الآن
                  </button>
                )}
              </>
            ) : (
              <>
                <WifiOff size={16} /> أنت غير متصل — يعرض دوريسيو آخر بيانات محفوظة على جهازك.
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header() {
  const { user, isAdmin, signOut } = useSession();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/88 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link href="/" aria-label="دوريسيو — الصفحة الرئيسية">
            <DorisioWordmark />
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="التنقل الرئيسي">
            {DESKTOP_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-[0.92rem] font-bold transition-colors",
                    active ? "text-gold-light" : "text-muted hover:text-paper",
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gold"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-[0.85rem] font-bold text-gold-light hover:bg-gold/20 transition-colors"
              >
                <ShieldCheck size={16} /> لوحة الإدارة
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5 hover:border-gold/50 transition-colors"
                >
                  <span className="size-8 rounded-full bg-pitch/25 border border-pitch/50 flex items-center justify-center text-[0.75rem] font-bold text-live overflow-hidden">
                    {user.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.photoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      user.name.slice(0, 1)
                    )}
                  </span>
                  <span className="hidden sm:block text-[0.85rem] font-bold max-w-[8rem] truncate">
                    {user.name}
                  </span>
                </Link>
                <button
                  onClick={() => void signOut()}
                  className="rounded-lg px-3 py-2 text-[0.82rem] font-bold text-muted hover:text-alert transition-colors"
                >
                  خروج
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-paper px-4 py-2.5 text-[0.85rem] font-bold text-ink hover:bg-gold-light transition-colors"
              >
                <LogIn size={16} /> تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useSession();
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-line bg-ink/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="التنقل السفلي"
    >
      <div className="grid grid-cols-5">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[0.68rem] font-bold transition-colors",
                active ? "text-gold-light" : "text-dim",
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-gold"
                />
              )}
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              {item.label}
            </Link>
          );
        })}
      </div>
      {isAdmin && (
        <Link
          href="/admin"
          className="flex items-center justify-center gap-2 border-t border-line bg-gold/12 py-2 text-[0.78rem] font-bold text-gold-light"
        >
          <LayoutDashboard size={15} /> لوحة الإدارة
          <ChevronLeft size={14} />
        </Link>
      )}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <ServiceWorkerRegistration />
        <div className="flex min-h-dvh flex-col">
          <ConnectionBar />
          <InstallPrompt />
          <Header />
          <main className="flex-1 pb-28 lg:pb-16">{children}</main>
          <footer className="hidden lg:block border-t border-line bg-surface">
            <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <DorisioWordmark />
                <p className="mt-3 text-sm text-dim max-w-sm leading-relaxed">
                  دوريكم... بشكل حقيقي. منصة دوري كرة القدم للمدارس والأصدقاء — جداول، مباريات
                  مباشرة، إحصائيات، جوائز.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <Link href="/matches" className="text-muted hover:text-gold-light">
                  المباريات
                </Link>
                <Link href="/table" className="text-muted hover:text-gold-light">
                  الترتيب
                </Link>
                <Link href="/history" className="text-muted hover:text-gold-light">
                  السجل
                </Link>
                <Link href="/auth" className="text-muted hover:text-gold-light">
                  الحساب
                </Link>
              </div>
            </div>
          </footer>
          <BottomNav />
        </div>
      </ToastProvider>
    </SessionProvider>
  );
}
