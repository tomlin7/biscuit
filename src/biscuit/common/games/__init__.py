import tkinter as tk

from src.biscuit.utils import Frame

from .game import BaseGame
from .gameoflife import GameOfLife
from .minesweeper import Minesweeper
from .pong import Pong
from .ttt import TicTacToe
from .whoops import Whoops

games = {i.name:i for i in (GameOfLife, Pong, TicTacToe, Minesweeper)}


def get_games(base) -> list:
    "helper function to generate actionset items"
    return [(f"Play {i}", lambda _, i=i: base.open_game(i)) for i in games.keys()]

def get_game(name) -> str:
    "picks the game for the name"
    return games.get(name, Whoops)

def register_game(game) -> None:
    "registers a game"
    try:
        games[game.name] = game
    except AttributeError:
        games[f"Game {len(games) + 1}"] = game


class Game(Frame):
    """
    Responsible for picking the right game

    name - name of game to opened
    """
    def __init__(self, master, name, *args, **kwargs) -> None:
        super().__init__(master, *args, **kwargs)
        self.config(bg=self.base.theme.border)
        self.filename = name

        self.path = None
        self.exists = False
        self.diff = False
        self.showpath = False

        self.grid_columnconfigure(0, weight=1) 
        self.grid_rowconfigure(0, weight=1)
        self.content = get_game(name=name)(self)     
        self.content.grid(row=0, column=0, sticky=tk.NSEW)

    def focus(self) -> None:
        self.content.focus_get()
