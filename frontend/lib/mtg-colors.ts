import type { CSSProperties } from "react";

export const MTG_COLOR_META = [
  { value: "White",     symbol: "W", solid: "#c8a951", glow: "rgba(248,231,120,0.22)", pip: "bg-yellow-100 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-600" },
  { value: "Blue",      symbol: "U", solid: "#3b82f6", glow: "rgba(59,130,246,0.22)",  pip: "bg-blue-100  dark:bg-blue-900/60  text-blue-800  dark:text-blue-200  border-blue-300  dark:border-blue-600"  },
  { value: "Black",     symbol: "B", solid: "#8b5cf6", glow: "rgba(139,92,246,0.22)",  pip: "bg-gray-200  dark:bg-gray-700     text-gray-800  dark:text-gray-100  border-gray-400  dark:border-gray-500"  },
  { value: "Red",       symbol: "R", solid: "#ef4444", glow: "rgba(239,68,68,0.22)",   pip: "bg-red-100   dark:bg-red-900/60   text-red-800   dark:text-red-200   border-red-300   dark:border-red-600"   },
  { value: "Green",     symbol: "G", solid: "#22c55e", glow: "rgba(34,197,94,0.22)",   pip: "bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600" },
  { value: "Colorless", symbol: "C", solid: "#94a3b8", glow: "rgba(148,163,184,0.22)", pip: "bg-slate-100 dark:bg-slate-700    text-slate-600 dark:text-slate-300  border-slate-300 dark:border-slate-500" },
] as const;

export type ColorValue = (typeof MTG_COLOR_META)[number]["value"];

export function parseColors(raw: string | null | undefined): ColorValue[] {
  if (!raw) return [];
  return raw.split(",").filter((c) => MTG_COLOR_META.some((m) => m.value === c)) as ColorValue[];
}

export function getAccentColor(colors: ColorValue[]): string {
  if (colors.length === 0) return "#3b82f6";
  return MTG_COLOR_META.find((m) => m.value === colors[0])?.solid ?? "#3b82f6";
}

export function getFrameStyle(colors: ColorValue[]): CSSProperties {
  if (colors.length === 0) return {};
  const stops = colors.map((c) => MTG_COLOR_META.find((m) => m.value === c)?.solid ?? "#3b82f6");
  return {
    borderImage: stops.length === 1
      ? undefined
      : `linear-gradient(135deg, ${stops.join(", ")}) 1`,
    borderColor: stops.length === 1 ? stops[0] : undefined,
  };
}

export function getGlowStyle(colors: ColorValue[]): CSSProperties {
  if (colors.length === 0) return {};
  const stops = colors.map((c) => MTG_COLOR_META.find((m) => m.value === c)?.glow ?? "transparent");
  if (stops.length === 1) {
    return { background: `radial-gradient(ellipse 90% 60% at 50% -10%, ${stops[0]}, transparent 70%)` };
  }
  return { background: `linear-gradient(135deg, ${stops.join(", ")})` };
}
