import { Map as MapIcon, Utensils, ParkingSquare, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

export type PublicTab = "map" | "places" | "parking" | "more";

interface BottomNavProps {
  active: PublicTab;
  onSelect: (tab: PublicTab) => void;
}

const ITEMS: { id: PublicTab; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { id: "map", icon: MapIcon, labelKey: "nav.map" },
  { id: "places", icon: Utensils, labelKey: "nav.places" },
  { id: "parking", icon: ParkingSquare, labelKey: "nav.parking" },
  { id: "more", icon: MoreHorizontal, labelKey: "nav.more" },
];

export default function BottomNav({ active, onSelect }: BottomNavProps) {
  const { t } = useTranslation();
  return (
    <nav
      className="z-30 flex shrink-0 items-stretch border-t border-cream-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {ITEMS.map(({ id, icon: Icon, labelKey }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            aria-label={t(labelKey)}
            aria-current={isActive ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors"
          >
            <span
              className={`flex h-9 w-12 items-center justify-center rounded-full transition-colors ${
                isActive ? "bg-navy-50 text-navy-700" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <span
              className={`text-[11px] font-semibold leading-none ${
                isActive ? "text-navy-700" : "text-muted-foreground"
              }`}
            >
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
