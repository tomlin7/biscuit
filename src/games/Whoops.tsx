import { useEffect, useRef, useState } from "react";

const WIDTH = 640;
const HEIGHT = 240;
const GROUND = 200;
const RUNNER = 26;
const GRAVITY = 1800;
const JUMP = 620;
const SPEED = 260;

type Obstacle = { x: number; w: number; h: number };

type Props = {
  /** The game id that could not be found. */
  requested: string;
};

/** Biscuit's 404 runner: jump the blocks while explaining that the game does not exist. */
export function Whoops({ requested }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const jumpRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const styles = getComputedStyle(canvas);
    const fg = styles.getPropertyValue("--fg").trim() || "#e6e6e6";
    const dim = styles.getPropertyValue("--fg-dim").trim() || "rgba(128,128,128,0.5)";
    const muted = styles.getPropertyValue("--fg-muted").trim() || "#9a9a9a";

    let y = GROUND - RUNNER;
    let vy = 0;
    let obstacles: Obstacle[] = [];
    let distance = 0;

    const draw = () => {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = dim;
      ctx.font = "600 64px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("404", WIDTH / 2, 90);
      ctx.fillRect(0, GROUND, WIDTH, 2);
      ctx.fillStyle = fg;
      ctx.fillRect(60, y, RUNNER, RUNNER);
      ctx.fillStyle = muted;
      for (const o of obstacles) ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
    };

    if (!running) {
      draw();
      return;
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const onGround = y >= GROUND - RUNNER;
      if (jumpRef.current && onGround) vy = -JUMP;
      jumpRef.current = false;
      vy += GRAVITY * dt;
      y = Math.min(GROUND - RUNNER, y + vy * dt);
      if (y >= GROUND - RUNNER) vy = 0;

      const speed = SPEED + distance * 0.02;
      distance += speed * dt;
      obstacles = obstacles
        .map((o) => ({ ...o, x: o.x - speed * dt }))
        .filter((o) => o.x + o.w > 0);
      const lastObstacle = obstacles[obstacles.length - 1];
      if (!lastObstacle || lastObstacle.x < WIDTH - 220 - Math.random() * 260) {
        obstacles.push({ x: WIDTH, w: 14 + Math.random() * 18, h: 22 + Math.random() * 34 });
      }

      const hit = obstacles.some(
        (o) => 60 + RUNNER > o.x && 60 < o.x + o.w && y + RUNNER > GROUND - o.h,
      );
      setScore(Math.floor(distance / 40));
      draw();
      if (hit) {
        setCrashed(true);
        setRunning(false);
        setBest((b) => Math.max(b, Math.floor(distance / 40)));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    const pause = () => setRunning(false);
    window.addEventListener("blur", pause);
    return () => window.removeEventListener("blur", pause);
  }, []);

  const start = () => {
    setCrashed(false);
    setScore(0);
    setRunning(true);
    canvasRef.current?.focus();
  };

  return (
    <>
      <div className="game__header">
        <p className="game__title">Whoops</p>
        <p className="game__status">
          There is no game called “{requested}”. Jump the blocks while you are here.
        </p>
      </div>
      <div className="game__score">
        <span>
          Score <strong>{score}</strong>
        </span>
        <span>
          Best <strong>{best}</strong>
        </span>
      </div>
      <div className="pong__stage">
        <canvas
          ref={canvasRef}
          className="pong__canvas"
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="404 runner"
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
              event.preventDefault();
              if (running) jumpRef.current = true;
              else start();
            }
          }}
          onPointerDown={() => {
            if (running) jumpRef.current = true;
          }}
          onBlur={() => setRunning(false)}
        />
        {!running ? (
          <button type="button" className="pong__overlay" onClick={start}>
            <span className="game__button game__button--active">
              {crashed ? "Try again" : "Start"}
            </span>
            <span className="pong__hint">Space, W, the up arrow, or a click jumps</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
