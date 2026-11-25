import { Gamepad2 } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { findGame } from "./registry";
import "./Game.css";

type Props = {
  path: string;
};

export function GameView({ path }: Props) {
  const game = findGame(path.slice("game:".length));
  if (!game) {
    return <EmptyState icon={Gamepad2} title="Unknown game" />;
  }
  const Game = game.component;
  return (
    <div className="game-view">
      <Game />
    </div>
  );
}
