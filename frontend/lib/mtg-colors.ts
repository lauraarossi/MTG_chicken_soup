import type { CSSProperties } from "react";

export const MTG_COLOR_META = [
  { value: "White",     symbol: "W", solid: "#c8a951", glow: "rgba(248,231,120,0.22)", pip: "bg-yellow-500 text-white" },
  { value: "Blue",      symbol: "U", solid: "#3b82f6", glow: "rgba(59,130,246,0.22)",  pip: "bg-blue-500  text-white" },
  { value: "Black",     symbol: "B", solid: "#8b5cf6", glow: "rgba(139,92,246,0.22)",  pip: "bg-violet-500 text-white" },
  { value: "Red",       symbol: "R", solid: "#ef4444", glow: "rgba(239,68,68,0.22)",   pip: "bg-red-500   text-white" },
  { value: "Green",     symbol: "G", solid: "#22c55e", glow: "rgba(34,197,94,0.22)",   pip: "bg-green-500 text-white" },
  { value: "Colorless", symbol: "C", solid: "#94a3b8", glow: "rgba(148,163,184,0.22)", pip: "bg-slate-400 text-white" },
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
