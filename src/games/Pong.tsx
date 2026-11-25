import { useEffect, useRef, useState } from "react";

const WIDTH = 640;
const HEIGHT = 400;
const PADDLE_W = 10;
const PADDLE_H = 70;
const BALL = 10;
const PLAYER_SPEED = 360;
const CPU_SPEED = 250;
const WIN_SCORE = 7;

type State = {
  player: number;
  cpu: number;
  ballX: number;
  ballY: number;
  velX: number;
  velY: number;
};

function serve(direction: 1 | -1): State {
  const angle = (Math.random() * 0.8 - 0.4) * Math.PI * 0.5;
  const speed = 280;
  return {
    player: HEIGHT / 2 - PADDLE_H / 2,
    cpu: HEIGHT / 2 - PADDLE_H / 2,
    ballX: WIDTH / 2 - BALL / 2,
    ballY: HEIGHT / 2 - BALL / 2,
    velX: Math.cos(angle) * speed * direction,
    velY: Math.sin(angle) * speed,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State>(serve(1));
  const keysRef = useRef({ up: false, down: false });
  const pointerRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState({ you: 0, cpu: 0 });
  const winner = score.you >= WIN_SCORE ? "you" : score.cpu >= WIN_SCORE ? "cpu" : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const styles = getComputedStyle(canvas);
    const fg = styles.getPropertyValue("--fg").trim() || "#e6e6e6";
    const muted = styles.getPropertyValue("--fg-dim").trim() || "rgba(128,128,128,0.4)";

    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = muted;
      for (let y = 8; y < HEIGHT; y += 24) ctx.fillRect(WIDTH / 2 - 1, y, 2, 12);
      ctx.fillStyle = fg;
      ctx.fillRect(16, s.player, PADDLE_W, PADDLE_H);
      ctx.fillRect(WIDTH - 16 - PADDLE_W, s.cpu, PADDLE_W, PADDLE_H);
      ctx.fillRect(s.ballX, s.ballY, BALL, BALL);
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
      const s = stateRef.current;

      if (pointerRef.current != null) {
        s.player = clamp(pointerRef.current - PADDLE_H / 2, 0, HEIGHT - PADDLE_H);
      } else {
        const dir = (keysRef.current.down ? 1 : 0) - (keysRef.current.up ? 1 : 0);
        s.player = clamp(s.player + dir * PLAYER_SPEED * dt, 0, HEIGHT - PADDLE_H);
      }
      const cpuTarget = s.ballY + BALL / 2 - PADDLE_H / 2;
      const cpuStep = clamp(cpuTarget - s.cpu, -CPU_SPEED * dt, CPU_SPEED * dt);
      s.cpu = clamp(s.cpu + cpuStep, 0, HEIGHT - PADDLE_H);

      s.ballX += s.velX * dt;
      s.ballY += s.velY * dt;
      if (s.ballY <= 0 || s.ballY >= HEIGHT - BALL) {
        s.velY = -s.velY;
        s.ballY = clamp(s.ballY, 0, HEIGHT - BALL);
      }

      const hit = (paddleY: number) => {
        const offset = (s.ballY + BALL / 2 - (paddleY + PADDLE_H / 2)) / (PADDLE_H / 2);
        const speed = Math.min(640, Math.hypot(s.velX, s.velY) * 1.06);
        const angle = clamp(offset, -1, 1) * (Math.PI / 3.2);
        return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
      };
      if (
        s.velX < 0 &&
        s.ballX <= 16 + PADDLE_W &&
        s.ballX >= 16 - BALL &&
        s.ballY + BALL >= s.player &&
        s.ballY <= s.player + PADDLE_H
      ) {
        const v = hit(s.player);
        s.velX = v.x;
        s.velY = v.y;
        s.ballX = 16 + PADDLE_W;
      }
      if (
        s.velX > 0 &&
        s.ballX + BALL >= WIDTH - 16 - PADDLE_W &&
        s.ballX <= WIDTH - 16 &&
        s.ballY + BALL >= s.cpu &&
        s.ballY <= s.cpu + PADDLE_H
      ) {
        const v = hit(s.cpu);
        s.velX = -v.x;
        s.velY = v.y;
        s.ballX = WIDTH - 16 - PADDLE_W - BALL;
      }

      if (s.ballX < -BALL) {
        setScore((prev) => ({ ...prev, cpu: prev.cpu + 1 }));
        stateRef.current = { ...serve(1), player: s.player, cpu: s.cpu };
      } else if (s.ballX > WIDTH) {
        setScore((prev) => ({ ...prev, you: prev.you + 1 }));
        stateRef.current = { ...serve(-1), player: s.player, cpu: s.cpu };
      }

      draw();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (winner) setRunning(false);
  }, [winner]);

  useEffect(() => {
    const pause = () => {
      keysRef.current = { up: false, down: false };
      setRunning(false);
    };
    const onVisibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const start = () => {
    if (winner) {
      setScore({ you: 0, cpu: 0 });
      stateRef.current = serve(1);
    }
    setRunning(true);
    canvasRef.current?.focus();
  };

  const setKey = (key: string, pressed: boolean): boolean => {
    const k = key.toLowerCase();
    if (k === "w" || k === "arrowup") keysRef.current.up = pressed;
    else if (k === "s" || k === "arrowdown") keysRef.current.down = pressed;
    else return false;
    pointerRef.current = null;
    return true;
  };

  const status = winner === "you"
    ? "You win!"
    : winner === "cpu"
      ? "The computer wins."
      : running
        ? "W/S, arrow keys, or the mouse move your paddle"
        : "Paused";

  return (
    <>
      <div className="game__header">
        <p className="game__title">Pong</p>
        <p className="game__status" aria-live="polite">
          {status}
        </p>
      </div>
      <div className="game__score">
        <span>
          You <strong>{score.you}</strong>
        </span>
        <span>
          Computer <strong>{score.cpu}</strong>
        </span>
        <span>First to {WIN_SCORE}</span>
      </div>
      <div className="pong__stage">
        <canvas
          ref={canvasRef}
          className="pong__canvas"
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="Pong court"
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Escape") {
              event.preventDefault();
              if (running) setRunning(false);
              else start();
              return;
            }
            if (setKey(event.key, true)) event.preventDefault();
          }}
          onKeyUp={(event) => {
            setKey(event.key, false);
          }}
          onPointerMove={(event) => {
            if (!running) return;
            const rect = event.currentTarget.getBoundingClientRect();
            pointerRef.current = ((event.clientY - rect.top) / rect.height) * HEIGHT;
          }}
          onBlur={() => {
            keysRef.current = { up: false, down: false };
            setRunning(false);
          }}
        />
        {!running ? (
          <button type="button" className="pong__overlay" onClick={start}>
            <span className="game__button game__button--active">
              {winner ? "Play again" : score.you + score.cpu > 0 ? "Resume" : "Start"}
            </span>
            <span className="pong__hint">Space pauses · the game pauses when it loses focus</span>
          </button>
        ) : null}
      </div>
    </>
  );
}
