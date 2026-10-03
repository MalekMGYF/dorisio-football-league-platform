"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { PlayerCard } from "@/components/player";
import { Button, EmptyState, Panel, Skeleton, cn } from "@/components/ui";
import { useApiData } from "@/lib/client/hooks";
import type { OverviewPayload } from "@/lib/types";
import { POSITION_AR, POSITIONS } from "@/lib/domain";

const SORTS = [
  { value: "goals", label: "الأهداف" },
  { value: "assists", label: "التمريرات الحاسمة" },
  { value: "rating", label: "التقييم" },
  { value: "name", label: "الاسم" },
] as const;

export default function PlayersPage() {
  const { data, loading, error, reload } = useApiData<OverviewPayload>("/api/overview", "overview");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<string>("all");
  const [team, setTeam] = useState<string>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("goals");

  const players = useMemo(() => {
    const list = (data?.players ?? []).filter((player) => {
      const matchesQuery = query
        ? player.name.includes(query) || (player.teamName ?? "").includes(query)
        : true;
      const matchesPosition = position === "all" ? true : player.position === position;
      const matchesTeam = team === "all" ? true : player.teamId === team;
      return matchesQuery && matchesPosition && matchesTeam;
    });

    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ar");
      if (sort === "assists") return b.stats.assists - a.stats.assists;
      if (sort === "rating") return (b.stats.ratingAvg ?? 0) - (a.stats.ratingAvg ?? 0);
      return b.stats.goals - a.stats.goals;
    });
  }, [data, query, position, team, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="flex flex-col gap-2">
        <p className="micro">PLAYERS</p>
        <h1 className="text-[clamp(2.1rem,6vw,3.4rem)] font-extrabold leading-tight">
          اللاعبون
        </h1>
        <p className="mt-2 max-w-2xl text-muted leading-relaxed">
          بطاقات اللاعبين مع الأهداف والتمريرات الحاسمة والمباريات والتقييمات وجوائز رجل
          المباراة.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن لاعب أو فريق…"
            aria-label="بحث عن لاعب"
            className="pr-10"
          />
        </div>
        <select
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          aria-label="تصفية حسب المركز"
        >
          <option value="all">كل المراكز</option>
          {POSITIONS.map((item) => (
            <option key={item} value={item}>
              {POSITION_AR[item]}
            </option>
          ))}
        </select>
        <select
          value={team}
          onChange={(event) => setTeam(event.target.value)}
          aria-label="تصفية حسب الفريق"
        >
          <option value="all">كل الفرق</option>
          {(data?.teams ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          aria-label="الترتيب حسب"
        >
          {SORTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : error && !data ? (
          <Panel>
            <EmptyState
              title="تعذّر تحميل اللاعبين"
              body={error}
              action={<Button onClick={reload}>إعادة المحاولة</Button>}
            />
          </Panel>
        ) : players.length === 0 ? (
          <Panel>
            <EmptyState
              icon={<Users size={26} />}
              title="لا توجد نتائج مطابقة"
              body="جرّب تعديل البحث أو الفلاتر لعرض لاعبين آخرين."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {players.map((player, index) => (
              <PlayerCard key={player.id} player={player} index={index} />
            ))}
          </div>
        )}
      </div>

      <p className={cn("micro mt-8", players.length === 0 && "hidden")}>
        {players.length} PLAYERS
      </p>
    </div>
  );
}
