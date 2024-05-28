import random
import tkinter as tk
from tkinter import messagebox

from src.biscuit.utils import Button, Frame, IconButton, Label

from .game import BaseGame

# Game constants
BOARD_SIZE = 10
NUM_MINES = 10

class Tile(IconButton):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.config(font=("Segoi UI", 13), width=2, bg=self.base.theme.biscuit, fg="white", activebackground=self.base.theme.biscuit_dark)

    def reveal_count(self, count) -> None:
        self.config(font=("Segoi UI", 13), text=count)
        bg=self.base.theme.editors.background
        self.config(bg=bg, activebackground=bg)

    def reveal_icon(self, icon, **kw) -> None:
        self.config(font=("codicon", 13), **kw)
        self.set_icon(icon)

    def clear(self) -> None:
        self.config(fg=self.base.theme.editors.background)

class Minesweeper(BaseGame):
    name = "Minesweeper!"

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)

        self.container = Frame(self, bg=self.base.theme.border, padx=1, pady=1)
        self.container.pack(pady=100)

        self.gameover_frame = Frame(self, **self.base.theme.editors, pady=50)
        Label(self.gameover_frame, text="Game Over", font=("Fixedsys", 20), fg=self.base.theme.biscuit, **self.base.theme.editors).pack()
        restart = Button(self.gameover_frame, "Retry!", self.reload)
        restart.config(font=("Fixedsys", 20))
        restart.pack(pady=20)

        self.start_game()

    def reload(self, *_):
        self.gameover_frame.pack_forget()
        self.container.pack(pady=100)
        self.start_game()

    def start_game(self):
        self.mine_positions = []
        self.board = [[0]*BOARD_SIZE for _ in range(BOARD_SIZE)]
        self.buttons = [[None]*BOARD_SIZE for _ in range(BOARD_SIZE)]

        self.generate_mines()
        self.create_tiles()

    def generate_mines(self):
        self.mine_positions = random.sample(range(BOARD_SIZE * BOARD_SIZE), NUM_MINES)

        for position in self.mine_positions:
            row = position // BOARD_SIZE
            col = position % BOARD_SIZE
            self.board[row][col] = -1

    def create_tiles(self):
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                button = Tile(self.container, "", width=2, height=1)
                button.grid(row=row, column=col, padx=(0, 1), pady=(0, 1), sticky=tk.NSEW)
                button.bind("<Button-1>", lambda e, r=row, c=col: self.button_click(e, r, c))
                button.bind("<Button-3>", lambda e, r=row, c=col: self.button_click(e, r, c))
                self.buttons[row][col] = button

    def button_click(self, event, row, col):
        # Handle left-click
        if event.num == 1:
            if self.board[row][col] == -1:
                self.buttons[row][col].reveal_icon("twitter", bg="red")
                self.game_over()
            else:
                count = self.count_adjacent_mines(row, col)
                self.buttons[row][col].reveal_count(count)
                self.buttons[row][col].unbind("<Button-1>")
                if count == 0:
                    self.buttons[row][col].clear()
                    self.reveal_empty_cells(row, col)
        # Handle right-click
        elif event.num == 3:
            # Check if the button is already flagged
            if self.buttons[row][col]["text"] == "pinned":
                # Remove the flag
                self.buttons[row][col].config(text="")
                self.buttons[row][col].bind("<Button-1>", lambda e, r=row, c=col: self.button_click(e, r, c))
            else:
                # Flag the button
                self.buttons[row][col].reveal_icon("pinned")
                self.buttons[row][col].unbind("<Button-1>")

    def count_adjacent_mines(self, row, col):
        count = 0
        for i in range(max(0, row-1), min(row+2, BOARD_SIZE)):
            for j in range(max(0, col-1), min(col+2, BOARD_SIZE)):
                if self.board[i][j] == -1:
                    count += 1
        return count

    def reveal_empty_cells(self, row, col):
        for i in range(max(0, row-1), min(row+2, BOARD_SIZE)):
            for j in range(max(0, col-1), min(col+2, BOARD_SIZE)):
                if self.buttons[i][j]["text"] == "" and self.board[i][j] != -1:
                    count = self.count_adjacent_mines(i, j)
                    self.buttons[i][j].reveal_count(count)
                    self.buttons[i][j].unbind("<Button-1>")
                    if count == 0:
                        self.buttons[i][j].clear()
                        self.reveal_empty_cells(i, j)

    def game_over(self):
        for position in self.mine_positions:
            row = position // BOARD_SIZE
            col = position % BOARD_SIZE
            if self.buttons[row][col]["text"] != "twitter":
                self.buttons[row][col].reveal_icon("twitter")
                self.buttons[row][col].unbind("<Button-1>")

        self.container.pack_forget()
        self.gameover_frame.pack(pady=100)
