import { findGame } from "./registry";
import { Whoops } from "./Whoops";
import "./Game.css";

type Props = {
  path: string;
};

export function GameView({ path }: Props) {
  const id = path.slice("game:".length);
  const game = findGame(id);
  const Game = game?.component;
  return (
    <div className="game-view">{Game ? <Game /> : <Whoops requested={id} />}</div>
  );
}
