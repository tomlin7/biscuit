import { useCallback, useEffect, useState } from "react";
import { Bomb, Flag } from "lucide-react";

const LEVELS = [
  { label: "Beginner", cols: 9, rows: 9, mines: 10 },
  { label: "Intermediate", cols: 16, rows: 16, mines: 40 },
] as const;

type Cell = {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};

type Status = "ready" | "playing" | "won" | "lost";

function blankBoard(cols: number, rows: number): Cell[] {
  return Array.from({ length: cols * rows }, () => ({
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
  }));
}

function neighbours(index: number, cols: number, rows: number): number[] {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
    }
  }
  return out;
}

/** Places mines anywhere except the first clicked cell and its neighbours. */
function seedMines(board: Cell[], safe: number, cols: number, rows: number, mines: number): Cell[] {
  const excluded = new Set([safe, ...neighbours(safe, cols, rows)]);
  const candidates = board.flatMap((_, i) => (excluded.has(i) ? [] : [i]));
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const next = board.map((cell) => ({ ...cell }));
  for (const index of candidates.slice(0, mines)) next[index].mine = true;
  for (let i = 0; i < next.length; i += 1) {
    next[i].adjacent = neighbours(i, cols, rows).filter((n) => next[n].mine).length;
  }
  return next;
}

function reveal(board: Cell[], start: number, cols: number, rows: number): Cell[] {
  const next = board.map((cell) => ({ ...cell }));
  const queue = [start];
  while (queue.length > 0) {
    const index = queue.pop()!;
    const cell = next[index];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.adjacent === 0 && !cell.mine) {
      for (const n of neighbours(index, cols, rows)) {
        if (!next[n].revealed) queue.push(n);
      }
    }
  }
  return next;
}

export function Minesweeper() {
  const [level, setLevel] = useState(0);
  const { cols, rows, mines } = LEVELS[level];
  const [board, setBoard] = useState<Cell[]>(() => blankBoard(cols, rows));
  const [status, setStatus] = useState<Status>("ready");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const restart = useCallback((nextLevel: number) => {
    const { cols: c, rows: r } = LEVELS[nextLevel];
    setLevel(nextLevel);
    setBoard(blankBoard(c, r));
    setStatus("ready");
    setStartedAt(null);
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (status !== "playing" || startedAt == null) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [status, startedAt]);

  const open = (index: number) => {
    if (status === "won" || status === "lost") return;
    let current = board;
    if (status === "ready") {
      current = seedMines(board, index, cols, rows, mines);
      setStatus("playing");
      setStartedAt(Date.now());
    }
    const cell = current[index];
    if (cell.flagged || cell.revealed) return;
    if (cell.mine) {
      setBoard(current.map((c) => (c.mine ? { ...c, revealed: true } : c)));
      setStatus("lost");
      return;
    }
    const next = reveal(current, index, cols, rows);
    setBoard(next);
    if (next.every((c) => c.mine || c.revealed)) {
      setBoard(next.map((c) => (c.mine ? { ...c, flagged: true } : c)));
      setStatus("won");
    }
  };

  const toggleFlag = (index: number) => {
    if (status !== "playing" && status !== "ready") return;
    const cell = board[index];
    if (cell.revealed) return;
    setBoard(board.map((c, i) => (i === index ? { ...c, flagged: !c.flagged } : c)));
  };

  const flags = board.filter((c) => c.flagged).length;
  const message =
    status === "won"
      ? `Cleared in ${elapsed}s!`
      : status === "lost"
        ? "Boom — you hit a mine."
        : `${mines - flags} mines left · ${elapsed}s · right-click to flag`;

  return (
    <>
      <div className="game__header">
        <p className="game__title">Minesweeper</p>
        <p className="game__status" aria-live="polite">
          {message}
        </p>
      </div>
      <div
        className="mines__board"
        style={{ gridTemplateColumns: `repeat(${cols}, 26px)` }}
        role="grid"
        aria-label="Minesweeper board"
        onContextMenu={(event) => event.preventDefault()}
      >
        {board.map((cell, index) => {
          const classes = ["mines__cell"];
          if (cell.revealed) classes.push("mines__cell--open");
          if (cell.revealed && cell.mine) classes.push("mines__cell--mine");
          if (cell.revealed && !cell.mine && cell.adjacent > 0) {
            classes.push(`mines__cell--n${cell.adjacent}`);
          }
          return (
            <button
              key={index}
              type="button"
              className={classes.join(" ")}
              aria-label={
                cell.revealed
                  ? cell.mine
                    ? "Mine"
                    : cell.adjacent > 0
                      ? `${cell.adjacent} adjacent mines`
                      : "Empty"
                  : cell.flagged
                    ? "Flagged"
                    : "Hidden"
              }
              onClick={() => open(index)}
              onContextMenu={(event) => {
                event.preventDefault();
                toggleFlag(index);
              }}
            >
              {cell.revealed && cell.mine ? <Bomb size={14} strokeWidth={2} /> : null}
              {cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : null}
              {!cell.revealed && cell.flagged ? <Flag size={13} strokeWidth={2.2} /> : null}
            </button>
          );
        })}
      </div>
      <div className="game__controls">
        <button type="button" className="game__button" onClick={() => restart(level)}>
          {status === "won" || status === "lost" ? "Play again" : "Restart"}
        </button>
        <span className="game__separator" aria-hidden />
        {LEVELS.map((option, index) => (
          <button
            key={option.label}
            type="button"
            className={level === index ? "game__button game__button--active" : "game__button"}
            onClick={() => restart(index)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
