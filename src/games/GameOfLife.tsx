import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

const COLS = 48;
const ROWS = 30;
const CELL = 14;
const SPEEDS = [
  { label: "Slow", ms: 320 },
  { label: "Normal", ms: 140 },
  { label: "Fast", ms: 50 },
] as const;

type Grid = Uint8Array;

function emptyGrid(): Grid {
  return new Uint8Array(COLS * ROWS);
}

function randomGrid(): Grid {
  const grid = emptyGrid();
  for (let i = 0; i < grid.length; i += 1) grid[i] = Math.random() < 0.28 ? 1 : 0;
  return grid;
}

/** One generation of Conway's rules on a board that wraps at the edges. */
function step(grid: Grid): Grid {
  const next = emptyGrid();
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + COLS) % COLS;
          const ny = (y + dy + ROWS) % ROWS;
          neighbours += grid[ny * COLS + nx];
        }
      }
      const alive = grid[y * COLS + x] === 1;
      next[y * COLS + x] = neighbours === 3 || (alive && neighbours === 2) ? 1 : 0;
    }
  }
  return next;
}

function population(grid: Grid): number {
  let count = 0;
  for (const cell of grid) count += cell;
  return count;
}

export function GameOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid>(randomGrid);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [generation, setGeneration] = useState(0);
  const paintRef = useRef<{ value: 0 | 1 } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const styles = getComputedStyle(canvas);
    const fg = styles.getPropertyValue("--fg").trim() || "#e6e6e6";
    const line = styles.getPropertyValue("--border-subtle").trim() || "rgba(128,128,128,0.15)";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x += 1) {
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(COLS * CELL, y * CELL + 0.5);
    }
    ctx.stroke();
    ctx.fillStyle = fg;
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (grid[y * COLS + x]) ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 3, CELL - 3);
      }
    }
  }, [grid]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setGrid((current) => step(current));
      setGeneration((g) => g + 1);
    }, SPEEDS[speed].ms);
    return () => window.clearInterval(id);
  }, [running, speed]);

  const cellAt = (event: PointerEvent<HTMLCanvasElement>): number | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * COLS);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return y * COLS + x;
  };

  const paint = useCallback((index: number, value: 0 | 1) => {
    setGrid((current) => {
      if (current[index] === value) return current;
      const next = current.slice();
      next[index] = value;
      return next;
    });
  }, []);

  const count = population(grid);

  return (
    <>
      <div className="game__header">
        <p className="game__title">Game of Life</p>
        <p className="game__status">
          Generation {generation} · {count} alive · click or drag to draw cells
        </p>
      </div>
      <canvas
        ref={canvasRef}
        className="life__canvas"
        width={COLS * CELL}
        height={ROWS * CELL}
        onPointerDown={(event) => {
          const index = cellAt(event);
          if (index == null) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          const value = grid[index] ? 0 : 1;
          paintRef.current = { value };
          paint(index, value);
        }}
        onPointerMove={(event) => {
          if (!paintRef.current) return;
          const index = cellAt(event);
          if (index != null) paint(index, paintRef.current.value);
        }}
        onPointerUp={() => {
          paintRef.current = null;
        }}
        onPointerCancel={() => {
          paintRef.current = null;
        }}
      />
      <div className="game__controls">
        <button
          type="button"
          className={running ? "game__button game__button--active" : "game__button"}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="game__button"
          disabled={running}
          onClick={() => {
            setGrid((current) => step(current));
            setGeneration((g) => g + 1);
          }}
        >
          Step
        </button>
        <button
          type="button"
          className="game__button"
          onClick={() => {
            setGrid(randomGrid());
            setGeneration(0);
          }}
        >
          Random
        </button>
        <button
          type="button"
          className="game__button"
          onClick={() => {
            setRunning(false);
            setGrid(emptyGrid());
            setGeneration(0);
          }}
        >
          Clear
        </button>
        <span className="game__separator" aria-hidden />
        {SPEEDS.map((option, index) => (
          <button
            key={option.label}
            type="button"
            className={speed === index ? "game__button game__button--active" : "game__button"}
            onClick={() => setSpeed(index)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}
