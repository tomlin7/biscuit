import type { ComponentType } from "react";
import { TicTacToe } from "./TicTacToe";

export type GameDefinition = {
  id: string;
  title: string;
  component: ComponentType;
};

export const GAMES: GameDefinition[] = [
  { id: "tictactoe", title: "Tic-Tac-Toe", component: TicTacToe },
];

export function findGame(id: string): GameDefinition | null {
  return GAMES.find((game) => game.id === id) ?? null;
}
