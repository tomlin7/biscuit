import tkinter as tk
import random
from tkinter import messagebox
# Game constants
BOARD_SIZE = 10
NUM_MINES = 10

class Minesweeper:
    def __init__(self, root):
        self.root = root
        self.root.title("Minesweeper")
        
        self.board = [[0 for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        self.mine_positions = []
        self.buttons = [[None for _ in range(BOARD_SIZE)] for _ in range(BOARD_SIZE)]
        
        self.generate_mines()
        self.create_buttons()
        
    def generate_mines(self):
        self.mine_positions = random.sample(range(BOARD_SIZE * BOARD_SIZE), NUM_MINES)
        
        for position in self.mine_positions:
            row = position // BOARD_SIZE
            col = position % BOARD_SIZE
            self.board[row][col] = -1
        
    def create_buttons(self):
        for row in range(BOARD_SIZE):
            for col in range(BOARD_SIZE):
                button = tk.Button(self.root, width=2, height=1)
                button.grid(row=row, column=col)
                button.bind("<Button-1>", lambda e, r=row, c=col: self.button_click(e, r, c))
                self.buttons[row][col] = button
                
    def button_click(self, event, row, col):
        if self.board[row][col] == -1:
            self.buttons[row][col].config(text="*", bg="red")
            self.game_over()
        else:
            count = self.count_adjacent_mines(row, col)
            self.buttons[row][col].config(text=count, relief=tk.SUNKEN)
            self.buttons[row][col].unbind("<Button-1>")
            if count == 0:
                self.reveal_empty_cells(row, col)
                
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
                    self.buttons[i][j].config(text=count, relief=tk.SUNKEN)
                    self.buttons[i][j].unbind("<Button-1>")
                    if count == 0:
                        self.reveal_empty_cells(i, j)
                        
    def game_over(self):
        for position in self.mine_positions:
            row = position // BOARD_SIZE
            col = position % BOARD_SIZE
            if self.buttons[row][col]["text"] != "*":
                self.buttons[row][col].config(text="*", relief=tk.SUNKEN)
                self.buttons[row][col].unbind("<Button-1>")
        
        messagebox.showinfo("Game Over", "You hit a mine!")
        self.root.destroy()

# Create the main window
root = tk.Tk()

# Create the Minesweeper game
minesweeper = Minesweeper(root)

# Start the Tkinter event loop
root.mainloop()
