"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

export function cn(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

/* ----------------------------- Button ----------------------------- */

type Variant = "gold" | "pitch" | "outline" | "ghost" | "danger" | "live";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-gold text-ink hover:bg-gold-light border border-gold/60 shadow-[0_10px_30px_-18px_rgba(232,199,102,0.9)]",
  pitch: "bg-pitch text-white hover:bg-pitch-deep border border-pitch/60",
  outline: "bg-transparent text-paper border border-line hover:border-gold/70 hover:text-gold-light",
  ghost: "bg-transparent text-muted hover:text-paper hover:bg-elevated",
  danger: "bg-alert/15 text-alert border border-alert/40 hover:bg-alert/25",
  live: "bg-live/15 text-live border border-live/45 hover:bg-live/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.82rem]",
  md: "h-11 px-5 text-[0.92rem]",
  lg: "h-14 px-7 text-[1.02rem]",
};

export function Button({
  variant = "pitch",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.965, y: 1 }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors",
        "disabled:opacity-45 disabled:cursor-not-allowed select-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...(props as Record<string, unknown>)}
    >
      {loading && (
        <span
          className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  );
}

/* ------------------------------ Panel ----------------------------- */

export function Panel({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "relative rounded-2xl border border-line bg-surface overflow-hidden",
        className,
      )}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {children}
    </Tag>
  );
}

/* --------------------------- Section head -------------------------- */

export function SectionHeader({
  eyebrow,
  title,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-5", className)}>
      <div>
        {eyebrow && <p className="micro mb-1.5">{eyebrow}</p>}
        <h2 className="text-[1.55rem] sm:text-[1.9rem] font-extrabold leading-tight tracking-tight">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "gold" | "live" | "alert" | "amber" | "pitch";
  className?: string;
}) {
  const tones = {
    neutral: "bg-elevated text-muted border-line",
    gold: "bg-gold/12 text-gold-light border-gold/35",
    live: "bg-live/12 text-live border-live/35",
    alert: "bg-alert/12 text-alert border-alert/35",
    amber: "bg-amber/12 text-amber border-amber/35",
    pitch: "bg-pitch/15 text-white border-pitch/40",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------- Skeleton ----------------------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-elevated", className)}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-l from-transparent via-white/[0.05] to-transparent" />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="mb-4 size-14 rounded-2xl border border-line bg-elevated flex items-center justify-center text-dim">
        {icon ?? <span className="text-2xl">⚽</span>}
      </div>
      <h3 className="text-lg font-bold mb-1.5">{title}</h3>
      {body && <p className="text-sm text-muted max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ----------------------------- Modal ------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onClose}
            aria-label="إغلاق"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { y: 26, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 18, opacity: 0, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "relative w-full bg-surface border border-line rounded-t-3xl sm:rounded-2xl max-h-[88vh] overflow-y-auto",
              wide ? "sm:max-w-3xl" : "sm:max-w-lg",
            )}
            style={{ boxShadow: "0 40px 90px -30px rgba(0,0,0,0.9)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 bg-surface/95 backdrop-blur border-b border-line">
              <h3 className="text-lg font-extrabold">{title}</h3>
              <button
                onClick={onClose}
                className="size-9 rounded-lg border border-line flex items-center justify-center text-muted hover:text-paper hover:border-gold/50 transition-colors"
                aria-label="إغلاق النافذة"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ----------------------------- Toast ------------------------------- */

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info" | "warning";
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4600);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,26rem)]"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-bold backdrop-blur-md",
                toast.tone === "success" && "bg-pitch/90 border-live/50 text-white",
                toast.tone === "error" && "bg-alert/95 border-alert text-white",
                toast.tone === "warning" && "bg-amber/95 border-amber text-ink",
                toast.tone === "info" && "bg-elevated/95 border-line text-paper",
              )}
            >
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ----------------------------- Field ------------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[0.82rem] font-bold text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[0.72rem] text-dim mt-1.5">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-alert/40 bg-alert/12 text-alert text-[0.85rem] font-bold px-3.5 py-2.5"
      role="alert"
    >
      {message}
    </motion.p>
  );
}

export function ArabicError({ code }: { code: string | null }) {
  const messages: Record<string, string> = {
    offline: "أنت غير متصل بالإنترنت. سيتم حفظ التغييرات ومزامنتها عند العودة.",
    network: "تعذّر الاتصال بالخادم. تحقق من الشبكة وأعد المحاولة.",
    permission: "ليست لديك صلاحية لتنفيذ هذا الإجراء.",
    unauthenticated: "يجب تسجيل الدخول أولاً.",
    invalid: "البيانات المدخلة غير صحيحة.",
    conflict: "تعارض في البيانات. راجع القيم قبل الحفظ.",
    sync_pending: "هناك تغييرات بانتظار المزامنة.",
    sync_failed: "فشلت المزامنة. سنحاول مجدداً تلقائياً.",
    firebase: "خدمة المصادقة غير متاحة حالياً. حاول لاحقاً.",
  };
  if (!code) return null;
  return <FormError message={messages[code] ?? code} />;
}
