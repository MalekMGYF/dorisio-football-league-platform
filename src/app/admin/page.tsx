"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Award,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Radio,
  Settings,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import {
  AdminAnnouncements,
  AdminAwards,
  AdminLeagues,
  AdminMatches,
  AdminPlayers,
  AdminSettings,
  AdminTeams,
} from "@/components/admin";
import { Button, EmptyState, Panel, Pill, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import { useSession } from "@/lib/client/session";
import type { OverviewPayload } from "@/lib/types";
import { EVENT_TYPE_AR } from "@/lib/domain";

const SECTIONS = [
  { value: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { value: "leagues", label: "الدوري والمواسم", icon: Trophy },
  { value: "teams", label: "الفرق", icon: ShieldCheck },
  { value: "players", label: "اللاعبون", icon: Users },
  { value: "matches", label: "المباريات والجدول", icon: CalendarDays },
  { value: "awards", label: "الجوائز", icon: Award },
  { value: "announcements", label: "الإعلانات", icon: Megaphone },
  { value: "settings", label: "الإعدادات", icon: Settings },
] as const;

type Section = (typeof SECTIONS)[number]["value"];

export default function AdminPage() {
  const { user, loading: sessionLoading, isAdmin } = useSession();
  const { data, loading, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const [section, setSection] = useState<Section>("overview");

  const stats = useMemo(() => {
    const matches = data?.matches ?? [];
    return [
      {
        label: "TEAMS",
        value: data?.teams.length ?? 0,
        sub: "فريق مسجّل",
        tone: "text-paper",
      },
      {
        label: "PLAYERS",
        value: data?.players.length ?? 0,
        sub: "لاعب",
        tone: "text-paper",
      },
      {
        label: "LIVE",
        value: matches.filter((m) => m.status === "live" || m.status === "ht").length,
        sub: "مباراة مباشرة",
        tone: "text-live",
      },
      {
        label: "UPCOMING",
        value: matches.filter((m) => m.status === "scheduled").length,
        sub: "مباراة قادمة",
        tone: "text-gold-light",
      },
      {
        label: "PLAYED",
        value: matches.filter((m) => m.status === "ft").length,
        sub: "مباراة مكتملة",
        tone: "text-muted",
      },
      {
        label: "EVENTS",
        value: (data?.matches ?? []).reduce((total, match) => total + match.events.length, 0),
        sub: "حدث مسجّل",
        tone: "text-muted",
      },
    ];
  }, [data]);

  const recentEvents = useMemo(() => {
    return (data?.matches ?? [])
      .flatMap((match) =>
        match.events.map((event) => ({
          ...event,
          matchLabel: `${match.homeTeam?.name} × ${match.awayTeam?.name}`,
          matchId: match.id,
        })),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [data]);

  if (sessionLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Skeleton className="h-72 rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          title="تسجيل الدخول مطلوب"
          body="لوحة الإدارة متاحة فقط لمدير الدوري بعد تسجيل الدخول."
          action={
            <Link href="/auth">
              <Button variant="gold">تسجيل الدخول</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <EmptyState
          icon={<ShieldCheck size={26} />}
          title="ليست لديك صلاحية الوصول"
          body="هذه اللوحة مخصصة لمدير الدوري. الصلاحيات تُتحقق على الخادم أيضاً، وليس في الواجهة فقط."
          action={
            <Link href="/">
              <Button>العودة للرئيسية</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="micro">ADMINISTRATION</p>
          <h1 className="mt-1.5 text-[clamp(2rem,6vw,3.1rem)] font-extrabold leading-tight">
            لوحة إدارة الدوري
          </h1>
          <p className="mt-2 max-w-2xl text-muted leading-relaxed">
            إدارة كاملة للبطولة: الفرق، اللاعبون، الجدول، مركز المباراة المباشر، التشكيلات،
            الجوائز والإعلانات.
          </p>
        </div>
        {data?.liveMatch && (
          <Link href={`/admin/live/${data.liveMatch.id}`}>
            <Button variant="live" size="lg">
              <Radio size={18} /> فتح مركز المباراة المباشر
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:mt-8 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-surface p-2 sm:flex sm:gap-2 sm:overflow-x-auto sm:scroll-x lg:flex-col lg:overflow-visible">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = section === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setSection(item.value)}
                  className={cn(
                    "relative flex min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-[0.76rem] font-bold transition-colors sm:shrink-0 sm:justify-start sm:px-3.5 sm:text-[0.86rem]",
                    active
                      ? "bg-gold/12 text-gold-light"
                      : "text-muted hover:text-paper hover:bg-elevated",
                  )}
                >
                  <Icon size={17} />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">
          {loading && !data ? (
            <div className="space-y-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          ) : (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {section === "overview" && (
                <>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                    {stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-line bg-surface px-3.5 py-4"
                        style={{ boxShadow: "var(--shadow-soft)" }}
                      >
                        <p className={cn("num text-[1.75rem] font-bold leading-none", stat.tone)}>
                          {stat.value}
                        </p>
                        <p className="micro mt-1.5 text-[0.55rem]">{stat.label}</p>
                        <p className="mt-0.5 text-[0.72rem] text-dim">{stat.sub}</p>
                      </div>
                    ))}
                  </div>

                  <Panel className="p-4 sm:p-6">
                    <p className="micro">QUICK ACTIONS</p>
                    <h2 className="mt-1 text-xl font-extrabold">إجراءات سريعة</h2>
                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                      {[
                        {
                          label: "مركز المباراة المباشر",
                          icon: Radio,
                          section: "matches" as Section,
                          href: data?.liveMatch ? `/admin/live/${data.liveMatch.id}` : null,
                        },
                        { label: "إضافة فريق", icon: ShieldCheck, section: "teams" as Section },
                        { label: "إضافة لاعب", icon: Users, section: "players" as Section },
                        { label: "توليد الجدول", icon: CalendarDays, section: "matches" as Section },
                      ].map((action) => {
                        const Icon = action.icon;
                        const content = (
                          <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated/50 px-4 py-4 transition-colors hover:border-gold/50">
                            <Icon size={19} className="text-gold-light" />
                            <span className="text-[0.92rem] font-bold">{action.label}</span>
                          </div>
                        );
                        return action.href ? (
                          <Link key={action.label} href={action.href}>
                            {content}
                          </Link>
                        ) : (
                          <button
                            key={action.label}
                            onClick={() => setSection(action.section)}
                            className="text-right"
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  </Panel>

                  <Panel className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="micro">RECENT ACTIVITY</p>
                        <h2 className="mt-1 text-xl font-extrabold">آخر الأحداث</h2>
                      </div>
                      <Activity size={19} className="text-dim" />
                    </div>
                    <div className="mt-4 space-y-2">
                      {recentEvents.map((event) => (
                        <Link
                          key={event.id}
                          href={`/admin/live/${event.matchId}`}
                          className="flex items-center gap-3 rounded-xl border border-line bg-elevated/40 px-4 py-2.5 transition-colors hover:border-gold/45"
                        >
                          <span className="num w-10 text-gold-light font-bold">
                            {event.minute}&apos;
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.9rem] font-bold">
                              {EVENT_TYPE_AR[event.type] ?? event.type}
                            </p>
                            <p className="truncate text-[0.74rem] text-dim">{event.matchLabel}</p>
                          </div>
                          <Pill tone="neutral">{event.type}</Pill>
                        </Link>
                      ))}
                      {recentEvents.length === 0 && (
                        <EmptyState title="لا توجد أحداث بعد" body="ابدأ المباراة من مركز التحكم المباشر." />
                      )}
                    </div>
                  </Panel>
                </>
              )}

              {section === "leagues" && <AdminLeagues data={data} onChanged={reload} />}
              {section === "teams" && <AdminTeams data={data} onChanged={reload} />}
              {section === "players" && <AdminPlayers data={data} onChanged={reload} />}
              {section === "matches" && <AdminMatches data={data} onChanged={reload} />}
              {section === "awards" && <AdminAwards data={data} onChanged={reload} />}
              {section === "announcements" && (
                <AdminAnnouncements data={data} onChanged={reload} />
              )}
              {section === "settings" && <AdminSettings onChanged={reload} />}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
