import { format } from "../lib/solves";

export type Stats = {
  count: number;
  best: number;
  mean: number;
  ao5: number;
  ao12: number;
  wca5: number;
  wca12: number;
};

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section className="bg-bg-elev border border-slate-800 rounded-2xl p-4 md:col-start-2 md:row-start-1 min-w-0">
      <h2 className="mt-1 mb-3 text-base text-muted">Stats</h2>
      <ul className="grid gap-1">
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">Total</span>
          <span>{stats.count}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">Best</span>
          <span className="text-accent-2 font-medium">{format(stats.best)}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">Mean</span>
          <span>{format(stats.mean)}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">Last 5</span>
          <span>{format(stats.ao5)}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">Last 12</span>
          <span>{format(stats.ao12)}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">WCA ao5</span>
          <span>{format(stats.wca5)}</span>
        </li>
        <li className="flex justify-between border-b border-dashed border-slate-700 py-1">
          <span className="text-muted">WCA ao12</span>
          <span>{format(stats.wca12)}</span>
        </li>
      </ul>
    </section>
  );
}

