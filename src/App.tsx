import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  average,
  format,
  loadSolves,
  saveSolves,
  trimmedAverage,
  type RawSolve,
  type Solve,
} from "./lib/solves";
import { SolveChart } from "./components/SolveChart";
import { StatsPanel, type Stats } from "./components/StatsPanel";
import { SolvesList } from "./components/SolvesList";

export default function App() {
  const [solves, setSolves] = useState<Solve[]>(() => loadSolves());
  const [running, setRunning] = useState<boolean>(false);
  const [armed, setArmed] = useState<boolean>(false);
  const [displayMs, setDisplayMs] = useState<number>(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const spaceDownRef = useRef<boolean>(false);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Resizable right column width (md+ only)
  const [rightWidth, setRightWidth] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("rubiks.timer.rightWidth"));
      if (Number.isFinite(v) && v >= 200 && v <= 800) return v;
    } catch {
      console.error('Could not get right column width');
    }
    return 320;
  });
  useEffect(() => {
    try {
      localStorage.setItem("rubiks.timer.rightWidth", String(rightWidth));
    } catch {
      console.error('Could not set rubiks.timer.rightWidth')
    }
  }, [rightWidth]);

  // Track when the layout is md+ so we only apply 2-column behavior then
  const [isMd, setIsMd] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const start = useCallback(() => {
    if (running) return;
    setRunning(true);
    startRef.current = performance.now();
  }, [running]);

  const stop = useCallback((addEntry: boolean = true) => {
    if (!running) return;
    setRunning(false);
    cancelAnimationFrame(rafRef.current);
    const elapsed = performance.now() - startRef.current;
    setDisplayMs(elapsed);
    if (addEntry) {
      const entry = {
        ms: Math.max(0, Math.round(elapsed)),
        at: new Date().toISOString(),
      };
      setSolves((prev) => [entry, ...prev]);
    }
  }, [running]);

  // persist solves
  useEffect(() => {
    saveSolves(solves);
  }, [solves]);

  // timer loop
  useEffect(() => {
    if (!running) return;
    const loop = () => {
      const t = performance.now() - startRef.current;
      setDisplayMs(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // keyboard controls + prevent page scroll on Space
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return (
        (el as HTMLElement).isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select"
      );
    };

    // Capture-phase preventDefault to block scroll/click defaults for Space
    const preventSpaceDefault = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isEditableTarget(e.target)) {
        e.preventDefault();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (spaceDownRef.current) return;
      spaceDownRef.current = true;
      if (running) {
        e.preventDefault();
        stop(true);
      } else {
        e.preventDefault();
        setArmed(true);
        setDisplayMs(0);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (armed && !running) start();
      setArmed(false);
      spaceDownRef.current = false;
    };
    window.addEventListener("keydown", preventSpaceDefault, true);
    window.addEventListener("keyup", preventSpaceDefault, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", preventSpaceDefault, true);
      window.removeEventListener("keyup", preventSpaceDefault, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [armed, running, start, stop]);

  // Column resize interactions (md+)
  const onResizeStart = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMd) return;
    e.preventDefault();
    const gap = 24; // gap-6
    const handlePointerMove = (ev: PointerEvent) => {
      const rect = mainRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minLeft = 300; // keep timer area readable
      const minRight = 200;
      const maxRight = Math.max(minRight, rect.width - minLeft - gap);
      const proposed = rect.right - ev.clientX - gap / 2;
      const next = Math.min(Math.max(proposed, minRight), maxRight);
      setRightWidth(Math.round(next));
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.classList.remove("cursor-col-resize");
    };
    document.body.classList.add("cursor-col-resize");
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, [isMd]);

  

  function clearAll() {
    if (!solves.length) return;
    const ok = confirm("Delete all solves? This cannot be undone.");
    if (!ok) return;
    if (running) stop(false);
    setArmed(false);
    setSolves([]);
    setDisplayMs(0);
  }

  function removeSolve(idx: number) {
    const s = solves[idx];
    const ok = confirm(`Delete solve ${format(s?.ms)}?`);
    if (!ok) return;
    setSolves((prev) => prev.filter((_, i) => i !== idx));
  }

  function exportSolves() {
    const payload = {
      name: "rubiks-timer",
      version: 1,
      exportedAt: new Date().toISOString(),
      solves,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rubiks-solves.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importSolves(file: File | undefined) {
    if (!file) return;
    file
      .text()
      .then((text) => {
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.solves))
          throw new Error("Invalid file");
        type ImportItem = number | RawSolve;
        const normalize = (arr: ImportItem[]): Solve[] =>
          arr
            .map((it) =>
              typeof it === "number"
                ? { ms: it, at: new Date().toISOString() }
                : {
                    ms: Number(it.ms),
                    at:
                      typeof it.at === "string"
                        ? it.at
                        : new Date().toISOString(),
                  }
            )
            .filter((it: Solve) => Number.isFinite(it.ms) && it.ms >= 0);
        const imported = normalize(data.solves);
        const merged = [...imported, ...solves];
        const capped = merged.slice(0, 5000);
        setSolves(capped);
        alert(`Imported ${data.solves.length} solves.`);
      })
      .catch((err) =>
        alert("Import failed: " + (err?.message || "Unknown error"))
      );
  }

  const stats: Stats = useMemo(() => {
    const count = solves.length;
    const msArr = solves.map((s) => s.ms);
    const best = Math.min(...(count ? msArr : [NaN]));
    const mean = average(msArr);
    const last5 = msArr.slice(0, 5);
    const last12 = msArr.slice(0, 12);
    const ao5 = average(last5);
    const ao12 = average(last12);
    const wca5 = trimmedAverage(last5, 1);
    const wca12 = trimmedAverage(last12, 1);
    return {
      count,
      best,
      mean,
      ao5,
      ao12,
      wca5,
      wca12,
    };
  }, [solves]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-bg-elev">
        <h1 className="text-lg font-semibold">Rubik's Cube Timer</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={clearAll}
            className="px-3 py-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            Clear All
          </button>
          <button
            onClick={exportSolves}
            className="px-3 py-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700"
          >
            Export
          </button>
          <label className="px-3 py-2 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer">
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => importSolves(e.target.files?.[0])}
            />
            Import
          </label>
        </div>
      </header>

      <main
        ref={mainRef}
        className="grid md:grid-cols-[minmax(0,1fr)_320px] md:grid-rows-[auto_1fr] gap-6 p-6 flex-1 min-h-0 min-w-0 relative"
        style={isMd ? { gridTemplateColumns: `minmax(0,1fr) ${rightWidth}px` } : undefined}
      >
        <section className="grid gap-4 items-center justify-items-center bg-gradient-to-b from-[rgba(79,140,255,0.06)] to-[rgba(45,212,191,0.04)] border border-slate-800 rounded-2xl p-6 min-w-0">
          <div
            className={`font-mono tabular-nums text-[clamp(40px,12vw,120px)] tracking-wider ${
              armed ? "text-accent-2" : ""
            }`}
          >
            {format(displayMs)}
          </div>
          <div className="flex gap-3">
            {running ? (
              <button
                onClick={() => stop(true)}
                className="px-4 py-2 rounded bg-accent text-slate-900 font-semibold"
              >
                Stop (Space)
              </button>
            ) : (
              <button
                onClick={() => start()}
                className="px-4 py-2 rounded bg-accent text-slate-900 font-semibold"
              >
                Start (Space)
              </button>
            )}
          </div>
          <p className="text-muted m-0 text-center">
            Hold Space, release to start. Press Space to stop. Click a time to
            delete.
          </p>
        </section>

        <StatsPanel stats={stats} />

        <SolvesList
          solves={solves}
          hoverIndex={hoverIndex}
          setHoverIndex={setHoverIndex}
          removeSolve={removeSolve}
        />

        <section className="bg-bg-elev border border-slate-800 rounded-2xl p-4 md:col-start-1 md:row-start-2 flex flex-col h-full min-h-0 min-w-0">
          <div className="grow min-h-0">
            <SolveChart solves={solves} hoverIndex={hoverIndex} onHoverIndex={setHoverIndex} />
          </div>
        </section>

        {/* Resize handle (md+ only) */}
        {isMd && (
          <div
            className="md:block absolute inset-y-0 w-6 cursor-col-resize select-none touch-none z-10 group"
            style={{
              left: `calc(100% - ${rightWidth}px - 48px)`,
            }}
            onPointerDown={onResizeStart}
            aria-label="Resize columns"
            role="separator"
            aria-orientation="vertical"
          >
          </div>
        )}
      </main>

      <footer className="px-4 py-3 text-center text-muted border-t border-slate-800">
        Local-only. Data stored in your browser.
      </footer>
    </div>
  );
}
