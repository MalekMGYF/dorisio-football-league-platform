"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  CalendarPlus,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { TeamCrest } from "@/components/crest";
import {
  Button,
  EmptyState,
  Field,
  FormError,
  Modal,
  Panel,
  Pill,
  useToast,
} from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import type { OverviewPayload } from "@/lib/types";
import { AWARD_TYPES, POSITION_AR, POSITIONS } from "@/lib/domain";

type ToastFn = (message: string, tone?: "success" | "error" | "info" | "warning") => void;

async function run(action: () => Promise<void>, toast: ToastFn, successMessage: string) {
  try {
    await action();
    toast(successMessage, "success");
    return true;
  } catch (error) {
    toast(error instanceof ApiClientError ? error.message : "حدث خطأ غير متوقع.", "error");
    return false;
  }
}

function useEntityState() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return { saving, setSaving, error, setError };
}

/* ------------------------------- LEAGUES ------------------------------- */

export function AdminLeagues({
  data,
  onChanged,
}: {
  data: OverviewPayload | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    name: "",
    season: "",
    venue: "",
    matchDuration: 30,
    status: "active",
    championTeamId: "",
    description: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        const payload = {
          name: form.name,
          season: form.season,
          venue: form.venue,
          matchDuration: Number(form.matchDuration),
          status: form.status,
          championTeamId: form.championTeamId || undefined,
          description: form.description,
        };
        if (form.id) await api("/api/leagues", { method: "PATCH", body: { id: form.id, ...payload } });
        else await api("/api/leagues", { method: "POST", body: payload });
      },
      toast,
      form.id ? "تم تحديث الدوري." : "تم إنشاء الدوري بنجاح.",
    );
    setSaving(false);
    if (ok) {
      setOpen(false);
      onChanged();
      setForm({
        id: "",
        name: "",
        season: "",
        venue: "",
        matchDuration: 30,
        status: "active",
        championTeamId: "",
        description: "",
      });
    } else {
      setError("تعذّر حفظ الدوري. راجع البيانات وحاول مجدداً.");
    }
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro">LEAGUES & SEASONS</p>
          <h2 className="mt-1 text-xl font-extrabold">الدوري والمواسم</h2>
        </div>
        <Button
          variant="gold"
          onClick={() => {
            setForm({
              id: "",
              name: "",
              season: "",
              venue: "",
              matchDuration: 30,
              status: "active",
              championTeamId: "",
              description: "",
            });
            setOpen(true);
          }}
        >
          <Plus size={16} /> دوري جديد
        </Button>
      </div>

      <div className="mt-5 space-y-3">
        {(data?.leagues ?? []).map((league) => (
          <div
            key={league.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-3.5"
          >
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {league.name} — {league.season}
              </p>
              <p className="text-[0.78rem] text-dim">
                {league.venue ?? "—"} · {league.matchDuration} دقيقة ·{" "}
                {(data?.teams ?? []).filter((t) => t.leagueId === league.id).length} فريق
              </p>
            </div>
            <Pill tone={league.status === "active" ? "live" : "neutral"}>
              {league.status === "active" ? "جاري" : league.status === "finished" ? "منتهي" : "قادم"}
            </Pill>
            <button
              onClick={() => {
                setForm({
                  id: league.id,
                  name: league.name,
                  season: league.season,
                  venue: league.venue ?? "",
                  matchDuration: league.matchDuration,
                  status: league.status,
                  championTeamId: league.championTeamId ?? "",
                  description: league.description ?? "",
                });
                setOpen(true);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-[0.78rem] font-bold text-muted hover:text-paper hover:border-gold/50"
            >
              <Pencil size={13} className="inline ml-1" /> تعديل
            </button>
            <button
              onClick={() =>
                void run(
                  async () => {
                    await api(`/api/leagues?id=${league.id}`, { method: "DELETE" });
                  },
                  toast,
                  "تم حذف الدوري.",
                ).then(onChanged)
              }
              className="rounded-lg border border-alert/40 px-3 py-1.5 text-[0.78rem] font-bold text-alert hover:bg-alert/10"
            >
              <Trash2 size={13} className="inline ml-1" /> حذف
            </button>
          </div>
        ))}
        {(data?.leagues ?? []).length === 0 && (
          <EmptyState title="لا توجد بطولات" body="أنشئ أول دوري للبدء في إضافة الفرق والمباريات." />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "تعديل الدوري" : "دوري جديد"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="اسم الدوري">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="دوريسيو المدرسي"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الموسم">
              <input
                value={form.season}
                onChange={(e) => setForm({ ...form, season: e.target.value })}
                required
                placeholder="2025 / 2026"
              />
            </Field>
            <Field label="الملعب">
              <input
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="الملعب البلدي"
              />
            </Field>
            <Field label="مدة المباراة (دقيقة)">
              <input
                type="number"
                min={5}
                max={120}
                value={form.matchDuration}
                onChange={(e) => setForm({ ...form, matchDuration: Number(e.target.value) })}
                className="num"
              />
            </Field>
            <Field label="الحالة">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="upcoming">قادم</option>
                <option value="active">جاري</option>
                <option value="finished">منتهي</option>
              </select>
            </Field>
          </div>
          <Field label="الفريق البطل (اختياري)">
            <select
              value={form.championTeamId}
              onChange={(e) => setForm({ ...form, championTeamId: e.target.value })}
            >
              <option value="">— لم يُحسم بعد —</option>
              {(data?.teams ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الوصف">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="وصف مختصر للبطولة…"
            />
          </Field>
          <FormError message={error} />
          <Button type="submit" variant="gold" loading={saving} className="w-full">
            <Save size={16} /> حفظ
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}

/* -------------------------------- TEAMS -------------------------------- */

export function AdminTeams({ data, onChanged }: { data: OverviewPayload | null; onChanged: () => void }) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    leagueId: "",
    name: "",
    shortName: "",
    primaryColor: "#0F7A46",
    secondaryColor: "#E8C766",
    logoUrl: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        const payload = {
          leagueId: form.leagueId || data?.league?.id,
          name: form.name,
          shortName: form.shortName,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          logoUrl: form.logoUrl || undefined,
        };
        if (form.id) await api("/api/teams", { method: "PATCH", body: { id: form.id, ...payload } });
        else await api("/api/teams", { method: "POST", body: payload });
      },
      toast,
      form.id ? "تم تحديث الفريق." : "تمت إضافة الفريق.",
    );
    setSaving(false);
    if (ok) {
      setOpen(false);
      onChanged();
    } else setError("تعذّر حفظ الفريق.");
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro">TEAMS</p>
          <h2 className="mt-1 text-xl font-extrabold">الفرق</h2>
        </div>
        <Button
          variant="gold"
          onClick={() => {
            setForm({
              id: "",
              leagueId: data?.league?.id ?? "",
              name: "",
              shortName: "",
              primaryColor: "#0F7A46",
              secondaryColor: "#E8C766",
              logoUrl: "",
            });
            setOpen(true);
          }}
        >
          <Plus size={16} /> فريق جديد
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(data?.teams ?? []).map((team) => (
          <div
            key={team.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-3.5"
          >
            <TeamCrest team={team} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{team.name}</p>
              <p className="text-[0.76rem] text-dim">{team.squadCount} لاعباً</p>
            </div>
            <button
              onClick={() => {
                setForm({
                  id: team.id,
                  leagueId: team.leagueId,
                  name: team.name,
                  shortName: team.shortName ?? "",
                  primaryColor: team.primaryColor,
                  secondaryColor: team.secondaryColor,
                  logoUrl: team.logoUrl ?? "",
                });
                setOpen(true);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-[0.76rem] font-bold text-muted hover:text-paper hover:border-gold/50"
            >
              تعديل
            </button>
            <button
              onClick={() =>
                void run(
                  async () => {
                    await api(`/api/teams?id=${team.id}`, { method: "DELETE" });
                  },
                  toast,
                  "تم حذف الفريق.",
                ).then(onChanged)
              }
              className="rounded-lg border border-alert/40 px-3 py-1.5 text-[0.76rem] font-bold text-alert hover:bg-alert/10"
            >
              حذف
            </button>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "تعديل الفريق" : "فريق جديد"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="اسم الفريق">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الاسم المختصر">
              <input
                value={form.shortName}
                onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                maxLength={12}
                placeholder="نسور"
              />
            </Field>
            <Field label="رابط الشعار (اختياري)">
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://…"
                dir="ltr"
              />
            </Field>
            <Field label="اللون الأساسي">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="h-11 p-1"
              />
            </Field>
            <Field label="اللون الثانوي">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                className="h-11 p-1"
              />
            </Field>
          </div>
          <FormError message={error} />
          <Button type="submit" variant="gold" loading={saving} className="w-full">
            <Save size={16} /> حفظ
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}

/* ------------------------------- PLAYERS ------------------------------- */

export function AdminPlayers({
  data,
  onChanged,
}: {
  data: OverviewPayload | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: "",
    teamId: "",
    name: "",
    shirtNumber: 1,
    position: "MID",
    isCaptain: false,
    photoUrl: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        const payload = {
          leagueId: data?.league?.id,
          teamId: form.teamId,
          name: form.name,
          shirtNumber: Number(form.shirtNumber),
          position: form.position,
          isCaptain: form.isCaptain,
          photoUrl: form.photoUrl || undefined,
        };
        if (form.id) await api("/api/players", { method: "PATCH", body: { id: form.id, ...payload } });
        else await api("/api/players", { method: "POST", body: payload });
      },
      toast,
      form.id ? "تم تحديث اللاعب." : "تمت إضافة اللاعب.",
    );
    setSaving(false);
    if (ok) {
      setOpen(false);
      onChanged();
    } else setError("تعذّر حفظ اللاعب.");
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro">PLAYERS</p>
          <h2 className="mt-1 text-xl font-extrabold">اللاعبون</h2>
        </div>
        <Button
          variant="gold"
          onClick={() => {
            setForm({
              id: "",
              teamId: data?.teams[0]?.id ?? "",
              name: "",
              shirtNumber: 1,
              position: "MID",
              isCaptain: false,
              photoUrl: "",
            });
            setOpen(true);
          }}
        >
          <Plus size={16} /> لاعب جديد
        </Button>
      </div>

      <div className="mt-5 max-h-[28rem] space-y-2 overflow-y-auto scroll-x">
        {(data?.players ?? []).map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-2.5"
          >
            <span className="num w-7 text-center text-dim">{player.shirtNumber ?? "—"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{player.name}</p>
              <p className="text-[0.74rem] text-dim">
                {player.teamName} · {POSITION_AR[player.position] ?? player.position}
              </p>
            </div>
            <button
              onClick={() => {
                setForm({
                  id: player.id,
                  teamId: player.teamId,
                  name: player.name,
                  shirtNumber: player.shirtNumber ?? 1,
                  position: player.position,
                  isCaptain: player.isCaptain,
                  photoUrl: player.photoUrl ?? "",
                });
                setOpen(true);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-[0.76rem] font-bold text-muted hover:text-paper hover:border-gold/50"
            >
              تعديل
            </button>
            <button
              onClick={() =>
                void run(
                  async () => {
                    await api(`/api/players?id=${player.id}`, { method: "DELETE" });
                  },
                  toast,
                  "تم حذف اللاعب.",
                ).then(onChanged)
              }
              className="rounded-lg border border-alert/40 px-3 py-1.5 text-[0.76rem] font-bold text-alert hover:bg-alert/10"
            >
              حذف
            </button>
          </div>
        ))}
        {(data?.players ?? []).length === 0 && (
          <EmptyState icon={<Users size={24} />} title="لا يوجد لاعبون" body="أضف أول لاعب لبدء إحصائيات الدوري." />
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "تعديل اللاعب" : "لاعب جديد"}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="اسم اللاعب">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الفريق">
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                required
              >
                <option value="">— اختر الفريق —</option>
                {(data?.teams ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رقم القميص">
              <input
                type="number"
                min={1}
                max={99}
                value={form.shirtNumber}
                onChange={(e) => setForm({ ...form, shirtNumber: Number(e.target.value) })}
                className="num"
              />
            </Field>
            <Field label="المركز">
              <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
                {POSITIONS.map((item) => (
                  <option key={item} value={item}>
                    {POSITION_AR[item]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="رابط الصورة (اختياري)">
              <input
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
                placeholder="https://…"
                dir="ltr"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2.5 text-sm font-bold text-muted">
            <input
              type="checkbox"
              checked={form.isCaptain}
              onChange={(e) => setForm({ ...form, isCaptain: e.target.checked })}
              className="size-4.5"
            />
            قائد الفريق
          </label>
          <FormError message={error} />
          <Button type="submit" variant="gold" loading={saving} className="w-full">
            <Save size={16} /> حفظ
          </Button>
        </form>
      </Modal>
    </Panel>
  );
}

/* ------------------------------- MATCHES ------------------------------- */

export function AdminMatches({
  data,
  onChanged,
}: {
  data: OverviewPayload | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [mode, setMode] = useState<"manual" | "generate">("manual");
  const [form, setForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    kickoffAt: "",
    venue: "",
    round: 1,
    replace: false,
    time: "18:00",
    gapDays: 7,
    startDate: "",
    legs: 1,
  });

  const removeUpcomingMatch = async (matchId: string) => {
    if (!window.confirm("هل تريد حذف هذه المباراة القادمة من جدول المباريات؟")) return;
    const ok = await run(
      async () => {
        await api(`/api/matches/${matchId}`, { method: "DELETE" });
      },
      toast,
      "تم حذف المباراة القادمة من الجدول.",
    );
    if (ok) onChanged();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        if (mode === "manual") {
          await api("/api/matches", {
            method: "POST",
            body: {
              mode: "manual",
              leagueId: data?.league?.id,
              homeTeamId: form.homeTeamId,
              awayTeamId: form.awayTeamId,
              kickoffAt: form.kickoffAt,
              venue: form.venue,
              round: Number(form.round),
            },
          });
        } else {
          await api("/api/matches", {
            method: "POST",
            body: {
              mode: "generate",
              leagueId: data?.league?.id,
              replace: form.replace,
              time: form.time,
              gapDays: Number(form.gapDays),
              startDate: form.startDate || undefined,
              legs: Number(form.legs),
              venue: form.venue,
            },
          });
        }
      },
      toast,
      mode === "manual" ? "تمت إضافة المباراة." : "تم توليد جدول المباريات بنجاح.",
    );
    setSaving(false);
    if (ok) onChanged();
    else setError("تعذّر إتمام العملية. راجع البيانات.");
  };

  return (
    <Panel className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="micro">FIXTURES</p>
          <h2 className="mt-1 text-xl font-extrabold">المباريات والجدول</h2>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-elevated p-1">
          {(
            [
              { value: "manual", label: "يدوي" },
              { value: "generate", label: "توليد تلقائي" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              onClick={() => setMode(item.value)}
              className={`rounded-lg px-3.5 py-2 text-[0.82rem] font-bold ${
                mode === item.value ? "bg-gold text-ink" : "text-muted hover:text-paper"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === "manual" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الفريق المضيف">
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm({ ...form, homeTeamId: e.target.value })}
                required
              >
                <option value="">— اختر —</option>
                {(data?.teams ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الفريق الضيف">
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm({ ...form, awayTeamId: e.target.value })}
                required
              >
                <option value="">— اختر —</option>
                {(data?.teams ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="موعد المباراة">
              <input
                type="datetime-local"
                value={form.kickoffAt}
                onChange={(e) => setForm({ ...form, kickoffAt: e.target.value })}
                required
                dir="ltr"
              />
            </Field>
            <Field label="الجولة">
              <input
                type="number"
                min={1}
                max={60}
                value={form.round}
                onChange={(e) => setForm({ ...form, round: Number(e.target.value) })}
                className="num"
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="تاريخ بداية الجولة الأولى">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label="وقت المباريات">
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                dir="ltr"
              />
            </Field>
            <Field label="الفاصل بين الجولات (أيام)">
              <input
                type="number"
                min={2}
                max={60}
                value={form.gapDays}
                onChange={(e) => setForm({ ...form, gapDays: Number(e.target.value) })}
                className="num"
              />
            </Field>
            <Field label={form.replace ? "عدد دورات المواجهات" : "عدد الدورات الإضافية"}>
              <input
                type="number"
                min={1}
                max={5}
                value={form.legs}
                onChange={(e) => setForm({ ...form, legs: Number(e.target.value) })}
                className="num"
              />
            </Field>
            <Field label="استبدال الجدول الحالي">
              <select
                value={form.replace ? "yes" : "no"}
                onChange={(e) => setForm({ ...form, replace: e.target.value === "yes" })}
              >
                <option value="no">لا — الإضافة فقط</option>
                <option value="yes">نعم — إعادة توليد الجدول</option>
              </select>
            </Field>
            <p className="text-[0.78rem] leading-relaxed text-dim sm:col-span-2">
              المولّد يبني جدولاً بطريقة Round-Robin ويتعامل مع عدد الفرق الفردي عبر إراحة فريق
              في كل جولة. عند اختيار «الإضافة فقط»، كل ضغطة تضيف دورة جديدة بعد آخر جولة بدون
              حذف المباريات الحالية. اختر 2 إذا أردت ذهاباً وإياباً في نفس العملية.
            </p>
          </div>
        )}

        <div>
          <Field label="الملعب">
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="الملعب البلدي"
            />
          </Field>
        </div>

        <FormError message={error} />
        <Button type="submit" variant="gold" loading={saving} size="lg" className="w-full">
          <CalendarPlus size={18} />
          {mode === "manual" ? "إضافة المباراة" : "توليد جدول المباريات"}
        </Button>
      </form>

      <div className="mt-7">
        <h3 className="text-lg font-extrabold">المباريات المجدولة</h3>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto scroll-x">
          {(data?.matches ?? []).map((match) => (
            <div
              key={match.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-2.5"
            >
              <span className="micro w-10">J{match.round}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.92rem] font-bold">
                  {match.homeTeam?.name} × {match.awayTeam?.name}
                </p>
                <p className="text-[0.74rem] text-dim">
                  {new Date(match.kickoffAt).toLocaleString("ar", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone={match.status === "live" ? "live" : "neutral"}>
                  {match.status === "ft" ? "انتهت" : match.status === "live" ? "مباشر" : "قادمة"}
                </Pill>
                {match.status === "scheduled" ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => void removeUpcomingMatch(match.id)}
                    title="حذف المباراة القادمة"
                  >
                    <Trash2 size={15} /> حذف
                  </Button>
                ) : (
                  <Link href={`/admin/live/${match.id}`}>
                    <Button variant="live" size="sm">
                      مركز التحكم
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
          {(data?.matches ?? []).length === 0 && (
            <EmptyState title="لا توجد مباريات" body="أضف مباراة يدوياً أو ولّد الجدول تلقائياً." />
          )}
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------- AWARDS ------------------------------- */

export function AdminAwards({ data, onChanged }: { data: OverviewPayload | null; onChanged: () => void }) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [form, setForm] = useState({
    type: "player_of_week",
    playerId: "",
    teamId: "",
    reason: "",
    weekLabel: "",
    label: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        await api("/api/awards", {
          method: "POST",
          body: {
            leagueId: data?.league?.id,
            season: data?.league?.season ?? "2025/2026",
            type: form.type,
            playerId: form.playerId || undefined,
            teamId: form.teamId || undefined,
            reason: form.reason,
            weekLabel: form.weekLabel,
            label: form.label,
          },
        });
      },
      toast,
      "تم تسجيل الجائزة.",
    );
    setSaving(false);
    if (ok) {
      onChanged();
      setForm({ ...form, reason: "", weekLabel: "", label: "" });
    } else setError("تعذّر حفظ الجائزة.");
  };

  return (
    <Panel className="p-6">
      <p className="micro">AWARDS</p>
      <h2 className="mt-1 text-xl font-extrabold">الجوائز والتكريمات</h2>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="نوع الجائزة">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {AWARD_TYPES.map((award) => (
              <option key={award.value} value={award.value}>
                {award.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="اللاعب">
          <select value={form.playerId} onChange={(e) => setForm({ ...form, playerId: e.target.value })}>
            <option value="">— اختر اللاعب —</option>
            {(data?.players ?? []).map((player) => (
              <option key={player.id} value={player.id}>
                {player.name} ({player.teamName})
              </option>
            ))}
          </select>
        </Field>
        <Field label="الفريق (اختياري)">
          <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">— اختر الفريق —</option>
            {(data?.teams ?? []).map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="الجولة / الأسبوع">
          <input
            value={form.weekLabel}
            onChange={(e) => setForm({ ...form, weekLabel: e.target.value })}
            placeholder="الجولة الثالثة"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="سبب التكريم">
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3}
              placeholder="قدّم أداءً استثنائياً في الجولة الأخيرة…"
            />
          </Field>
        </div>
        <FormError message={error} />
        <div className="sm:col-span-2">
          <Button type="submit" variant="gold" loading={saving} className="w-full">
            <Award size={16} /> تسجيل الجائزة
          </Button>
        </div>
      </form>

      <div className="mt-7 space-y-2">
        {(data?.awards ?? []).map((award) => (
          <motion.div
            key={award.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3"
          >
            <Award size={17} className="text-gold-light" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {award.label ?? "جائزة"} — {award.player?.name ?? award.team?.name ?? "—"}
              </p>
              <p className="text-[0.76rem] text-dim">
                {award.season}
                {award.weekLabel ? ` · ${award.weekLabel}` : ""}
              </p>
            </div>
            <button
              onClick={() =>
                void run(
                  async () => {
                    await api(`/api/awards?id=${award.id}`, { method: "DELETE" });
                  },
                  toast,
                  "تم حذف الجائزة.",
                ).then(onChanged)
              }
              className="rounded-lg border border-alert/40 px-3 py-1.5 text-[0.76rem] font-bold text-alert hover:bg-alert/10"
            >
              حذف
            </button>
          </motion.div>
        ))}
        {(data?.awards ?? []).length === 0 && (
          <EmptyState title="لا توجد جوائز مسجلة" body="سجّل أول جائزة للاعب الأسبوع أو الهداف." />
        )}
      </div>
    </Panel>
  );
}

/* --------------------------- ANNOUNCEMENTS ----------------------------- */

export function AdminAnnouncements({
  data,
  onChanged,
}: {
  data: OverviewPayload | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const { saving, setSaving, error, setError } = useEntityState();
  const [form, setForm] = useState({ title: "", body: "", tag: "مباراة اليوم" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await run(
      async () => {
        await api("/api/announcements", {
          method: "POST",
          body: { title: form.title, body: form.body, tag: form.tag },
        });
      },
      toast,
      "تم نشر الإعلان.",
    );
    setSaving(false);
    if (ok) {
      onChanged();
      setForm({ title: "", body: "", tag: "مباراة اليوم" });
    } else setError("تعذّر نشر الإعلان.");
  };

  return (
    <Panel className="p-6">
      <p className="micro">ANNOUNCEMENTS</p>
      <h2 className="mt-1 text-xl font-extrabold">الإعلانات</h2>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="العنوان">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="موعد الجولة القادمة"
            />
          </Field>
          <Field label="التصنيف">
            <select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
              <option>مباراة اليوم</option>
              <option>إعلان</option>
              <option>جوائز</option>
              <option>إشعار</option>
            </select>
          </Field>
        </div>
        <Field label="النص">
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={4}
            required
            placeholder="اكتب تفاصيل الإعلان هنا…"
          />
        </Field>
        <FormError message={error} />
        <Button type="submit" variant="gold" loading={saving}>
          <Megaphone size={16} /> نشر الإعلان
        </Button>
      </form>

      <div className="mt-7 space-y-2">
        {(data?.announcements ?? []).map((announcement) => (
          <div
            key={announcement.id}
            className="rounded-xl border border-line bg-elevated/40 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Pill tone="gold">{announcement.tag ?? "خبر"}</Pill>
              <p className="font-bold">{announcement.title}</p>
            </div>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-muted">{announcement.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ------------------------------- SETTINGS ------------------------------ */

export function AdminSettings({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const seed = useCallback(async () => {
    setRunning(true);
    setResult(null);
    try {
      const response = await api<{ ok: boolean; message: string }>("/api/seed", {
        method: "POST",
        body: { confirm: "SEED-DEV-ONLY" },
      });
      setResult(response.message);
      toast(response.message, response.ok ? "success" : "warning");
      if (response.ok) onChanged();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "تعذّر تشغيل السكربت.";
      setResult(message);
      toast(message, "error");
    } finally {
      setRunning(false);
    }
  }, [onChanged, toast]);

  const resetLeague = useCallback(async () => {
    const confirmation = window.prompt(
      "تحذير: سيتم حذف الفرق واللاعبين والمباريات والأحداث والجوائز والإعلانات. الحسابات ستبقى. اكتب RESET-DORISIO للتأكيد:",
    );
    if (confirmation !== "RESET-DORISIO") return;
    setRunning(true);
    setResult(null);
    try {
      const response = await api<{ ok: boolean; message: string }>("/api/admin/reset", {
        method: "POST",
        body: { confirm: "RESET-DORISIO" },
      });
      setResult(response.message);
      toast(response.message, response.ok ? "success" : "warning");
      if (response.ok) onChanged();
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "تعذّر تصفير الدوري.";
      setResult(message);
      toast(message, "error");
    } finally {
      setRunning(false);
    }
  }, [onChanged, toast]);

  return (
    <Panel className="p-6">
      <p className="micro">SETTINGS</p>
      <h2 className="mt-1 text-xl font-extrabold">الإعدادات وبيانات التطوير</h2>

      <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-line bg-elevated/40 p-5">
          <h3 className="font-bold">بيانات التطوير التجريبية</h3>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">
            ينشئ سكربت التطوير 5 فرق، و4 لاعبين في كل فريق (حارس ومدافع ووسط ومهاجم)، وجدولاً
            كاملاً مع مباريات وأحداث تجريبية. إذا كانت البيانات موجودة فلن يستبدلها.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="pitch"
              loading={running}
              onClick={() => {
                if (window.confirm("إنشاء بيانات تجريبية لا يستبدل البيانات الحالية. متابعة؟")) {
                  void seed();
                }
              }}
            >
              <RefreshCw size={16} /> إنشاء فرق وبيانات تجريبية
            </Button>
            {result && <span className="text-[0.82rem] text-muted">{result}</span>}
          </div>
        </div>

        <div className="rounded-xl border border-alert/40 bg-alert/[0.06] p-5">
          <h3 className="font-bold text-alert">تصفير الدوري بالكامل</h3>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">
            يحذف الفرق واللاعبين والمباريات والتشكيلات والأحداث والجوائز والإعلانات والإشعارات.
            حسابات المستخدمين والمدير تظل موجودة حتى لا تفقد إمكانية الدخول.
          </p>
          <Button variant="danger" loading={running} onClick={() => void resetLeague()} className="mt-4">
            <Trash2 size={16} /> تصفير كل بيانات الدوري
          </Button>
        </div>

        <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-5">
          <h3 className="font-bold text-gold-light">إنشاء أول مدير للدوري</h3>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-muted">
            لا يمكن للمستخدم اختيار صلاحية «مدير» عند التسجيل. لإنشاء أول مدير، شغّل الأوامر
            التالية من بيئة موثوقة (الخادم) — التفاصيل الكاملة في SETUP.md:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink p-3 text-[0.78rem] text-live" dir="ltr">
            {`npm run promote:admin -- --email=you@dorisio.app`}
          </pre>
        </div>
      </div>
    </Panel>
  );
}
