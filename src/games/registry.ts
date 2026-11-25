import type { ComponentType } from "react";
import { GameOfLife } from "./GameOfLife";
import { TicTacToe } from "./TicTacToe";

export type GameDefinition = {
  id: string;
  title: string;
  component: ComponentType;
};

export const GAMES: GameDefinition[] = [
  { id: "tictactoe", title: "Tic-Tac-Toe", component: TicTacToe },
  { id: "gameoflife", title: "Game of Life", component: GameOfLife },
];

export function findGame(id: string): GameDefinition | null {
  return GAMES.find((game) => game.id === id) ?? null;
}
