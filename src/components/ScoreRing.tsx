import { cn } from "@/lib/utils";

export function scoreBand(score: number) {
  if (score >= 80) return { label: "Alta compatibilidade", tone: "success" as const };
  if (score >= 60) return { label: "Boa compatibilidade", tone: "brand" as const };
  if (score >= 40) return { label: "Compatibilidade parcial", tone: "warning" as const };
  return { label: "Baixa compatibilidade", tone: "destructive" as const };
}

const toneColor: Record<string, string> = {
  success: "var(--success)",
  brand: "var(--primary)",
  warning: "var(--warning)",
  destructive: "var(--destructive)",
};

export function ScoreRing({
  score,
  size = 168,
  label,
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  const band = scoreBand(safe);
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Compatibilidade de ${safe} por cento — ${band.label}`}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={toneColor[band.tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold tabular-nums">{safe}</span>
          <span className="text-xs font-medium text-muted-foreground">de 100</span>
        </div>
      </div>
      <p className="text-sm font-semibold">{label ?? band.label}</p>
    </div>
  );
}
