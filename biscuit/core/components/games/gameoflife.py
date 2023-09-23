__author__ = "billyeatcookies"

import random
import tkinter as tk

from ..utils import Button
from .game import BaseGame

GRID_WIDTH = 50
GRID_HEIGHT = 50
CELL_SIZE = 20
INITIAL_ALIVE_PROBABILITY = 0.2


class GameOfLife(BaseGame):
    name = "Game of Life"
    
    def __init__(self, master, *args, **kwargs) -> None:
        super().__init__(master, None, None, *args, **kwargs)

        self.start_stop_button = Button(self, text="Start", command=self.toggle_start_stop, padx=20, pady=20, font=("Fixedsys", 15))
        self.canvas = tk.Canvas(self, width=GRID_WIDTH*CELL_SIZE, height=GRID_HEIGHT*CELL_SIZE, 
                                borderwidth=0, highlightthickness=0, **self.base.theme.editors)

        self._grid = [[0] * GRID_WIDTH for _ in range(GRID_HEIGHT)]
        #self.randomize_grid()
        self.draw_gridlines()
        self.is_running = False

        self.start_stop_button.pack()
        self.canvas.pack()

        self.canvas.bind("<B1-Motion>", self.add_cell)
        self.canvas.bind("<Button-1>", self.add_cell)
        self.canvas.bind("<B3-Motion>", self.remove_cell)
        self.canvas.bind("<Button-3>", self.remove_cell)

        self.base.notifications.info("INSTRUCTIONS: Left click to add cells, Right click to remove cells!")

    def randomize_grid(self) -> None:
        for row in range(GRID_HEIGHT):
            for col in range(GRID_WIDTH):
                if random.random() < INITIAL_ALIVE_PROBABILITY:
                    self._grid[row][col] = 1
    
    def draw_gridlines(self) -> None:
        for col in range(GRID_WIDTH + 1):
            x = col * CELL_SIZE
            self.canvas.create_line(x, 0, x, GRID_HEIGHT * CELL_SIZE, fill=self.base.theme.border, tags="grid")
        for row in range(GRID_HEIGHT + 1):
            y = row * CELL_SIZE
            self.canvas.create_line(0, y, GRID_WIDTH * CELL_SIZE, y, fill=self.base.theme.border, tags="grid")


    def toggle_start_stop(self, *_) -> None:
        if self.is_running:
            self.is_running = False
            self.start_stop_button.config(text="Start")
        else:
            self.is_running = True
            self.start_stop_button.config(text="Stop")
            self.update()

    def add_cell(self, event) -> None:
        col = event.x // CELL_SIZE
        row = event.y // CELL_SIZE
        self._grid[row][col] = not self._grid[row][col]
        self.draw_cell(row, col)
    
    def remove_cell(self, event) -> None:
        col = event.x // CELL_SIZE
        row = event.y // CELL_SIZE
        self._grid[row][col] = 0
        self.erase_cell(row, col)

    def update(self) -> None:
        if not self.is_running:
            return

        new_grid = [[0] * GRID_WIDTH for _ in range(GRID_HEIGHT)]

        # rules
        for row in range(GRID_HEIGHT):
            for col in range(GRID_WIDTH):
                alive_neighbors = self.count_alive_neighbors(row, col)

                if self._grid[row][col] == 1:
                    if alive_neighbors < 2 or alive_neighbors > 3:
                        new_grid[row][col] = 0
                    else:
                        new_grid[row][col] = 1
                else:
                    if alive_neighbors == 3:
                        new_grid[row][col] = 1

        self._grid = new_grid
        self.draw_grid()
        self.after(100, self.update)

    def count_alive_neighbors(self, row, col) -> None:
        count = 0
        for i in range(-1, 2):
            for j in range(-1, 2):
                neighbor_row = (row + i + GRID_HEIGHT) % GRID_HEIGHT
                neighbor_col = (col + j + GRID_WIDTH) % GRID_WIDTH
                count += self._grid[neighbor_row][neighbor_col]

        count -= self._grid[row][col]
        return count

    def draw_grid(self) -> None:
        self.canvas.delete("cell")
        for row in range(GRID_HEIGHT):
            for col in range(GRID_WIDTH):
                if self._grid[row][col] == 1:
                    self.draw_cell(row, col)

    def draw_cell(self, row, col) -> None:
        x1 = col * CELL_SIZE
        y1 = row * CELL_SIZE
        x2 = x1 + CELL_SIZE
        y2 = y1 + CELL_SIZE
        self.canvas.create_rectangle(x1, y1, x2, y2, fill=self.base.theme.biscuit, outline="", tags="cell")

    def erase_cell(self, row, col) -> None:
        x1 = col * CELL_SIZE
        y1 = row * CELL_SIZE
        x2 = x1 + CELL_SIZE
        y2 = y1 + CELL_SIZE
        self.canvas.create_rectangle(x1, y1, x2, y2, fill=self.base.theme.editors.background, outline=self.base.theme.border, tags="cell")
