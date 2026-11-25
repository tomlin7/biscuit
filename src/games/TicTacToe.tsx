import { useCallback, useState } from "react";
import { Circle, X } from "lucide-react";

type Mark = "X" | "O" | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function winningLine(board: Mark[]): readonly number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return line;
  }
  return null;
}

function completingMove(board: Mark[], mark: "X" | "O"): number | null {
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue;
    const next = [...board];
    next[i] = mark;
    if (winningLine(next)) return i;
  }
  return null;
}

/** Win if possible, block the player if needed, otherwise play a random free cell. */
function computerMove(board: Mark[]): number | null {
  const win = completingMove(board, "O");
  if (win != null) return win;
  const block = completingMove(board, "X");
  if (block != null) return block;
  const free = board.flatMap((cell, i) => (cell ? [] : [i]));
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

const EMPTY: Mark[] = Array(9).fill(null);

export function TicTacToe() {
  const [board, setBoard] = useState<Mark[]>(EMPTY);
  const [score, setScore] = useState({ you: 0, computer: 0, draws: 0 });

  const line = winningLine(board);
  const winner = line ? board[line[0]] : null;
  const full = board.every(Boolean);
  const over = winner !== null || full;

  const status = winner === "X"
    ? "You win!"
    : winner === "O"
      ? "The computer wins."
      : full
        ? "It's a draw."
        : "Your move — you are X.";

  const play = useCallback(
    (index: number) => {
      if (over || board[index]) return;
      const next = [...board];
      next[index] = "X";
      if (!winningLine(next)) {
        const reply = computerMove(next);
        if (reply != null) next[reply] = "O";
      }
      const nextLine = winningLine(next);
      const nextWinner = nextLine ? next[nextLine[0]] : null;
      if (nextWinner === "X") setScore((s) => ({ ...s, you: s.you + 1 }));
      else if (nextWinner === "O") setScore((s) => ({ ...s, computer: s.computer + 1 }));
      else if (next.every(Boolean)) setScore((s) => ({ ...s, draws: s.draws + 1 }));
      setBoard(next);
    },
    [board, over],
  );

  return (
    <>
      <div className="game__header">
        <p className="game__title">Tic-Tac-Toe</p>
        <p className="game__status" aria-live="polite">
          {status}
        </p>
      </div>
      <div className="ttt__board" role="grid" aria-label="Tic-Tac-Toe board">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            className={[
              "ttt__cell",
              cell === "O" ? "ttt__cell--o" : "",
              line?.includes(index) ? "ttt__cell--win" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={cell ? `Cell ${index + 1}: ${cell}` : `Cell ${index + 1}: empty`}
            disabled={over || cell !== null}
            onClick={() => play(index)}
          >
            {cell === "X" ? <X size={44} strokeWidth={2.4} /> : null}
            {cell === "O" ? <Circle size={36} strokeWidth={2.4} /> : null}
          </button>
        ))}
      </div>
      <div className="game__score">
        <span>
          You <strong>{score.you}</strong>
        </span>
        <span>
          Computer <strong>{score.computer}</strong>
        </span>
        <span>
          Draws <strong>{score.draws}</strong>
        </span>
      </div>
      <div className="game__controls">
        <button type="button" className="game__button" onClick={() => setBoard(EMPTY)}>
          {over ? "Play again" : "Restart"}
        </button>
      </div>
    </>
  );
}
