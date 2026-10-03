"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  CheckCircle2,
  LogIn,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Shirt,
} from "lucide-react";
import { PlayerAvatar } from "@/components/player";
import {
  Button,
  EmptyState,
  Field,
  FormError,
  Panel,
  Pill,
  Skeleton,
  useToast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { ROLE_AR, POSITION_AR, POSITIONS } from "@/lib/domain";
import { formatArabicDate } from "@/lib/format";
import type { PublicUser } from "@/lib/types";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  linkUrl: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, loading, isAdmin, refresh } = useSession();
  const toast = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shirtNumber, setShirtNumber] = useState("");
  const [position, setPosition] = useState("MID");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [inbox, setInbox] = useState<NotificationRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback((value: PublicUser) => {
    setName(value.name ?? "");
    setPhone(value.phone ?? "");
    setShirtNumber(value.shirtNumber ? String(value.shirtNumber) : "");
    setPosition(value.position ?? "MID");
    setPhotoUrl(value.photoUrl ?? null);
  }, []);

  useEffect(() => {
    if (user) {
      hydrate(user);
      api<{ notifications: NotificationRow[] }>("/api/profile")
        .then((data) => setInbox(data.notifications ?? []))
        .catch(() => setInbox([]));
    }
  }, [user, hydrate]);

  const onUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(file);
      });
      const response = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: { contentType: file.type, data: dataUrl, name: file.name },
      });
      setPhotoUrl(response.url);
      toast("تم رفع الصورة. اضغط حفظ لاعتمادها.", "success");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "تعذّر رفع الصورة. حاول مجدداً.";
      setError(message);
      toast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: {
          name,
          phone,
          shirtNumber: shirtNumber ? Number(shirtNumber) : null,
          position,
          photoUrl,
        },
      });
      await refresh();
      toast("تم حفظ بياناتك بنجاح.", "success");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "تعذّر حفظ البيانات. حاول مجدداً.";
      setError(message);
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          icon={<LogIn size={26} />}
          title="سجّل الدخول للوصول إلى حسابك"
          body="تتيح لك صفحة الحساب تحديث بيانات اللاعب، رفع الصورة، ومراجعة إشعاراتك."
          action={
            <Link href="/auth">
              <Button variant="gold" size="lg">
                تسجيل الدخول
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="micro">MY ACCOUNT</p>
        <h1 className="text-[clamp(2rem,6vw,3.1rem)] font-extrabold leading-tight">
          حسابي في دوريسيو
        </h1>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-5">
            <div className="relative">
              <PlayerAvatar
                player={{ name: user.name, photoUrl, position: user.position }}
                size={96}
                className="ring-2 ring-gold/40"
              />
              <label
                className="absolute -bottom-2 -left-2 grid size-9 cursor-pointer place-items-center rounded-full border border-gold/50 bg-ink text-gold-light transition-colors hover:bg-gold/20"
                aria-label="رفع صورة الملف الشخصي"
              >
                <Camera size={16} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onUpload(file);
                  }}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold">{user.name}</h2>
              <p className="mt-1 text-muted">{user.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill tone={isAdmin ? "gold" : "neutral"}>
                  {isAdmin && <ShieldCheck size={13} />} {ROLE_AR[user.role] ?? user.role}
                </Pill>
                <Pill tone="pitch">{POSITION_AR[user.position ?? "MID"] ?? "لاعب"}</Pill>
                {uploading && <Pill tone="amber">جارٍ رفع الصورة…</Pill>}
              </div>
            </div>
          </div>

          <form onSubmit={save} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الاسم الكامل">
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
              </Field>
              <Field label="رقم الهاتف">
                <div className="relative">
                  <Phone
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                  />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </Field>
              <Field label="رقم القميص">
                <div className="relative">
                  <Shirt
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
                  />
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={shirtNumber}
                    onChange={(e) => setShirtNumber(e.target.value)}
                    placeholder="10"
                    className="pr-10 num"
                  />
                </div>
              </Field>
              <Field label="المركز">
                <select value={position} onChange={(e) => setPosition(e.target.value)}>
                  {POSITIONS.map((item) => (
                    <option key={item} value={item}>
                      {POSITION_AR[item]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <FormError message={error} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="gold" loading={saving}>
                <Save size={17} /> حفظ التغييرات
              </Button>
              <Link href="/players">
                <Button type="button" variant="outline">
                  عرض بطاقات اللاعبين
                </Button>
              </Link>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-gold-light" />
              <h2 className="text-lg font-extrabold">إشعاراتي</h2>
            </div>
            <div className="mt-4 space-y-3">
              {inbox.length === 0 && (
                <p className="text-sm text-muted">لا توجد إشعارات جديدة.</p>
              )}
              {inbox.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-line bg-elevated/50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-[0.92rem]">{item.title}</p>
                    {!item.read && <span className="size-2 rounded-full bg-live" />}
                  </div>
                  <p className="mt-1 text-[0.82rem] leading-relaxed text-muted whitespace-pre-line">
                    {item.body}
                  </p>
                  {item.linkUrl && (
                    <Link
                      href={item.linkUrl}
                      className="mt-2 inline-block text-[0.8rem] font-bold text-gold-light underline underline-offset-4"
                    >
                      فتح الرابط
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-gold-light" />
              <h2 className="text-lg font-extrabold">بيانات الحساب</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">مزود الدخول</dt>
                <dd className="font-bold">{user.provider}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">عضو منذ</dt>
                <dd className="font-bold">{formatArabicDate(user.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">آخر دخول</dt>
                <dd className="font-bold">
                  {user.lastLoginAt ? formatArabicDate(user.lastLoginAt) : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 rounded-xl border border-line bg-elevated/50 p-4">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="mt-0.5 text-live" />
                <p className="text-[0.82rem] leading-relaxed text-muted">
                  يمكنك تحديث بياناتك في أي وقت. لا يمكن تغيير الصلاحيات أو البريد الإلكتروني
                  من الواجهة — تُدار من الخادم فقط لحماية سلامة الدوري.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
