import { initials } from "@/lib/format";
import type { Team } from "@/db/schema";

/**
 * Team crest — vector badge built from the team's own colours so every club has
 * a real identity mark even before an uploaded logo exists.
 */
export function TeamCrest({
  team,
  size = 44,
  className = "",
}: {
  team: Pick<Team, "name" | "shortName" | "primaryColor" | "secondaryColor" | "logoUrl"> | null;
  size?: number;
  className?: string;
}) {
  if (!team) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-xl border border-line bg-elevated text-dim ${className}`}
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }

  if (team.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={team.logoUrl}
        alt={`شعار ${team.name}`}
        width={size}
        height={size}
        className={`rounded-xl object-cover border border-line ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }

  const primary = team.primaryColor || "#0F7A46";
  const secondary = team.secondaryColor || "#E8C766";
  const label = team.shortName || initials(team.name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`شعار ${team.name}`}
      className={className}
    >
      <defs>
        <clipPath id={`crest-clip-${team.name}`}>
          <path d="M24 3 42 9v14.5C42 33.7 34.2 41.6 24 45.5 13.8 41.6 6 33.7 6 23.5V9L24 3Z" />
        </clipPath>
      </defs>
      <path
        d="M24 3 42 9v14.5C42 33.7 34.2 41.6 24 45.5 13.8 41.6 6 33.7 6 23.5V9L24 3Z"
        fill={primary}
        stroke={secondary}
        strokeWidth="1.4"
      />
      <g clipPath={`url(#crest-clip-${team.name})`}>
        <path d="M6 30h36v4H6z" fill={secondary} opacity="0.22" />
        <path d="M6 36h36v2.5H6z" fill={secondary} opacity="0.14" />
      </g>
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontFamily="Tajawal, sans-serif"
        fontWeight="800"
        fontSize="13"
        fill={secondary}
      >
        {label.slice(0, 3)}
      </text>
    </svg>
  );
}
