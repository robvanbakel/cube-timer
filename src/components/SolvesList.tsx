import { type Solve, format } from "../lib/solves";
import type { Dispatch, SetStateAction } from "react";

export function SolvesList({
  solves,
  hoverIndex,
  setHoverIndex,
  removeSolve,
}: {
  solves: Solve[];
  hoverIndex: number | null;
  setHoverIndex: Dispatch<SetStateAction<number | null>>;
  removeSolve: (idx: number) => void;
}) {
  return (
    <section className="bg-bg-elev border max-md:order-last border-slate-800 rounded-2xl p-4 md:col-start-2 md:row-start-2 flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <h2 className="mt-1 mb-3 text-base text-muted">Solves</h2>
      <ol className="m-0 p-0 list-none min-h-0 overflow-auto grow" style={{ scrollbarGutter: "stable" }}>
        {solves.map((s, i) => {
          const n = solves.length - i;
          const dateStr = s.at ? new Date(s.at).toLocaleString() : "";
          return (
            <li
              key={i}
              className={`py-1 cursor-pointer flex justify-between items-baseline gap-2 ${
                hoverIndex === i ? "text-accent" : "hover:text-accent-2"
              }`}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex((prev) => (prev === i ? null : prev))}
              onClick={() => removeSolve(i)}
              title="Click to delete"
            >
              <span className="inline-flex items-baseline gap-2 shrink-0">
                <span className="text-muted">#{n}</span>
                <span className="font-mono tabular-nums w-[8ch] text-right">{format(s.ms)}</span>
              </span>
              {dateStr && (
                <span className="text-muted text-xs flex-1 min-w-0 truncate">{dateStr}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
