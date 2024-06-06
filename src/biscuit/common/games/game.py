import tkinter as tk

from src.biscuit.common.ui import Frame

from .gamebase import BaseGame
from .gameoflife import GameOfLife
from .minesweeper import Minesweeper
from .pong import Pong
from .ttt import TicTacToe
from .whoops import Whoops

games = {i.name: i for i in (GameOfLife, Pong, TicTacToe, Minesweeper)}


def get_games(base) -> list:
    """For palette to generate action sets of games"""

    return [(f"Play {i}", lambda _, i=i: base.open_game(i)) for i in games.keys()]


def get_game(name) -> str:
    """returns the game class from the name

    Args:
        name (str): name of the game
    """

    return games.get(name, Whoops)


def register_game(game) -> None:
    """Registers a game to the games dict

    Args:
        game (BaseGame): game to be registered
    """

    try:
        games[game.name] = game
    except AttributeError:
        games[f"Game {len(games) + 1}"] = game


class Game(Frame):
    """Responsible for picking the right game to display and displaying it"""

    def __init__(self, master, name, *args, **kwargs) -> None:
        """Initializes the game frame

        Args:
            master (tk.Tk): master window
            name (str): name of the game"""

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
        """Focuses on the game"""

        self.content.focus_get()
