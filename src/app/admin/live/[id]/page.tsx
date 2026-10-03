"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CircleDot,
  CloudOff,
  Flag,
  LayoutGrid,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import { TeamCrest } from "@/components/crest";
import { EventTimeline, ScoreDigit, type TimelineEntry } from "@/components/match";
import { PositionBadge } from "@/components/player";
import {
  Button,
  EmptyState,
  Field,
  FormError,
  Modal,
  Panel,
  Pill,
  Skeleton,
  cn,
  useToast,
} from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import { useSession } from "@/lib/client/session";
import { api, ApiClientError } from "@/lib/client/api";
import { queueAdd, queueList, type QueuedEvent } from "@/lib/client/offline";
import type { MatchBundle } from "@/lib/types";
import { EVENT_TYPE_AR, POSITIONS, POSITION_AR } from "@/lib/domain";
import { formatTime } from "@/lib/format";

type ActionType = "goal" | "assist" | "yellow" | "red" | "substitution" | "note";

const ACTION_BUTTONS: { value: ActionType; label: string; emoji: string; tone: string }[] = [
  { value: "goal", label: "هدف", emoji: "⚽", tone: "border-live/50 bg-live/12 text-live" },
  { value: "assist", label: "تمريرة حاسمة", emoji: "🎯", tone: "border-pitch/60 bg-pitch/15 text-white" },
  { value: "yellow", label: "بطاقة صفراء", emoji: "🟨", tone: "border-amber/50 bg-amber/12 text-amber" },
  { value: "red", label: "بطاقة حمراء", emoji: "🟥", tone: "border-alert/50 bg-alert/12 text-alert" },
  {
    value: "substitution",
    label: "تبديل",
    emoji: "🔄",
    tone: "border-line bg-elevated text-muted",
  },
  { value: "note", label: "ملاحظة", emoji: "📝", tone: "border-line bg-elevated text-muted" },
];

export default function LiveMatchCenter() {
  const params = useParams<{ id: string }>();
  const matchId = params.id;
  const { data, loading, error, reload } = useApiData<MatchBundle>(
    `/api/matches/${matchId}`,
    `match:${matchId}`,
    [matchId],
  );
  const { isAdmin, user } = useSession();
  const toast = useToast();

  const [action, setAction] = useState<ActionType>("goal");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);
  const [playerOutId, setPlayerOutId] = useState<string | null>(null);
  const [minute, setMinute] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const [pending, setPending] = useState<QueuedEvent[]>([]);
  const [editTarget, setEditTarget] = useState<TimelineEntry | null>(null);
  const [editMinute, setEditMinute] = useState(0);
  const [lineupOpen, setLineupOpen] = useState(false);
  const initialised = useRef(false);

  const match = data?.match ?? null;
  const homePlayers = useMemo(
    () => (data?.players ?? []).filter((p) => p.teamId === match?.homeTeamId),
    [data, match],
  );
  const awayPlayers = useMemo(
    () => (data?.players ?? []).filter((p) => p.teamId === match?.awayTeamId),
    [data, match],
  );
  const selectedTeamPlayers = teamId === match?.homeTeamId ? homePlayers : awayPlayers;

  const refreshQueue = useCallback(async () => {
    setPending(await queueList());
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  /* live stream */
  useEffect(() => {
    if (!matchId) return;
    const source = new EventSource(`/api/matches/${matchId}/stream`);
    source.addEventListener("update", () => reload());
    return () => source.close();
  }, [matchId, reload]);

  useEffect(() => {
    if (!match || initialised.current) return;
    initialised.current = true;
    setTeamId(match.homeTeamId);
    setMinute(match.minute || 0);
  }, [match]);

  useEffect(() => {
    if (match && !initialised.current) return;
  }, [match]);

  const postEvent = useCallback(
    async (payload: Record<string, unknown>, eventId: string) => {
      try {
        await api(`/api/matches/${matchId}/events`, { method: "POST", body: payload });
        toast("تم تسجيل الحدث.", "success");
        reload();
      } catch (err) {
        const offlineFailure =
          err instanceof ApiClientError && (err.code === "network" || err.status === 0);
        if (offlineFailure) {
          await queueAdd({
            id: eventId,
            kind: "match-event",
            matchId,
            payload,
            clientAt: new Date().toISOString(),
          });
          await refreshQueue();
          toast("لا يوجد اتصال — تم حفظ الحدث وسينتظر المزامنة.", "warning");
        } else {
          const message =
            err instanceof ApiClientError ? err.message : "تعذّر تسجيل الحدث.";
          setError2(message);
          toast(message, "error");
        }
      }
    },
    [matchId, reload, refreshQueue, toast],
  );

  const submitEvent = async () => {
    if (!match) return;
    setError2(null);
    if (action !== "note" && !playerId) {
      setError2("اختر اللاعب أولاً قبل تسجيل الحدث.");
      return;
    }
    if (action === "substitution" && !playerOutId) {
      setError2("اختر اللاعب الخارج والداخل لتسجيل التبديل.");
      return;
    }

    setBusy(true);
    const eventId = crypto.randomUUID();
    await postEvent(
      {
        id: eventId,
        type: action,
        teamId,
        playerId: action === "substitution" ? null : playerId,
        assistPlayerId: action === "goal" ? assistPlayerId : null,
        playerInId: action === "substitution" ? playerId : null,
        playerOutId: action === "substitution" ? playerOutId : null,
        minute,
        note: note || undefined,
        clientAt: new Date().toISOString(),
      },
      eventId,
    );
    setBusy(false);
    setPlayerId(null);
    setAssistPlayerId(null);
    setPlayerOutId(null);
    setNote("");
  };

  const setMatchState = async (actionName: string) => {
    if (!match) return;
    setBusy(true);
    try {
      await api(`/api/matches/${match.id}`, { method: "PATCH", body: { action: actionName } });
      toast("تم تحديث حالة المباراة.", "success");
      reload();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "تعذّر تحديث الحالة.", "error");
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (event: TimelineEntry) => {
    if (!match) return;
    setBusy(true);
    try {
      await api(`/api/matches/${match.id}/events/${event.id}`, { method: "DELETE" });
      toast("تم حذف الحدث وإعادة احتساب النتيجة.", "success");
      reload();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "تعذّر حذف الحدث.", "error");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!match || !editTarget) return;
    setBusy(true);
    try {
      await api(`/api/matches/${match.id}/events/${editTarget.id}`, {
        method: "PATCH",
        body: { minute: editMinute },
      });
      toast("تم تصحيح الحدث.", "success");
      setEditTarget(null);
      reload();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : "تعذّر تعديل الحدث.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !data || !match) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="تعذّر فتح مركز المباراة"
          body={error ?? "المباراة غير موجودة."}
          action={
            <Link href="/admin">
              <Button>لوحة الإدارة</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const timeline: TimelineEntry[] = data.events.map((event) => ({
    ...event,
    playerName:
      data.players.find((p) => p.id === event.playerId)?.name ?? EVENT_TYPE_AR[event.type],
    teamName:
      event.teamId === match.homeTeamId
        ? data.homeTeam?.name
        : event.teamId === match.awayTeamId
          ? data.awayTeam?.name
          : null,
    assistName: data.players.find((p) => p.id === event.assistPlayerId)?.name ?? null,
    playerInName: data.players.find((p) => p.id === event.playerInId)?.name ?? null,
    playerOutName: data.players.find((p) => p.id === event.playerOutId)?.name ?? null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 pb-24">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.82rem] font-bold text-muted hover:text-paper"
          >
            <ArrowRight size={15} /> لوحة الإدارة
          </Link>
          {isAdmin && (
            <Pill tone="gold">
              <ShieldCheck size={13} /> وضع المدير
            </Pill>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/matches/${match.id}`}
            className="rounded-lg border border-line px-3 py-2 text-[0.82rem] font-bold text-muted hover:text-paper"
          >
            عرض صفحة المباراة
          </Link>
          <Button variant="outline" size="sm" onClick={() => reload()}>
            <RefreshCw size={14} /> تحديث
          </Button>
        </div>
      </div>

      {/* scoreboard */}
      <section className="relative mt-5 overflow-hidden rounded-3xl border border-line band grain">
        <div className="absolute inset-0 pitch-lines opacity-25" />
        <div className="relative px-4 py-7">
          <div className="flex items-center justify-center gap-2.5">
            <Pill tone={match.status === "live" ? "live" : match.status === "ft" ? "neutral" : "gold"}>
              {match.status === "live"
                ? "مباشر"
                : match.status === "ht"
                  ? "استراحة"
                  : match.status === "ft"
                    ? "انتهت"
                    : "لم تبدأ"}
            </Pill>
            <span className="micro">{data.league?.name}</span>
            <span className="num text-sm text-dim">
              {match.kickoffAt ? formatTime(match.kickoffAt) : ""}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <TeamCrest team={data.homeTeam} size={62} />
              <p className="font-extrabold">{data.homeTeam?.name}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-3">
                <ScoreDigit value={match.homeScore} highlight size="md" />
                <span className="num text-2xl text-dim">:</span>
                <ScoreDigit value={match.awayScore} highlight size="md" />
              </div>
              <p className="num mt-2 text-2xl font-bold text-live">{match.minute}&apos;</p>
            </div>
            <div className="flex flex-col items-center gap-2.5 text-center">
              <TeamCrest team={data.awayTeam} size={62} />
              <p className="font-extrabold">{data.awayTeam?.name}</p>
            </div>
          </div>
        </div>
      </section>

      {/* pending sync */}
      <AnimatePresence>
        {pending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber/45 bg-amber/12 px-4 py-3"
          >
            <CloudOff size={18} className="text-amber" />
            <p className="text-[0.88rem] font-bold text-amber">
              {pending.length} حدثاً محفوظاً على الجهاز بانتظار المزامنة عند عودة الاتصال.
            </p>
            <Pill tone="amber">PENDING SYNC</Pill>
          </motion.div>
        )}
      </AnimatePresence>

      {/* match state controls */}
      <section className="mt-5">
        <p className="micro">MATCH CONTROL</p>
        <h2 className="mt-1 text-xl font-extrabold">التحكم في المباراة</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Button
            size="lg"
            variant={match.status === "scheduled" ? "gold" : "outline"}
            onClick={() => void setMatchState("start")}
            disabled={busy || match.status === "ft"}
            className="h-16"
          >
            <Play size={20} /> بدء المباراة
          </Button>
          <Button
            size="lg"
            variant={match.status === "ht" ? "gold" : "outline"}
            onClick={() => void setMatchState(match.status === "ht" ? "second_half" : "half")}
            disabled={busy || match.status === "ft" || match.status === "scheduled"}
            className="h-16"
          >
            {match.status === "ht" ? <Play size={20} /> : <Pause size={20} />}
            {match.status === "ht" ? "بدء الشوط الثاني" : "استراحة"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => void setMatchState(match.timerRunning ? "pause" : "resume")}
            disabled={busy || match.status === "ft" || match.status === "scheduled"}
            className="h-16"
          >
            {match.timerRunning ? <Pause size={20} /> : <Play size={20} />}
            {match.timerRunning ? "إيقاف مؤقت" : "استئناف"}
          </Button>
          <Button
            size="lg"
            variant="danger"
            onClick={() => void setMatchState("finish")}
            disabled={busy || match.status === "ft"}
            className="h-16"
          >
            <Square size={18} /> نهاية المباراة
          </Button>
        </div>
        <p className="mt-3 text-[0.8rem] leading-relaxed text-dim">
          يُحفظ توقيت المباراة على الخادم، لذلك تعود الدقيقة صحيحة بعد التحديث أو إعادة
          الاتصال. لا يُسمح بتسجيل أحداث بعد انتهاء المباراة إلا بتصحيحها من المدير.
        </p>
      </section>

      {/* event composer */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="micro">EVENT COMPOSER</p>
            <h2 className="mt-1 text-xl font-extrabold">تسجيل حدث سريع</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLineupOpen(true)}>
            <LayoutGrid size={15} /> إدارة التشكيلة
          </Button>
        </div>

        <Panel className="mt-4 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {ACTION_BUTTONS.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  setAction(item.value);
                  setPlayerId(null);
                  setAssistPlayerId(null);
                  setPlayerOutId(null);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-4 py-4 text-[0.95rem] font-bold transition-colors",
                  action === item.value ? item.tone : "border-line bg-elevated/40 text-muted hover:text-paper",
                )}
              >
                <span className="text-lg" aria-hidden="true">
                  {item.emoji}
                </span>
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              onClick={() => setTeamId(match.homeTeamId)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[0.92rem] font-bold transition-colors",
                teamId === match.homeTeamId
                  ? "border-gold/60 bg-gold/12 text-gold-light"
                  : "border-line bg-elevated/40 text-muted",
              )}
            >
              <TeamCrest team={data.homeTeam} size={24} />
              {data.homeTeam?.name}
            </button>
            <button
              onClick={() => setTeamId(match.awayTeamId)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[0.92rem] font-bold transition-colors",
                teamId === match.awayTeamId
                  ? "border-gold/60 bg-gold/12 text-gold-light"
                  : "border-line bg-elevated/40 text-muted",
              )}
            >
              <TeamCrest team={data.awayTeam} size={24} />
              {data.awayTeam?.name}
            </button>
          </div>

          <div className="mt-5">
            <p className="micro mb-2.5">
              {action === "substitution" ? "اللاعب الداخل" : "اللاعب"}
            </p>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto scroll-x sm:grid-cols-3 lg:grid-cols-4">
              {selectedTeamPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setPlayerId(player.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right transition-colors",
                    playerId === player.id
                      ? "border-live/60 bg-live/12"
                      : "border-line bg-elevated/40 hover:border-gold/40",
                  )}
                >
                  <span className="num w-7 text-center text-dim">{player.shirtNumber ?? "—"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.86rem] font-bold">{player.name}</p>
                    <PositionBadge position={player.position} />
                  </div>
                </button>
              ))}
              {selectedTeamPlayers.length === 0 && (
                <p className="col-span-full text-sm text-dim">
                  لا يوجد لاعبون مسجلون في هذا الفريق بعد.
                </p>
              )}
            </div>
          </div>

          {action === "goal" && (
            <div className="mt-5">
              <p className="micro mb-2.5">صانع الهدف (اختياري)</p>
              <select
                value={assistPlayerId ?? ""}
                onChange={(e) => setAssistPlayerId(e.target.value || null)}
              >
                <option value="">— بدون تمريرة حاسمة —</option>
                {selectedTeamPlayers
                  .filter((player) => player.id !== playerId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {action === "substitution" && (
            <div className="mt-5">
              <p className="micro mb-2.5">اللاعب الخارج</p>
              <select
                value={playerOutId ?? ""}
                onChange={(e) => setPlayerOutId(e.target.value || null)}
              >
                <option value="">— اختر اللاعب الخارج —</option>
                {selectedTeamPlayers
                  .filter((player) => player.id !== playerId)
                  .map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-[140px_1fr]">
            <Field label="الدقيقة">
              <input
                type="number"
                min={0}
                max={130}
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="num text-center text-lg"
              />
            </Field>
            <Field label="ملاحظة (اختياري)">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: تسديدة من خارج منطقة الجزاء"
              />
            </Field>
          </div>

          <FormError message={error2} />

          <Button
            variant="gold"
            size="lg"
            className="mt-5 w-full"
            loading={busy}
            onClick={() => void submitEvent()}
          >
            <Plus size={20} /> تسجيل {ACTION_BUTTONS.find((a) => a.value === action)?.label}
          </Button>
          <p className="mt-3 text-center text-[0.78rem] text-dim">
            يُنشأ معرّف فريد لكل حدث على الجهاز، لذلك إعادة الإرسال (أو المزامنة بعد انقطاع
            الشبكة) لن تُنشئ أهدافاً مكررة.
          </p>
        </Panel>
      </section>

      {/* timeline */}
      <section className="mt-8">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="micro">LIVE TIMELINE</p>
              <h2 className="mt-1 text-xl font-extrabold">الخط الزمني</h2>
            </div>
            <Pill tone="neutral">{timeline.length} حدث</Pill>
          </div>
          <div className="mt-5">
            <EventTimeline
              events={timeline}
              onEdit={(event) => {
                setEditTarget(event);
                setEditMinute(event.minute);
              }}
              onDelete={(event) => void deleteEvent(event)}
            />
          </div>
        </Panel>
      </section>

      {/* edit modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="تصحيح الحدث"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            يمكنك تصحيح الدقيقة المرتبطة بالحدث. يتم إعادة احتساب النتيجة والإحصائيات تلقائياً
            بعد أي تعديل أو حذف.
          </p>
          <Field label="الدقيقة">
            <input
              type="number"
              min={0}
              max={130}
              value={editMinute}
              onChange={(e) => setEditMinute(Number(e.target.value))}
              className="num text-center text-lg"
            />
          </Field>
          <Button variant="gold" loading={busy} onClick={() => void saveEdit()} className="w-full">
            حفظ التصحيح
          </Button>
        </div>
      </Modal>

      {/* lineup modal */}
      <Modal open={lineupOpen} onClose={() => setLineupOpen(false)} title="إدارة التشكيلة" wide>
        <LineupEditor bundle={data} onSaved={() => reload()} />
      </Modal>

      {!user && (
        <p className="mt-6 text-center text-sm text-dim">
          يجب تسجيل الدخول بحساب مدير لتسجيل الأحداث.
        </p>
      )}
    </div>
  );
}

function LineupEditor({
  bundle,
  onSaved,
}: {
  bundle: MatchBundle;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [teamId, setTeamId] = useState<string>(bundle.match.homeTeamId);
  const [formation, setFormation] = useState(bundle.match.homeFormation ?? "2-2");
  const [entries, setEntries] = useState<Record<string, { isStarting: boolean; position: string }>>(
    () => {
      const map: Record<string, { isStarting: boolean; position: string }> = {};
      for (const item of bundle.lineups) {
        map[item.playerId] = { isStarting: item.isStarting, position: item.position };
      }
      return map;
    },
  );
  const [saving, setSaving] = useState(false);

  const squad = bundle.players.filter((player) => player.teamId === teamId);

  const save = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(entries)
        .filter(([playerId]) => squad.some((player) => player.id === playerId))
        .map(([playerId, value], index) => ({
          playerId,
          isStarting: value.isStarting,
          position: value.position,
          sortIndex: index,
        }));
      await api(`/api/matches/${bundle.match.id}/lineup`, {
        method: "PUT",
        body: { teamId, formation, entries: payload },
      });
      toast("تم حفظ التشكيلة.", "success");
      onSaved();
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "تعذّر حفظ التشكيلة.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[
          { id: bundle.match.homeTeamId, name: bundle.homeTeam?.name ?? "المضيف" },
          { id: bundle.match.awayTeamId, name: bundle.awayTeam?.name ?? "الضيف" },
        ].map((team) => (
          <button
            key={team.id}
            onClick={() => setTeamId(team.id)}
            className={cn(
              "flex-1 rounded-xl border px-4 py-3 text-[0.9rem] font-bold transition-colors",
              teamId === team.id
                ? "border-gold/60 bg-gold/12 text-gold-light"
                : "border-line bg-elevated/40 text-muted",
            )}
          >
            {team.name}
          </button>
        ))}
      </div>

      <Field label="الخطة التكتيكية">
        <select value={formation} onChange={(e) => setFormation(e.target.value)}>
          {["1-2", "2-1", "2-2", "1-2-1", "2-1-1", "3-1"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-2">
        {squad.map((player) => {
          const entry = entries[player.id] ?? { isStarting: false, position: player.position };
          return (
            <div
              key={player.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-elevated/40 px-3.5 py-2.5"
            >
              <span className="num w-7 text-center text-dim">{player.shirtNumber ?? "—"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9rem] font-bold">{player.name}</p>
              </div>
              <select
                value={entry.position}
                onChange={(e) =>
                  setEntries({
                    ...entries,
                    [player.id]: { ...entry, position: e.target.value },
                  })
                }
                className="w-28"
                aria-label={`مركز ${player.name}`}
              >
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {POSITION_AR[position]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setEntries({
                    ...entries,
                    [player.id]: { ...entry, isStarting: !entry.isStarting },
                  })
                }
                className={cn(
                  "rounded-lg border px-3 py-2 text-[0.78rem] font-bold transition-colors",
                  entry.isStarting
                    ? "border-live/50 bg-live/12 text-live"
                    : "border-line bg-surface text-muted",
                )}
              >
                {entry.isStarting ? "أساسي" : "بديل"}
              </button>
            </div>
          );
        })}
        {squad.length === 0 && (
          <EmptyState
            icon={<Users size={22} />}
            title="لا يوجد لاعبون في هذا الفريق"
            body="أضف اللاعبين من قسم «اللاعبون» في لوحة الإدارة."
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Pill tone="neutral">
          <Flag size={12} />{" "}
          {Object.values(entries).filter((entry) => entry.isStarting).length} أساسي
        </Pill>
        <Button variant="gold" loading={saving} onClick={() => void save()}>
          <CircleDot size={16} /> حفظ التشكيلة
        </Button>
      </div>
    </div>
  );
}
