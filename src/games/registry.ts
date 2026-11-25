import type { ComponentType } from "react";
import { GameOfLife } from "./GameOfLife";
import { Minesweeper } from "./Minesweeper";
import { Pong } from "./Pong";
import { TicTacToe } from "./TicTacToe";

export type GameDefinition = {
  id: string;
  title: string;
  component: ComponentType;
};

export const GAMES: GameDefinition[] = [
  { id: "tictactoe", title: "Tic-Tac-Toe", component: TicTacToe },
  { id: "gameoflife", title: "Game of Life", component: GameOfLife },
  { id: "minesweeper", title: "Minesweeper", component: Minesweeper },
  { id: "pong", title: "Pong", component: Pong },
];

export function findGame(id: string): GameDefinition | null {
  return GAMES.find((game) => game.id === id) ?? null;
}
