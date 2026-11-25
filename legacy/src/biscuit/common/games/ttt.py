import random
import tkinter as tk

from biscuit.common.ui import Button, Canvas

from .gamebase import BaseGame


class TicTacToe(BaseGame):
    name = "Tic-Tac-Toe"

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, None, None, *args, **kwargs)

        self.player = self.base.theme.biscuit
        self.computer = self.base.theme.border
        self.border = self.base.theme.border

        self.canvas = Canvas(self, width=300, height=300, **self.base.theme.editors)
        self.canvas.pack(pady=100)

        self.start()
        self.canvas.bind("<Button-1>", self.handle_click)

    def start(self, *_):
        self.canvas.delete("all")
        self.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        self.draw_board()

    def draw_board(self):
        self.canvas.delete("all")

        for row in range(1, 3):
            self.canvas.create_line(
                0, row * 100, 300, row * 100, width=2, fill=self.border
            )
        for col in range(1, 3):
            self.canvas.create_line(
                col * 100, 0, col * 100, 300, width=2, fill=self.border
            )

        for row in range(3):
            for col in range(3):
                x = col * 100
                y = row * 100

                if self.board[row][col] == 1:
                    self.canvas.create_line(
                        x + 15, y + 15, x + 85, y + 85, width=10, fill=self.player
                    )
                    self.canvas.create_line(
                        x + 15, y + 85, x + 85, y + 15, width=10, fill=self.player
                    )
                elif self.board[row][col] == 2:
                    self.canvas.create_oval(
                        x + 15, y + 15, x + 85, y + 85, width=10, outline=self.computer
                    )

    def handle_click(self, event: tk.Event):
        row = event.y // 100
        col = event.x // 100

        if self.board[row][col] == 0:
            self.board[row][col] = 1
            self.draw_board()
            self.computer_move()

    def computer_move(self):
        for row in range(3):
            for col in range(3):
                if self.board[row][col] == 0:
                    self.board[row][col] = 2
                    if self.check_winner(2):
                        self.draw_board()
                        self.display_winner(2)
                        return
                    self.board[row][col] = 0

        for row in range(3):
            for col in range(3):
                if self.board[row][col] == 0:
                    self.board[row][col] = 1
                    if self.check_winner(1):
                        self.board[row][col] = 2  # Block the player's winning move
                        self.draw_board()
                        return
                    self.board[row][col] = 0

        # Choose a random move
        available_moves = [
            (row, col)
            for row in range(3)
            for col in range(3)
            if self.board[row][col] == 0
        ]
        if not available_moves:
            return self.display_winner(0)

        row, col = random.choice(available_moves)
        self.board[row][col] = 2
        self.draw_board()

        if not self.check_winner(1) and not any(0 in row for row in self.board):
            self.display_winner(0)

    def check_winner(self, player):
        # Check rows
        for row in range(3):
            if all(self.board[row][col] == player for col in range(3)):
                return True

        # Check columns
        for col in range(3):
            if all(self.board[row][col] == player for row in range(3)):
                return True

        # Check diagonals
        if all(self.board[i][i] == player for i in range(3)) or all(
            self.board[i][2 - i] == player for i in range(3)
        ):
            return True

        return False

    def display_winner(self, winner):
        if not winner:
            message = "It's a tie!"
        else:
            if winner == 1:
                message = "You win!"
            else:
                message = "Torte wins!"

        self.canvas.delete("all")
        self.canvas.create_text(
            150, 125, text=message, font=("Fixedsys", 20), fill=self.player
        )

        restart = Button(self.canvas, "Retry!", self.start)
        restart.config(font=("Fixedsys", 20))
        self.canvas.create_window(150, 175, window=restart)
