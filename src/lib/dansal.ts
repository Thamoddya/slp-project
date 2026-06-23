import { Utensils, CupSoda, ShowerHead, Cross, Star } from "lucide-react";
import type { DansalType } from "@/types";

/** Lucide icon per Dansal/service type — used in the user-side lists & chips. */
export const DANSAL_ICON: Record<string, typeof Utensils> = {
  food: Utensils,
  drink: CupSoda,
  water: ShowerHead,
  medical: Cross,
  other: Star,
};

/** Soft tint behind a list icon. */
export const DANSAL_TINT: Record<string, string> = {
  food: "#fff3ea",
  drink: "#eaf1ff",
  water: "#e6f6fa",
  medical: "#ffecec",
  other: "#fff6e6",
};

/** Strong accent colour for the icon / map pin. */
export const DANSAL_COLOR: Record<string, string> = {
  food: "#e8590c",
  drink: "#2563eb",
  water: "#0891b2",
  medical: "#dc2626",
  other: "#d97706",
};

export const dansalIcon = (type: DansalType | string) => DANSAL_ICON[type] || Star;
export const dansalTint = (type: DansalType | string) => DANSAL_TINT[type] || "#f1f4fb";
export const dansalColor = (type: DansalType | string) => DANSAL_COLOR[type] || "#1b3a72";
