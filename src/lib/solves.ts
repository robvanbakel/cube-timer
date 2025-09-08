export type Solve = { ms: number; at: string };
export type RawSolve = { ms: unknown; at?: unknown };

export function format(ms: number): string {
  if (!Number.isFinite(ms)) return "--:--.--";
  const totalMs = Math.round(ms);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centis = Math.floor((totalMs % 1000) / 10);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const cc = String(centis).padStart(2, "0");
  return `${mm}:${ss}.${cc}`;
}

export function loadSolves(): Solve[] {
  try {
    const raw = localStorage.getItem("rubiks.timer.solves");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      if (typeof parsed[0] === "number") {
        const migrated = parsed
          .filter((x) => Number.isFinite(x) && x >= 0)
          .map((ms) => ({ ms, at: new Date().toISOString() }));
        try {
          localStorage.setItem("rubiks.timer.solves", JSON.stringify(migrated));
        } catch {
          console.error("Could not set rubiks.timer.solves");
        }
        return migrated;
      }
      return parsed
        .map((it: RawSolve) => ({
          ms: Number(it.ms),
          at: typeof it.at === "string" ? it.at : new Date().toISOString(),
        }))
        .filter((it: Solve) => Number.isFinite(it.ms) && it.ms >= 0);
    }
    return [];
  } catch (e) {
    console.warn("Failed to load solves", e);
    return [];
  }
}

export function saveSolves(solves: Solve[]) {
  try {
    localStorage.setItem("rubiks.timer.solves", JSON.stringify(solves));
  } catch (e) {
    console.warn("Failed to save solves", e);
  }
}

export function average(arr: number[]): number {
  if (!arr.length) return NaN;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function trimmedAverage(arr: number[], trim = 1): number {
  if (arr.length < trim * 2 + 1) return NaN;
  const sorted = [...arr].sort((a, b) => a - b);
  const sliced = sorted.slice(trim, sorted.length - trim);
  return average(sliced);
}
