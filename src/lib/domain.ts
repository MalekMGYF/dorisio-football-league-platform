/** Shared domain constants + Arabic presentation maps. */

export const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_AR: Record<string, string> = {
  GK: "حارس مرمى",
  DEF: "مدافع",
  MID: "لاعب وسط",
  FWD: "مهاجم",
};

export const POSITION_SHORT_AR: Record<string, string> = {
  GK: "حارس",
  DEF: "دفاع",
  MID: "وسط",
  FWD: "هجوم",
};

export const MATCH_STATUS_AR: Record<string, string> = {
  scheduled: "قادمة",
  live: "مباشر",
  ht: "استراحة",
  ft: "انتهت",
  postponed: "مؤجلة",
  cancelled: "ملغاة",
};

export const LEAGUE_STATUS_AR: Record<string, string> = {
  upcoming: "قادم",
  active: "جاري",
  finished: "منتهي",
};

export type EventType =
  | "goal"
  | "own_goal"
  | "assist"
  | "yellow"
  | "red"
  | "substitution"
  | "kickoff"
  | "ht"
  | "ft"
  | "note";

export const EVENT_TYPE_AR: Record<string, string> = {
  goal: "هدف",
  own_goal: "هدف عكسي",
  assist: "تمريرة حاسمة",
  yellow: "بطاقة صفراء",
  red: "بطاقة حمراء",
  substitution: "تبديل",
  kickoff: "انطلاق المباراة",
  ht: "نهاية الشوط الأول",
  ft: "نهاية المباراة",
  note: "ملاحظة",
};

export const EVENT_EMOJI: Record<string, string> = {
  goal: "⚽",
  own_goal: "⚽",
  assist: "🎯",
  yellow: "🟨",
  red: "🟥",
  substitution: "🔄",
  kickoff: "🏁",
  ht: "⏸️",
  ft: "🏁",
  note: "📝",
};

export const AWARD_TYPES = [
  { value: "champion", label: "بطل الدوري" },
  { value: "top_scorer", label: "الهداف" },
  { value: "top_assist", label: "أكثر صانع أهداف" },
  { value: "best_player", label: "أفضل لاعب" },
  { value: "best_goalkeeper", label: "أفضل حارس" },
  { value: "player_of_week", label: "لاعب الأسبوع" },
  { value: "man_of_match", label: "رجل المباراة" },
] as const;

export const AWARD_TYPE_AR: Record<string, string> = Object.fromEntries(
  AWARD_TYPES.map((a) => [a.value, a.label]),
);

export const ROLE_AR: Record<string, string> = {
  user: "عضو",
  admin: "مدير الدوري",
};
