import tkinter as tk

from biscuit.common.ui import Frame

from .gamebase import BaseGame
from .gameoflife import GameOfLife
from .minesweeper import Minesweeper
from .pong import Pong
from .ttt import TicTacToe
from .whoops import Whoops


class GameManager:
    def __init__(self, base) -> None:
        self.base = base

        self.games = {i.name: i for i in (GameOfLife, Pong, TicTacToe, Minesweeper)}

    def get_games(self) -> list:
        """For palette to generate action sets of games"""

        return [
            (f"Play {i}", lambda _, i=i: self.base.open_game(i))
            for i in self.games.keys()
        ]

    def get_game(self, name) -> str:
        """returns the game class from the name

        Args:
            name (str): name of the game
        """

        return self.games.get(name, Whoops)

    def register_new_game(self, game: BaseGame) -> None:
        """Registers a game to the games dict

        Args:
            game (BaseGame): game to be registered
        """

        try:
            self.games[game.name] = game
        except AttributeError:
            self.games[f"Game {len(self.games) + 1}"] = game


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

        self.content = self.base.game_manager.get_game(name=name)(self)
        self.content.grid(row=0, column=0, sticky=tk.NSEW)

    def focus(self) -> None:
        """Focuses on the game"""

        self.content.focus_get()
