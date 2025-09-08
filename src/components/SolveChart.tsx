import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { format, type Solve } from "../lib/solves";

export function SolveChart({
  solves,
  hoverIndex,
  onHoverIndex,
}: {
  solves: Solve[];
  hoverIndex: number | null;
  onHoverIndex: Dispatch<SetStateAction<number | null>>;
}) {
  const SVG_W = 1000;
  const SVG_H = 300;
  const PAD_L = 8; 
  const PAD_R = 84; 
  const maxPoints = 300;
  const data = useMemo(() => {
    const arr = solves
      .map((s) => s.ms)
      .slice(0, maxPoints)
      .reverse();
    return arr;
  }, [solves]);

  const { path, minY, maxY } = useMemo(() => {
    if (data.length === 0) return { path: "", minY: 0, maxY: 1 };
    const innerW = SVG_W - PAD_L - PAD_R;
    const h = SVG_H;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const pad = Math.max(100, (max - min) * 0.1);
    const yMin = Math.max(0, min - pad);
    const yMax = max + pad;
    const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
    const yScale = (v: number) => h - ((v - yMin) / (yMax - yMin || 1)) * h;
    let d = "";
    data.forEach((v, i) => {
      const x = PAD_L + i * xStep;
      const y = yScale(v);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
    return { path: d, minY: yMin, maxY: yMax };
  }, [data]);

  // Prepare mapping/state before any early return to keep hook order stable
  const visibleCount = Math.min(solves.length, maxPoints);
  const visibleIndices = useMemo(
    () => Array.from({ length: visibleCount }, (_, i) => visibleCount - 1 - i),
    [visibleCount]
  );
  const [localHovered, setLocalHovered] = useState<number | null>(null);
  const w = SVG_W;
  const h = SVG_H;
  const innerW = w - PAD_L - PAD_R;
  const xStep = data.length > 1 ? innerW / (data.length - 1) : 0;
  const yScale = (v: number) => h - ((v - minY) / (maxY - minY || 1)) * h;

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        Add more solves to see the graph
      </div>
    );
  }

  // Create a few horizontal gridlines with labels
  const hLines = 4;
  const lines = Array.from({ length: hLines + 1 }, (_, i) => i / hLines);
  const labelFor = (t: number) => {
    const v = minY + (maxY - minY) * (1 - t);
    return format(v);
  };

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="size-full">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(79,140,255,0.35)" />
          <stop offset="100%" stopColor="rgba(45,212,191,0.15)" />
        </linearGradient>
      </defs>
      {lines.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={w - PAD_R}
            y1={h * t}
            y2={h * t}
            stroke="#263044"
            strokeDasharray="4 4"
          />
          <text
            x={w - 5}
            y={h * t - 4}
            textAnchor="end"
            fontSize="14"
            fill="var(--color-muted)"
          >
            {labelFor(t)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="url(#g1)" strokeWidth="4" />

      {data.map((v, i) => {
        const solveIdx = visibleIndices[i];
        const cx = PAD_L + i * xStep;
        const cy = yScale(v);
        const active = (localHovered ?? hoverIndex) === solveIdx;
        return (
          <g key={solveIdx}>
            {/* Visible point (no pointer events) */}
            <circle
              cx={cx}
              cy={cy}
              r={active ? 6 : 3}
              fill={active ? "var(--color-accent)" : "var(--color-muted)"}
              pointerEvents="none"
            />
            {/* Larger invisible hit area for easier hover */}
            <circle
              cx={cx}
              cy={cy}
              r={16}
              fill="#000"
              fillOpacity={0}
              className="cursor-pointer"
              onMouseEnter={() => {
                setLocalHovered(solveIdx);
                onHoverIndex(solveIdx);
              }}
              onMouseLeave={() => {
                setLocalHovered(null);
                // Only clear parent hover if it matches this point
                if (hoverIndex === solveIdx) onHoverIndex(null);
              }}
            />
          </g>
        );
      })}

      {(localHovered ?? hoverIndex) != null && (() => {
        const hovered = (localHovered ?? hoverIndex) as number;
        const i = visibleIndices.indexOf(hovered);
        if (i === -1) return null;
        const cx = PAD_L + i * xStep;
        const cy = yScale(data[i]);
        const label = format(solves[hovered]?.ms ?? NaN);
        const tw = 110;
        const th = 28;
        const tx = Math.min(
          Math.max(cx - tw / 2, PAD_L + 4),
          w - PAD_R - tw - 4
        );
        // Prefer placing tooltip above; if no room, place below
        const aboveY = cy - th - 10;
        const ty = aboveY >= 4 ? aboveY : Math.min(cy + 10, h - th - 4);
        return (
          <g key="tooltip" pointerEvents="none">
            <rect x={tx} y={ty} width={tw} height={th} rx={6} ry={6} fill="#171c24" stroke="#263044" />
            <text x={tx + tw / 2} y={ty + th / 2 + 5} textAnchor="middle" fontSize="16" fill="#e7ecf3">
              {label}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
