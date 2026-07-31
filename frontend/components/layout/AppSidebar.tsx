import { useEffect } from "react";
import {
  Newspaper,
  LineChart,
  BarChart2,
  Globe,
  Layers,
  Activity,
  X,
  TrendingUp,
  TrendingDown,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type ViewKey =
  | "overview"
  | "news"
  | "technical"
  | "fundamental"
  | "market"
  | "sector"
  | "bull"
  | "bear"
  | "verdict";

interface Item {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
}

const ANALYSTS: Item[] = [
  { key: "technical", label: "Technical Analyst", icon: LineChart },
  { key: "fundamental", label: "Fundamental Analyst", icon: BarChart2 },
  { key: "market", label: "Market Analyst", icon: Globe },
  { key: "sector", label: "Sector Analyst", icon: Layers },
  { key: "news", label: "News Analyst", icon: Newspaper },
];

const DEBATE: Item[] = [
  { key: "bull", label: "Bull Thesis", icon: TrendingUp },
  { key: "bear", label: "Bear Thesis", icon: TrendingDown },
  { key: "verdict", label: "Manager Verdict", icon: Scale },
];

export function AppSidebar({
  active,
  onSelect,
  isMobile = false,
  isOpen = true,
  onClose,
}: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMobile, isOpen]);

  const handleSelect = (k: ViewKey) => {
    onSelect(k);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <>
      <div className="flex-1 py-4 px-2">
        <Row
          item={{ key: "overview", label: "Equity Overview", icon: Activity }}
          active={active === "overview"}
          onSelect={handleSelect}
        />
        
        <SectionLabel>ANALYSTS</SectionLabel>
        {ANALYSTS.map((it) => (
          <Row key={it.key} item={it} active={active === it.key} onSelect={handleSelect} />
        ))}

        <SectionLabel>INVESTMENT DEBATE</SectionLabel>
        {DEBATE.map((it) => (
          <Row key={it.key} item={it} active={active === it.key} onSelect={handleSelect} />
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4 p-5 pb-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-semibold text-[13px] text-zinc-900">Artha Analytics</span>
          <span className="text-[11px] text-zinc-500">Designed with precision.</span>
        </div>
        <div className="h-px w-full bg-[var(--border)]" />
        <a
          href="https://github.com/conceptworksx/Agentic-Trade-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>Contribute</span>
        </a>
      </div>
    </>
  );

  // ── Mobile: slide-in overlay ──
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sidebar panel */}
        <aside
          role="dialog"
          aria-label="Navigation"
          className="relative z-10 flex w-64 max-w-[80vw] shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-white shadow-xl animate-[slideInLeft_0.2s_ease-out]"
        >
          {/* Close button */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="font-mono text-[11px] font-bold tracking-widest text-zinc-500">NAVIGATION</span>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X size={16} />
            </button>
          </div>
          {sidebarContent}
        </aside>
      </div>
    );
  }

  // ── Desktop: standard aside ──
  return (
    <aside className="hidden md:flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-white">
      {sidebarContent}
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-2 pt-6 font-mono text-[11px] font-bold tracking-widest text-zinc-500">
      {children}
    </div>
  );
}

function Row({
  item,
  active,
  onSelect,
}: {
  item: Item;
  active: boolean;
  onSelect: (k: ViewKey) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.key)}
      className={`flex h-10 w-full items-center gap-3 px-3 text-left text-[14px] font-medium transition-all rounded-lg ${active
          ? "bg-[var(--foreground)] text-white"
          : "text-[var(--muted-foreground)] hover:bg-zinc-50 hover:text-[var(--foreground)]"
        }`}
    >
      <Icon size={16} />
      <span>{item.label}</span>
    </button>
  );
}